import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Catalog of Instance Types
const CLOUD_CATALOG: Record<string, any[]> = {
    'AWS': [
        { provider: 'AWS', instance: 'p3.2xlarge', gpu: 'NVIDIA V100', cost_hourly: 3.06 },
        { provider: 'AWS', instance: 'p4d.24xlarge', gpu: 'NVIDIA A100', cost_hourly: 32.77 },
        { provider: 'AWS', instance: 'g4dn.xlarge', gpu: 'NVIDIA T4', cost_hourly: 0.526 },
    ],
    'GCP': [
        { provider: 'GCP', instance: 'a2-highgpu-1g', gpu: 'NVIDIA A100', cost_hourly: 3.67 },
        { provider: 'GCP', instance: 'n1-standard-4', gpu: 'NVIDIA T4', cost_hourly: 0.35 },
    ],
    'Azure': [
        { provider: 'Azure', instance: 'Standard_NC6s_v3', gpu: 'NVIDIA V100', cost_hourly: 3.12 },
    ]
};

// Types
interface SimRequest {
    provider: string; // 'AWS', 'GCP', 'Azure', 'Mixed'
    scenario: string; // 'idle', 'inefficient', 'optimized'
    nodeCount: number;
}

export async function POST(req: Request) {
    try {
        const body: SimRequest = await req.json();
        const { provider, scenario, nodeCount } = body;

        const recommendations = [];

        // Loop to generate "Fake Nodes"
        for (let i = 0; i < nodeCount; i++) {
            // Pick an instance type
            const providerKey = provider === 'Mixed' ? ['AWS', 'GCP', 'Azure'][Math.floor(Math.random() * 3)] : provider;
            const catalog = CLOUD_CATALOG[providerKey] || CLOUD_CATALOG['AWS'];
            const instance = catalog[Math.floor(Math.random() * catalog.length)];

            const uuid = `GPU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // Generate Usage based on Scenario
            let avgUtil = 0;
            if (scenario === 'idle') {
                avgUtil = Math.random() * 5; // 0-5%
            } else if (scenario === 'inefficient') {
                avgUtil = 20 + Math.random() * 15; // 20-35%
            } else {
                avgUtil = 80 + Math.random() * 15; // 80-95% (Good)
            }

            // Generate Recommendation (Logic from python script)
            if (avgUtil < 10) {
                const monthlySavings = Math.round(instance.cost_hourly * 730);
                recommendations.push({
                    severity: "CRITICAL",
                    title: `Unused ${instance.provider} ${instance.instance}`,
                    description: `This ${uuid} had ${avgUtil.toFixed(1)}% utilization. You are paying $${instance.cost_hourly}/hr for empty air.`,
                    action: "Terminate instance immediately.",
                    savings: `$${monthlySavings}/mo`,
                    target: {
                        pod_name: `jupyter-notebook-${i}`,
                        namespace: 'dev-team',
                        cloud: instance
                    }
                });
            } else if (avgUtil < 40) {
                recommendations.push({
                    severity: "WARNING",
                    title: `Inefficient Scaling on ${instance.provider}`,
                    description: `Utilization is low (${avgUtil.toFixed(1)}%) but not zero.`,
                    action: `Downscale to a cheaper instance to save 50%.`,
                    savings: "50% Savings",
                    target: {
                        pod_name: `inference-worker-${i}`,
                        namespace: 'prod',
                        cloud: instance
                    }
                });
            }
        }

        // Save to file (so the ingest API can read it later if needed, or just return it)
        // Save to SHARED state file so /api/ingest can read it
        const stateFile = '/tmp/cluster_state.json';
        let currentState: any = {};

        try {
            if (fs.existsSync(stateFile)) {
                currentState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
            }
        } catch (e) {
            console.error("Failed to read state for sim:", e);
        }

        // Convert recommendations to "Node State" format
        recommendations.forEach((rec, idx) => {
            const nodeId = `sim-node-${idx}`;
            currentState[nodeId] = {
                node_id: nodeId,
                // Simulate raw fields just in case
                gpu_util: rec.severity === 'CRITICAL' ? 0 : rec.severity === 'WARNING' ? 30 : 90,
                gpu_name: rec.target.cloud.gpu,
                ...rec,
                last_seen: Date.now()
            };
        });

        try {
            fs.writeFileSync(stateFile, JSON.stringify(currentState, null, 2));
        } catch (e) {
            console.error("Failed to write sim state:", e);
        }

        return NextResponse.json({ success: true, count: recommendations.length });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
    }
}
