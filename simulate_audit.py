import json
import random
import time
from datetime import datetime
import argparse
import sys
try:
    import requests
except ImportError:
    requests = None

# --- 1. The "Fake" Data Generator ---
import subprocess
import csv
import io

# --- 1. The Data Generator (Fake or Real) ---
CLOUD_CATALOG = [
    {"provider": "AWS", "instance": "p3.2xlarge", "gpu": "NVIDIA V100", "cost_hourly": 3.06},
    {"provider": "AWS", "instance": "p4d.24xlarge", "gpu": "NVIDIA A100", "cost_hourly": 32.77},
    {"provider": "GCP", "instance": "a2-highgpu-1g", "gpu": "NVIDIA A100", "cost_hourly": 3.67},
    {"provider": "Azure", "instance": "Standard_NC6s_v3", "gpu": "NVIDIA V100", "cost_hourly": 3.12},
]

def get_real_metrics():
    """Captures REAL data from nvidia-smi."""
    history = []
    try:
        # Run nvidia-smi query
        cmd = [
            'nvidia-smi', 
            '--query-gpu=uuid,name,utilization.gpu,memory.used,memory.total', 
            '--format=csv,noheader,nounits'
        ]
        output = subprocess.check_output(cmd).decode('utf-8')
        
        # Parse CSV output
        reader = csv.reader(io.StringIO(output))
        timestamp = time.time()
        
        for row in reader:
             # row = [uuid, name, util, mem_used, mem_total]
             uuid, name, util, mem_used, mem_total = [x.strip() for x in row]
             
             history.append({
                "timestamp": timestamp,
                "gpu": {
                    "uuid": uuid,
                    "name": name,
                    "utilization": int(util),
                    "memory_used": int(mem_used),
                    "memory_total": int(mem_total)
                },
                "meta": {
                    "pod_name": "real-ec2-instance",
                    "namespace": "aws-cloud",
                    # Try to guess cloud provider from metadata (advanced) or default to AWS
                    "cloud": CLOUD_CATALOG[0] # Default to p3.2xlarge pricing for demo
                }
            })
            
    except Exception as e:
        print(f"[!] Error reading nvidia-smi: {e}")
        print("    Are you running this on a machine with NVIDIA GPUs?")
        sys.exit(1)
        
    return history

def get_fake_metrics():
    """Generates 48 hours of fake data for 2 GPUs."""
    history = []
    
    start_time = time.time() - (48 * 3600)
    
    # Assign random cloud instances to our fake nodes
    node1_config = CLOUD_CATALOG[0] # AWS p3.2xlarge
    node2_config = CLOUD_CATALOG[2] # GCP a2-highgpu
    
    for i in range(100): # Create 100 sample points
        timestamp = start_time + (i * 1800) # Every 30 mins
        
        # GPU 1 Data (Idle)
        history.append({
            "timestamp": timestamp,
            "gpu": {
                "uuid": "GPU-1111-FAKE-UUID",
                "name": node1_config["gpu"],
                "utilization": random.randint(0, 5), # 0-5% util
                "memory_used": 1024,
                "memory_total": 16384
            },
            "meta": {
                "pod_name": "jupyter-notebook-0",
                "namespace": "dev-team",
                "cloud": node1_config # Attach cloud context
            }
        })
        
        # GPU 2 Data (Inefficient)
        history.append({
            "timestamp": timestamp,
            "gpu": {
                "uuid": "GPU-2222-FAKE-UUID",
                "name": node2_config["gpu"],
                "utilization": random.randint(20, 35), # 20-35% util (Low Batch)
                "memory_used": 1200,
                "memory_total": 40960
            },
            "meta": {
                "pod_name": "bert-inference-v1-deployment-778899",
                "namespace": "prod",
                "cloud": node2_config # Attach cloud context
            }
        })
        
    return history

# --- 2. The "Brain" (Logic copied from Go) ---
def analyze(history):
    recommendations = []
    
    # Group by GPU
    gpus = {}
    for sample in history:
        uuid = sample['gpu']['uuid']
        if uuid not in gpus: gpus[uuid] = []
        gpus[uuid].append(sample)
        
    for uuid, samples in gpus.items():
        # Rule 1: Check for Idle (Avg util < 10%)
        avg_util = sum(s['gpu']['utilization'] for s in samples) / len(samples)
        
        # Get metadata from the last sample
        meta = samples[-1].get('meta', {})
        
        if avg_util < 10:
            # Calculate REAL savings based on hourly cost * 730 hours/month
            cloud_info = meta.get('cloud', {})
            hourly = cloud_info.get('cost_hourly', 1.0) # Default $1
            monthly_savings = round(hourly * 730)
            
            recommendations.append({
                "severity": "CRITICAL",
                "title": f"Unused {cloud_info.get('provider', 'Cloud')} {cloud_info.get('instance', 'Instance')}",
                "description": f"This {uuid} had {avg_util:.1f}% utilization. You are paying ${hourly}/hr for empty air.",
                "action": "Terminate instance immediately.",
                "savings": f"${monthly_savings}/mo",
                "target": meta
            })
            
        # Rule 2: Check for Low Batch Size (Util 20-40%)
        elif 10 < avg_util < 40:
             recommendations.append({
                "severity": "WARNING",
                "title": f"Inefficient Scaling on {meta.get('cloud', {}).get('provider', '')}",
                "description": f"Utilization is low ({avg_util:.1f}%) but not zero.",
                "action": f"Downscale to a cheaper instance (e.g. T4) to save 50%.",
                "savings": "50% Savings",
                "target": meta 
            })
            
    return recommendations

# --- 3. Run It! ---
def main(args):
    print("--- SHADOW GPU SIMULATOR ---")
    print("1. Waking up fake GPUs...")
    data = get_fake_metrics()
    print(f"2. Collected {len(data)} data points.")

    print("3. analyzing data for waste...")
    recs = analyze(data)

    print("\n--- REPORT generated ---")
    if not recs:
        print("No issues found.")
    else:
        for r in recs:
            print(f"\n[{r['severity']}] {r['title']}")
            print(f"   Why: {r['description']}")
            print(f"   Fix: {r['action']}")
            print(f"   Money Saved: {r['savings']}")
            
    # Write to file
    with open("simualted_report.json", "w") as f:
        json.dump(recs, f, indent=2)
    print("\n(Saved full details to simulated_report.json)")

    # Upload to SaaS
    if args.upload_to:
        if requests is None:
            print("\n[!] Error: 'requests' library not found. Install it with `pip install requests` to upload.")
            return

        print(f"\nUploading to {args.upload_to}...")
        try:
            r = requests.post(args.upload_to, json=recs)
            if r.status_code == 200:
                print(">> Success! Report sent to SaaS Dashboard.")
            else:
                print(f">> Failed: Server returned {r.status_code} - {r.text}")
        except Exception as e:
            print(f">> Upload failed: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--upload-to", help="URL of the Shadow SaaS API (e.g., http://localhost:3000/api/ingest)")
    parser.add_argument("--real", action="store_true", help="Capture REAL metrics from nvidia-smi (Make sure NVIDIA drivers are installed)")
    parser.add_argument("--loop", action="store_true", help="Run continuously (every 5s)")
    args = parser.parse_args()
    
    while True:
        if args.real:
            print(">>> Reading NVIDIA-SMI...")
            data = get_real_metrics()
        else:
            print(">>> Generating FAKE Simulation Data...")
            data = get_fake_metrics()
            
        print(f"    Collected {len(data)} data points.")
        recs = analyze(data)
        
        # Upload
        if args.upload_to:
            try:
                # Wrap single point in array if real mode (since real mode captures 1 snapshot)
                # But analyze expects history.
                # For real mode, we need to accumulate history? 
                # For MVP demo, sending 1 point is fine if backend handles it, but analyze checks avg.
                # Let's just send the 1 snapshot to the backend and let the backend display it.
                # Actually, analyze() handles list.
                
                print(f"    Uploading to {args.upload_to}...")
                requests.post(args.upload_to, json=recs) # Upload recommendations directly
            except Exception as e:
                print(f"    Upload failed: {e}")
        else:
            # Print to console if not uploading
            for r in recs:
                 print(f"    [{r['severity']}] {r['title']} (${r['savings']})")
                 
        if not args.loop:
            break
        time.sleep(5)
