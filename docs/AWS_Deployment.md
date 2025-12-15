# AWS Step-by-Step: From Login to Live Dashboard

This guide assumes you have an AWS Account but have never launched a GPU instance before.

---

## Phase 1: Launching the "Shadow GPU" on AWS

1.  **Login**: Go to [https://console.aws.amazon.com](https://console.aws.amazon.com) and sign in.
2.  **Go to EC2**: In the top search bar, type `EC2` and click **EC2**.
3.  **Launch Instance**: Click the orange **Launch instance** button.
4.  **Name**: Call it `Shadow-GPU-Test`.
5.  **AMI (Operating System)**:
    *   Search for `Deep Learning AMI`.
    *   Select **AWS Deep Learning AMI GPU TensorFlow 2.x (Ubuntu 20.04)**.
    *   *Why? It comes with NVIDIA drivers pre-installed. If you pick standard Ubuntu, `nvidia-smi` won't work.*
6.  **Instance Type**:
    *   Search for `g4dn.xlarge`.
    *   *Why? It's the cheapest NVIDIA T4 GPU (~$0.50/hr). Perfect for testing.*
7.  **Key Pair**:
    *   Click **Create new key pair**.
    *   Name: `my-shadow-key`.
    *   Type: `.pem`.
    *   Click **Create key pair**.
    *   **IMPORTANT**: It will download a file `my-shadow-key.pem`. **Save this!** You cannot get it later.
8.  **Network Settings**: Check the box **Allow SSH traffic from Anywhere** (0.0.0.0/0).
9.  **Launch**: Click **Launch instance**.

---

## Phase 2: Open the Tunnel (On Your Laptop)

While AWS is booting up (takes ~3 mins), let's prepare your laptop.

1.  **Open Terminal** on your laptop.
2.  Run this command to share your dashboard:
    ```bash
    npx localtunnel --port 3000
    ```
    *(Or `ngrok http 3000` if you have ngrok)*
3.  **Copy the URL** it gives you (e.g., `https://shiny-pugs-run.loca.lt`).
    *   *This URL allows the AWS cloud to send data to your laptop.*

---

## Phase 3: Connect & Run (The "Hack")

1.  **Get Public IP**: Go back to AWS Console > EC2 > Instances. Click your `Shadow-GPU-Test` instance. Copy the **Public IPv4 address**.
2.  **Connect**:
    Open Terminal (where your `.pem` key is) and run:
    ```bash
    chmod 400 my-shadow-key.pem  # (Only need to do this once)
    ssh -i my-shadow-key.pem ubuntu@<PASTE_PUBLIC_IP_HERE>
    ```
    *Type `yes` if asked.*

3.  **Deploy Agent**:
    Once you are inside the AWS machine (`ubuntu@ip...`), run these commands one by one:

    ```bash
    # 1. Download our agent script (I hosted a copy for you to make it easy)
    # OR create it manually:
    nano agent.py
    ```

    **(Paste the code below into nano, then Ctrl+X, Y, Enter)**
    
    <details>
    <summary>Click to see Agent Code to Paste</summary>

    ```python
    import subprocess
    import time
    import json
    import requests
    import argparse
    import csv
    import io

    def get_real_metrics():
        cmd = ['nvidia-smi', '--query-gpu=uuid,name,utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits']
        try:
            output = subprocess.check_output(cmd).decode('utf-8')
            history = []
            reader = csv.reader(io.StringIO(output))
            for row in reader:
                uuid, name, util, mem, total = [x.strip() for x in row]
                history.append({
                    "timestamp": time.time(),
                    "gpu": {"uuid": uuid, "name": name, "utilization": int(util), "memory_used": int(mem), "memory_total": int(total)},
                    "meta": {"pod_name": "real-ec2", "namespace": "aws", "cloud": {"provider": "AWS", "instance": "g4dn.xlarge", "cost_hourly": 0.526}}
                })
            return history
        except:
            return []

    def analyze(data):
        # Simplified Logic
        recs = []
        for sample in data:
            u = sample['gpu']['utilization']
            if u < 5:
                recs.append({
                    "severity": "CRITICAL", 
                    "title": "Unused AWS GPU", 
                    "description": f"Utilization is {u}%.", 
                    "action": "Terminate Now", 
                    "savings": "$380/mo",
                    "target": sample['meta']
                })
        return recs

    if __name__ == "__main__":
        parser = argparse.ArgumentParser()
        parser.add_argument("--upload-to")
        args = parser.parse_args()
        print("Shadow Agent Running...")
        while True:
            data = get_real_metrics()
            if data:
                recs = analyze(data)
                if recs and args.upload_to:
                    try:
                        requests.post(args.upload_to, json=recs)
                        print(">> Report Sent!")
                    except:
                        print("!! Upload Failed")
            else:
                print("No GPU found (or error reading nvidia-smi)")
            time.sleep(5)
    ```
    </details>

4.  **Run It**:
    ```bash
    # Install dependencies
    pip3 install requests

    # Run connection (Replace URL with YOUR localtunnel/ngrok URL)
    python3 agent.py --upload-to https://YOUR-URL-HERE/api/ingest
    ```

---

## Phase 4: Profit
Look at your local dashboard (`localhost:3000/dashboard`). You should see the **AWS g4dn.xlarge** appear!

**Don't forget to Terminate the instance** in AWS Console when done so you don't get charged!
