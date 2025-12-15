import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper to get/set data
const getDataPath = () => '/tmp/cluster_state.json';

const readState = () => {
  const p = getDataPath();
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return {};
  }
};

const writeState = (state: any) => {
  fs.writeFileSync(getDataPath(), JSON.stringify(state, null, 2));
};

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Handle both single object and array (flexibility)
    const items = Array.isArray(payload) ? payload : [payload];

    const currentState = readState();
    let updated = false;

    items.forEach((item: any) => {
      if (item.node_id) {
        // Determine severity based on util
        let severity = "OPTIMIZED";
        let action = "None";
        let savings = "$0/mo";
        let title = `Active Node: ${item.node_id}`;
        let description = `Node is healthy running at ${item.gpu_util?.toFixed(1)}% utilization.`;

        const util = item.gpu_util || 0;
        const gpuName = (item.gpu_name || "").toUpperCase();

        // 2. Pricing Map (From User Rate Card - GCP Monthly)
        const PRICING: Record<string, number> = {
          "A100": 2570.10, // Nvidia Tesla A100From Rate Card
          "A100-80GB": 3440.99,
          "V100": 2172.48,
          "L4": 490.60,
          "T4": 306.60,
          "T4 (2X)": 613.20, // Common in Colab
          "DEFAULT": 306.60  // Fallback to T4
        };

        // ID Helper
        let currentPrice = PRICING["DEFAULT"];
        if (gpuName.includes("A100")) currentPrice = PRICING["A100"];
        else if (gpuName.includes("V100")) currentPrice = PRICING["V100"];
        else if (gpuName.includes("L4")) currentPrice = PRICING["L4"];
        else if (gpuName.includes("T4")) currentPrice = PRICING["T4"];

        const PRICE_CPU = 45.00; // Approx n1-standard-4

        // 3. Dynamic Logic
        if (util < 1) {
          severity = "CRITICAL";
          title = `Idle ${item.gpu_name}: ${item.node_id}`;
          description = `Instance '${item.gpu_name}' is active but idle. 100% Waste.`;
          action = "Stop Instance";
          savings = `$${currentPrice.toFixed(0)}/mo`;

        } else if (util < 15) {
          severity = "WARNING";
          title = `Zombie Node: ${item.node_id}`;
          description = `Low utilization (${util.toFixed(1)}%) on expensive hardware.`;
          action = "Migrate to CPU";
          savings = `$${(currentPrice - PRICE_CPU).toFixed(0)}/mo`;

        } else if (util < 40) {
          // If on A100 but < 40% usage, could fit on L4 or T4?
          if (currentPrice > PRICING["T4"]) {
            severity = "WARNING";
            title = `Oversized GPU: ${item.node_id}`;
            description = `Workload fits on smaller GPU (T4/L4).`;
            action = "Downsize to T4";
            savings = `$${(currentPrice - PRICING["T4"]).toFixed(0)}/mo`;
          } else {
            // Already on T4, suggest Spot/Preemptible
            severity = "WARNING";
            title = `Optimizable: ${item.node_id}`;
            description = `Consistent low load. Move to Preemptible VM.`;
            action = "Switch to Spot";
            savings = `$${(currentPrice * 0.6).toFixed(0)}/mo`; // ~60% savings
          }
        } else {
          // Optimized
          savings = "$0/mo";
          action = "None";
        }
        // Update/Upsert node state
        currentState[item.node_id] = {
          ...item,
          severity,
          title,
          description,
          action,
          savings,
          last_seen: Date.now()
        };
        updated = true;
      }
    });

    if (updated) {
      writeState(currentState);
    }

    return NextResponse.json({ success: true, active_nodes: Object.keys(currentState).length });

  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const state = readState();
    const now = Date.now();
    const timeout = 60 * 1000; // 1 minute timeout

    // Convert map to array and filter out old nodes
    const activeNodes = Object.values(state).filter((node: any) => {
      return (now - (node.last_seen || 0)) < timeout;
    });

    return NextResponse.json(activeNodes);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}
