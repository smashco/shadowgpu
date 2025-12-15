import { NextResponse } from 'next/server';
import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { CloudWatchClient, GetMetricDataCommand } from "@aws-sdk/client-cloudwatch";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { provider, accessKeyId, secretAccessKey, region = 'us-east-1' } = body;

        // --- REAL MODE ---
        if (accessKeyId && secretAccessKey) {
            console.log("Connecting to AWS with provided keys...");

            const ec2 = new EC2Client({
                region,
                credentials: { accessKeyId, secretAccessKey }
            });

            const command = new DescribeInstancesCommand({});
            const data = await ec2.send(command);

            const results: any[] = [];

            // Parse Real EC2 Data
            data.Reservations?.forEach(res => {
                res.Instances?.forEach(inst => {
                    if (inst.State?.Name === 'running') {
                        // Simple logic for Demo: Just list them. 
                        // Real logic would query CloudWatch here (complex for one file).
                        // We'll mark them as "Investigate" or "Healthy"
                        results.push({
                            severity: "WARNING", // Assume all need checking in this 'Audit'
                            title: `Detected Real Instance: ${inst.InstanceType}`,
                            description: `Instance ${inst.InstanceId} is RUNNING. Check utilization.`,
                            action: "Inspect Metrics",
                            savings: "N/A", // Need CW for this
                            target: {
                                cloud: {
                                    provider: 'AWS',
                                    instanceId: inst.InstanceId,
                                    region: inst.Placement?.AvailabilityZone
                                }
                            }
                        });
                    }
                });
            });

            if (results.length === 0) {
                return NextResponse.json([{
                    severity: "INFO",
                    title: "No Running Instances",
                    description: "Your AWS account has no active EC2 instances in this region.",
                    action: "None",
                    savings: "$0",
                    target: { cloud: { provider: 'AWS', instanceId: 'Account-Clean' } }
                }]);
            }

            return NextResponse.json(results);
        }

        // --- SIMULATION / DEMO MODE (Fallback) ---
        await new Promise(r => setTimeout(r, 1500)); // Fake latency

        return NextResponse.json([
            {
                severity: "CRITICAL",
                title: `Idle ${provider} GPU: ${provider === 'AWS' ? 'p3.2xlarge' : provider === 'GCP' ? 'tesla-t4-notebook-1' : 'Standard_NC6_v3'}`,
                description: `Instance has 0% GPU Util based on ${provider === 'AWS' ? 'CloudWatch' : provider === 'GCP' ? 'Stackdriver' : 'Azure Monitor'} metrics.`,
                action: "Stop Instance",
                savings: "$350/mo",
                target: { cloud: { provider, instanceId: provider === 'AWS' ? 'i-0abcd1234efgh' : provider === 'GCP' ? '83928374' : 'vm-scale-set-01' } }
            },
            {
                severity: "CRITICAL",
                title: `Unused ${provider} VM: ${provider === 'AWS' ? 'g4dn.xlarge' : provider === 'GCP' ? 'n1-standard-8' : 'Standard_NV6'}`,
                description: `Zero usage detected for 48 hours.`,
                action: "Stop Instance",
                savings: "$210/mo",
                target: { cloud: { provider, instanceId: provider === 'AWS' ? 'i-0xyz9876lmno' : provider === 'GCP' ? '9928374' : 'vm-dev-02' } }
            }
        ]);

    } catch (error: any) {
        console.error("AWS Scan Error:", error);
        return NextResponse.json({ error: error.message || "Failed to scan" }, { status: 500 });
    }
}
