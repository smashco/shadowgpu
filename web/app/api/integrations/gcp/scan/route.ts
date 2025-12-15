import { NextResponse } from 'next/server';
import { InstancesClient } from '@google-cloud/compute';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { serviceAccountJson, project_id } = body;

        // --- REAL MODE ---
        if (serviceAccountJson) {
            console.log("Connecting to GCP with provided Service Account...");

            let credentials;
            try {
                credentials = JSON.parse(serviceAccountJson);
            } catch (e) {
                return NextResponse.json({ error: "Invalid JSON format for Service Account Key" }, { status: 400 });
            }

            const projectId = credentials.project_id || project_id; // Extract from JSON usually
            if (!projectId) {
                return NextResponse.json({ error: "Project ID not found in JSON." }, { status: 400 });
            }

            // Client
            const instancesClient = new InstancesClient({
                credentials
            });

            // We need a zone to list instances. GCP requires zone-specific list or aggregated list.
            // Aggregated list is better.
            const iterable = instancesClient.aggregatedListAsync({
                project: projectId,
            });

            const results: any[] = [];

            // Iterate over the async iterable
            for await (const [zone, instancesObject] of iterable) {
                const zoneInstances = instancesObject.instances;
                if (zoneInstances && zoneInstances.length > 0) {
                    zoneInstances.forEach((inst: any) => {
                        if (inst.status === 'RUNNING') {
                            results.push({
                                severity: "WARNING",
                                title: `Detected Real GCP VM: ${inst.machineType?.split('/').pop()}`,
                                description: `Instance ${inst.name} is RUNNING in ${zone}.`,
                                action: "Inspect Stackdriver",
                                savings: "N/A",
                                target: {
                                    cloud: {
                                        provider: 'GCP',
                                        instanceId: inst.name,
                                        region: zone
                                    }
                                }
                            });
                        }
                    });
                }
            }

            if (results.length === 0) {
                return NextResponse.json([{
                    severity: "INFO",
                    title: "No Running VMs",
                    description: `No running instances found in project ${projectId}.`,
                    action: "None",
                    savings: "$0",
                    target: { cloud: { provider: 'GCP', instanceId: 'Project-Clean' } }
                }]);
            }

            return NextResponse.json(results);
        }

        // --- SIMULATION MODE ---
        await new Promise(r => setTimeout(r, 1500));
        return NextResponse.json([
            {
                severity: "CRITICAL",
                title: "Idle GCP GPU: tesla-t4-notebook-1",
                description: "Instance has 0% GPU Util based on Stackdriver metrics.",
                action: "Stop Instance",
                savings: "$350/mo",
                target: { cloud: { provider: 'GCP', instanceId: '83928374' } }
            }
        ]);

    } catch (error: any) {
        console.error("GCP Scan Error:", error);
        return NextResponse.json({ error: error.message || "Failed to scan GCP" }, { status: 500 });
    }
}
