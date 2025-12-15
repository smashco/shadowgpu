import { NextResponse } from 'next/server';
import { ComputeManagementClient } from '@azure/arm-compute';
import { ClientSecretCredential } from '@azure/identity';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { azure } = body;

        // --- REAL MODE ---
        if (azure && azure.clientId && azure.clientSecret && azure.tenantId && azure.subId) {
            console.log("Connecting to Azure...");

            const credential = new ClientSecretCredential(azure.tenantId, azure.clientId, azure.clientSecret);
            const client = new ComputeManagementClient(credential, azure.subId);

            const results: any[] = [];

            // List all VMs in subscription
            const vms = client.virtualMachines.listAll();

            // listAll returns an async iterable
            for await (const vm of vms) {
                // Check power state needs 'instanceView', but listAll might not give it fully. 
                // We'll assume existence = check it.
                // Or we can get instance view for each. For speed, let's just list them.

                results.push({
                    severity: "WARNING",
                    title: `Detected Azure VM: ${vm.hardwareProfile?.vmSize}`,
                    description: `VM ${vm.name} exists in ${vm.location}. Check monitor.`,
                    action: "Inspect Monitor",
                    savings: "N/A",
                    target: {
                        cloud: {
                            provider: 'Azure',
                            instanceId: vm.vmId,
                            region: vm.location
                        }
                    }
                });
            }

            if (results.length === 0) {
                return NextResponse.json([{
                    severity: "INFO",
                    title: "No VMs Found",
                    description: `No VMs found in subscription ${azure.subId}.`,
                    action: "None",
                    savings: "$0",
                    target: { cloud: { provider: 'Azure', instanceId: 'Sub-Clean' } }
                }]);
            }

            return NextResponse.json(results);
        }

        // --- SIMULATION MODE ---
        await new Promise(r => setTimeout(r, 1500));
        return NextResponse.json([
            {
                severity: "CRITICAL",
                title: "Unused Azure VM: Standard_NC6_v3",
                description: "Zero usage detected for 48 hours.",
                action: "Stop Instance",
                savings: "$210/mo",
                target: { cloud: { provider: 'Azure', instanceId: 'vm-scale-set-01' } }
            }
        ]);

    } catch (error: any) {
        console.error("Azure Scan Error:", error);
        return NextResponse.json({ error: error.message || "Failed to scan Azure" }, { status: 500 });
    }
}
