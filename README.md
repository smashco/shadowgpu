# Shadow GPU - Cloud Optimization Platform

## Overview
Shadow GPU is a telemetry and optimization agent designed to reduce cloud GPU spend.
It runs as a DaemonSet on Kubernetes, collecting high-resolution metrics (GPU Util, Memory, Top, Power) and aggregating them to identify waste.

## Repository Structure
- `cmd/agent/`: Main Go agent source code.
- `pkg/`: Core libraries (Collector, Recommendation Engine, Reporting).
- `charts/`: Helm charts for Kubernetes deployment.
- `docs/`: Deployment guides and Business Templates (SOW, Audit Reports).

## Quick Start (Technical)

### 1. Build the Agent
```bash
docker build -t shadow-agent:latest .
```

### 2. Run Locally (Testing)
If you have a local GPU, you can run the binary directly.
*Note: Requires `nvidia-smi` to be in your PATH.*
```bash
go run cmd/agent/main.go
```

### 2a. Run Simulation (No GPU/Docker required)
If you don't have the tools installed yet, you can run the python simulator to see how the logic works:
```bash
python3 simulate_audit.py
```
This will generate fake data and run the **exact same recommendation rules** as the Go agent.

### 3. Deploy to Kubernetes
Ensure you have `kubectl` configured and pointing to your GPU cluster.
```bash
# Install the Helm Chart
helm upgrade --install shadow-agent ./charts/shadow-agent \
  --set image.repository=your-registry/shadow-agent \
  --set image.tag=latest
```

## Usage (Consulting)

### Running an Audit
1.  Deploy the agent to the client's cluster.
2.  Wait 24-48 hours for data collection.
3.  The agent automatically generates `audit_report.json` every minute (stored in container).
4.  Retrieve the report:
    ```bash
    kubectl logs -l app=shadow-agent --tail=100
    # OR copy the file out
    kubectl cp shadow-agent-xyz:/app/audit_report.json ./client-report.json
    ```
5.  Use `docs/Audit_Report_Template.md` to present findings to the client.
