# Free Option: Google Colab "Hack"

AWS GPUs are **expensive** ($0.50 - $4.00 per hour).
**Google Colab** gives you a **Real NVIDIA T4 GPU for FREE**.

We can use Colab to simulate a client's machine.

---

## Step 1: Open The Tunnel (On Your Laptop)
We need the cloud (Colab) to talk to your laptop.
1.  Open your dashboard: `http://localhost:3000`
2.  **Option A (If you have Ngrok)**:
    ```bash
    ngrok http 3000
    ```
3.  **Option B (Easy Way - No Install)**:
    Open a new terminal and run:
    ```bash
    npx localtunnel --port 3000
    ```
    *(Type 'y' if it asks to install)*

4.  **Option C (Most Reliable - Pinggy)**:
    If others fail, run this (uses Port 443):
    ```bash
    ssh -p 443 -R0:localhost:3000 a.pinggy.io
    ```
    *   **Type `yes`** when it asks "Are you sure you want to continue?".
    *   **Copy the URL** (e.g., `https://rand.a.pinggy.link`).

5.  **COPY** the final URL.
    *   **ADD** `/api/ingest` to the end of it.
    *   Final Link: `https://YOUR-URL/api/ingest`

---

## Step 2: Open Google Colab
1.  Go to **[colab.research.google.com](https://colab.research.google.com)**.
2.  Click **"New Notebook"**.
3.  **IMPORTANT**: Enable GPU.
    *   Go to **Runtime** > **Change runtime type**.
    *   Select **T4 GPU**.
    *   Click **Save**.

---

## Step 3: Run the Agent (In Colab)
Paste this entire block into the first cell of the Colab notebook.
**Replace the URL at the bottom with your Ngrok URL.**

```python
# --- INSTALL DEPENDENCIES ---
!pip install requests

# --- CREATE AGENT SCRIPT ---
import subprocess
import time
import json
import requests
import csv
import io

# The URL of your Local Dashboard (via Ngrok)
# REPLACE THIS!
DASHBOARD_URL = "https://YOUR-NGROK-ID.ngrok-free.app/api/ingest" 

def get_real_metrics():
    # Capture NVIDIA-SMI Data
    try:
        cmd = ['nvidia-smi', '--query-gpu=uuid,name,utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits']
        output = subprocess.check_output(cmd).decode('utf-8')
        history = []
        reader = csv.reader(io.StringIO(output))
        for row in reader:
            uuid, name, util, mem, total = [x.strip() for x in row]
            history.append({
                "timestamp": time.time(),
                "gpu": {"uuid": uuid, "name": name, "utilization": int(util), "memory_used": int(mem), "memory_total": int(total)},
                "meta": {
                    "pod_name": "colab-notebook", 
                    "namespace": "google-free-tier", 
                    "cloud": {"provider": "Google Colab", "instance": "T4 Free", "cost_hourly": 0.0}
                }
            })
        return history
    except Exception as e:
        print(f"Error: {e}")
        return []

def analyze(data):
    # Detect Idle GPUs
    recs = []
    for sample in data:
        u = sample['gpu']['utilization']
        if u < 5:
            recs.append({
                "severity": "CRITICAL",
                "title": "Unused Google Colab GPU",
                "description": f"Utilization is {u}%. This is a Free Tier GPU.",
                "action": "Close tab to save Google money.",
                "savings": "$0/mo (It's Free!)",
                "target": sample['meta']
            })
    return recs

print("--- SHADOW AGENT STARTED ---")
print(f"Target: {DASHBOARD_URL}")

while True:
    data = get_real_metrics()
    if data:
        print(f"Captured: {data[0]['gpu']['name']} | Util: {data[0]['gpu']['utilization']}%")
        recs = analyze(data)
        if recs:
            try:
                r = requests.post(DASHBOARD_URL, json=recs)
                if r.status_code == 200:
                    print(">> Report sent to your Dashboard!")
                else:
                    print(f"!! Network Error: {r.status_code}")
            except Exception as e:
                print(f"!! Connection Failed: {e}")
    else:
        print("No GPU found! Did you change Runtime type to T4?")
        
    time.sleep(5)
```

## Step 4: The Result
1.  Run the cell (Play Button).
2.  Look at your **Local Dashboard**.
3.  You will see **"Unused Google Colab GPU"** appear in the list!
