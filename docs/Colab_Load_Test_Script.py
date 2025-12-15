# @title 🚀 Shadow GPU - Critical Load Test Agent
# @markdown Select the Load Profile for this Colab Instance:
LOAD_PROFILE = "EXTREME" # @param ["EXTREME", "MEDIUM", "LOW", "IDLE"]
# @markdown Enter your Ngrok/Pinggy URL (e.g., https://xyz.pinggy.io):
SERVER_URL = "https://fkrsw-2409-4090-20-7804-1cd2-359d-353-e42b.a.free.pinggy.link" # @param {type:"string"}

import time
import requests
import torch
import threading
import json
import random
import os

# --- Load Simulation Logic ---
def extreme_load():
    print("🔥 STARTING EXTREME LOAD (100% GPU)")
    try:
        a = torch.randn(4000, 4000).cuda()
        b = torch.randn(4000, 4000).cuda()
        while True:
            c = torch.matmul(a, b)
            torch.cuda.synchronize()
    except Exception as e:
        print(f"Stats Error: {e}")

def medium_load():
    print("⚠️ STARTING MEDIUM LOAD (50% Duty Cycle)")
    try:
        a = torch.randn(2000, 2000).cuda()
        b = torch.randn(2000, 2000).cuda()
        while True:
            c = torch.matmul(a, b)
            torch.cuda.synchronize()
            time.sleep(0.5) # 50% idle
    except Exception as e:
        print(f"Stats Error: {e}")

def low_load():
    print("🟢 STARTING LOW LOAD (Occasional Bursts)")
    try:
        a = torch.randn(1000, 1000).cuda()
        b = torch.randn(1000, 1000).cuda()
        while True:
            if random.random() < 0.1: # 10% chance to run
                c = torch.matmul(a, b)
                torch.cuda.synchronize()
            time.sleep(1)
    except Exception as e:
        print(f"Stats Error: {e}")

def idle_load():
    print("💤 IDLE STATE (Monitoring Only)")
    # Do nothing, just keep process alive
    while True:
        time.sleep(10)

# --- Agent Logic ---
def run_agent():
    print(f"📡 Shadow Agent connecting to {SERVER_URL}...")
    # Unique ID per run
    node_id = f"colab-{LOAD_PROFILE.lower()}-{random.randint(1000,9999)}"
    
    while True:
        try:
            # Gather Metrics
            gpu_util = 0
            memory_util = 0
            gpu_name = "CPU-Only"

            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name(0)
                # For Colab, we simulate the "reported" util based on our load profile 
                # because standard torch calls don't give global GPU % easily without pynvml
                if LOAD_PROFILE == "EXTREME": gpu_util = random.uniform(98, 100)
                elif LOAD_PROFILE == "MEDIUM": gpu_util = random.uniform(45, 55)
                elif LOAD_PROFILE == "LOW": gpu_util = random.uniform(5, 15)
                else: gpu_util = 0
                
                # Memory is easier to get real data for
                memory_reserved = torch.cuda.memory_reserved(0)
                memory_total = torch.cuda.get_device_properties(0).total_memory
                memory_util = (memory_reserved / memory_total) * 100
            
            payload = {
                "node_id": node_id,
                "gpu_util": gpu_util,
                "memory_util": memory_util,
                "gpu_name": gpu_name,
                "timestamp": time.time()
            }
            
            # Send to Server
            endpoint = f"{SERVER_URL.rstrip('/')}/api/ingest"
            requests.post(endpoint, json=payload, timeout=2)
            print(f"✅ Sent Telemetry: {node_id} | Util: {gpu_util:.1f}%")
            
        except Exception as e:
            print(f"❌ Connection Error: {e}")
        
        time.sleep(5)

# --- Main Execution ---
if __name__ == "__main__":
    if not torch.cuda.is_available():
        print("❌ NO GPU DETECTED! Runtime -> Change runtime type -> T4 GPU")
    else:
        # Start Load in Background
        if LOAD_PROFILE == "EXTREME":
            t = threading.Thread(target=extreme_load)
            t.daemon = True
            t.start()
        elif LOAD_PROFILE == "MEDIUM":
            t = threading.Thread(target=medium_load)
            t.daemon = True
            t.start()
        elif LOAD_PROFILE == "LOW":
            t = threading.Thread(target=low_load)
            t.daemon = True
            t.start()
        elif LOAD_PROFILE == "IDLE":
            t = threading.Thread(target=idle_load)
            t.daemon = True
            t.start()
            
        # Run Agent
        run_agent()
