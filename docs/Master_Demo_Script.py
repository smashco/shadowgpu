# --- MASTER DEMO SCRIPT ---
# 1. Runs Real GPU Burn (to prove it's connected)
# 2. Simulates 2 "Ghost" GPUs (to show audit value)
# 3. Reports ALL of them (Optimized + Idle)

!pip install requests
import subprocess, time, json, requests, csv, io, torch

# !!! REPLACE URL !!!
DASHBOARD_URL = "https://YOUR-URL-HERE/api/ingest"

def burn_gpu():
    """Generates EXTREME load on the Real GPU (100% Util)."""
    try:
        size = 8000
        a = torch.randn(size, size).cuda()
        b = torch.randn(size, size).cuda()
        for i in range(50): c = torch.matmul(a, b) # 50x loop
        return True
    except: return False

def get_hybrid_metrics():
    history = []
    timestamp = time.time()
    
    # --- 1. REAL GPU (The Colab T4) ---
    try:
        cmd = ['nvidia-smi', '--query-gpu=uuid,name,utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits']
        output = subprocess.check_output(cmd).decode('utf-8')
        reader = csv.reader(io.StringIO(output))
        for row in reader:
            uuid, name, util, mem, total = [x.strip() for x in row]
            history.append({
                "timestamp": timestamp,
                "gpu": {"uuid": uuid, "name": name + " (REAL)", "utilization": int(util), "memory_used": int(mem), "memory_total": int(total)},
                "meta": {"pod_name": "production-model", "cloud": {"provider": "GCP", "instance": "T4 Instance", "cost_hourly": 0.35}}
            })
    except: pass
    
    # --- 2. GHOST GPU 1 (The Waste) ---
    history.append({
        "timestamp": timestamp,
        "gpu": {"uuid": "GPU-GHOST-001", "name": "Tesla T4 (GHOST)", "utilization": 0, "memory_used": 100, "memory_total": 15000},
        "meta": {"pod_name": "abandoned-notebook", "cloud": {"provider": "GCP", "instance": "n1-standard-4", "cost_hourly": 0.35}}
    })

    # --- 3. GHOST GPU 2 (The Waste) ---
    history.append({
        "timestamp": timestamp,
        "gpu": {"uuid": "GPU-GHOST-002", "name": "Tesla T4 (GHOST)", "utilization": 2, "memory_used": 100, "memory_total": 15000},
        "meta": {"pod_name": "zombie-process", "cloud": {"provider": "GCP", "instance": "n1-standard-4", "cost_hourly": 0.35}}
    })
    
    return history

def analyze(data):
    recs = []
    for sample in data:
        u = sample['gpu']['utilization']
        if u < 5:
            # Critical Issue
            recs.append({
                "severity": "CRITICAL",
                "title": f"Unused: {sample['gpu']['name']}",
                "description": f"Utilization is {u}%. Burn it or lose it.",
                "action": "Terminate",
                "savings": "$255/mo",
                "target": sample['meta']
            })
        elif u > 50:
             # GOOD NEWS! (Green Badge)
             recs.append({
                "severity": "OPTIMIZED",
                "title": f"Healthy: {sample['gpu']['name']}",
                "description": f"Utilization is {u}%. This GPU is generating value.",
                "action": "Keep Running",
                "savings": "$0 (Good Job)",
                "target": sample['meta']
            })
    return recs

print("--- CLUSTER SIMULATION STARTED ---")
while True:
    burn_gpu() 
    data = get_hybrid_metrics()
    if data:
        print(f"Stats: Real={data[0]['gpu']['utilization']}% | Ghost1=0% | Ghost2=2%")
        recs = analyze(data)
        try:
            requests.post(DASHBOARD_URL, json=recs)
        except: pass
    time.sleep(2)
