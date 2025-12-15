'use client';

import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Activity, AlertTriangle, CheckCircle, DollarSign, LayoutDashboard, RefreshCcw, Server, Shield, FileText, Download, Gpu } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Link from 'next/link';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface Recommendation {
    node_id?: string;
    severity: string;
    title: string;
    description: string;
    action: string;
    savings: string;
    gpu_util?: number;
    target?: {
        pod_name?: string;
        namespace?: string;
        cloud?: {
            provider: string;
            instance: string;
        };
    };
}

export default function DashboardView() {
    const [data, setData] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
    const chartRef = useRef<any>(null);

    // Load connections
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('shadow_connected_accounts');
            if (saved) {
                try { setConnectedAccounts(JSON.parse(saved)); } catch (e) { }
            }
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/ingest');
            const json = await res.json();
            if (Array.isArray(json)) {
                setData(json);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    // Aggregates
    const totalSavingsVal = data.reduce((acc, item) => {
        const match = item.savings.replace(/,/g, '').match(/\$(\d+)/);
        return acc + (match ? parseInt(match[1]) : 0);
    }, 0);
    const totalSavings = `$${totalSavingsVal.toLocaleString()}/mo`;
    const criticalIssues = data.filter(d => d.severity === 'CRITICAL').length;
    const warningIssues = data.filter(d => d.severity === 'WARNING').length;

    // Best GPU Logic
    // Best GPU Logic (Aligned with Pricing)
    const getBestGpuRecommendation = (util: number) => {
        if (util < 1) return "Terminate / Stop";
        if (util < 10) return "Move to CPU (t3.xlarge)";
        if (util < 30) return "NVIDIA T4 (Spot Instance)";
        if (util < 60) return "NVIDIA A10G (On-Demand)";
        return "NVIDIA A100 (Keep Current)";
    };

    // Chart Data
    const chartData = {
        // Clean up node IDs: Remove random suffixes for cleaner display
        labels: data.map(d => {
            const id = d.node_id || d.target?.pod_name || 'Node';
            // Split by '-' and remove the last part if it's a random number (usually it is for Colab agents)
            const parts = id.split('-');
            if (parts.length > 2 && !isNaN(parseInt(parts[parts.length - 1]))) {
                parts.pop(); // Remove random suffix
            }
            return parts.join('-').replace('colab-', '');
        }),
        datasets: [
            {
                label: 'GPU Utilization (%)',
                data: data.map(d => d.gpu_util || 0),
                backgroundColor: data.map(d => {
                    const util = d.gpu_util || 0;
                    if (util < 20) return 'rgba(239, 68, 68, 0.8)'; // Red (Waste)
                    if (util > 80) return 'rgba(16, 185, 129, 0.8)'; // Green (Good)
                    return 'rgba(245, 158, 11, 0.8)'; // Amber (Ok)
                }),
                borderColor: 'rgba(0,0,0,0)',
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const, labels: { color: '#94a3b8' } },
            title: { display: true, text: 'Real-Time Load Analysis', color: '#e2e8f0' },
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { color: '#334155' },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    // Advanced Report Generator
    const generateReport = () => {
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString();

        // 1. Header
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("SHADOW GPU", 20, 20);
        doc.setFontSize(12);
        doc.text("Critical Load Test & Audit Report", 20, 28);
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text(`Generated on: ${date}`, 160, 20);

        // 2. Executive Summary
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.text("1. Executive Summary", 20, 60);
        doc.setFontSize(11);
        doc.text(`Testing Scope: Multi-Node Load Analysis (Colab Simulation).`, 20, 70);
        doc.text(`Total Nodes Monitored: ${data.length}`, 20, 76);
        doc.text(`Optimization Potential: ${totalSavings}`, 20, 82);

        // 3. Chart Snapshot
        if (chartRef.current) {
            const canvas = chartRef.current.canvas; // Access canvas directly from ref
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 20, 95, 170, 80);
        }

        // 4. Detailed Analysis
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text("2. Node-Level Recommendations", 20, 14);

        const recommendationsData = data.map(item => {
            const util = item.gpu_util || 0;
            return [
                item.node_id || item.target?.pod_name || "Unknown",
                `${util.toFixed(1)}%`,
                item.severity,
                getBestGpuRecommendation(util),
                item.savings
            ];
        });

        autoTable(doc, {
            startY: 30,
            head: [['Node ID', 'Current Util', 'Status', 'Recommended Hardware', 'Est. Savings']],
            body: recommendationsData,
            headStyles: { fillColor: [15, 23, 42] },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            columnStyles: {
                0: { cellWidth: 40 },
                3: { cellWidth: 60 }
            }
        });

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
            doc.text("Generated by Shadow GPU Agent", 20, 290);
        }

        doc.save(`ShadowGPU_Critical_Test_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
            {/* Navbar */}
            <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-baseline gap-0.5">
                        <span className="font-black text-xl tracking-tighter text-white">TWOCORE</span>
                        <span className="font-black text-3xl text-emerald-500">X</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/integrations"
                            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 transition-transform active:scale-95"
                        >
                            <Shield className="w-4 h-4 text-emerald-500" /> Connect Cloud
                        </Link>
                        <button
                            onClick={generateReport}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                            <Download className="w-4 h-4" /> Download Full Report
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Visual Analysis Section (New) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Gpu className="w-6 h-6 text-emerald-400" />
                            Cluster Load Visualization
                        </h2>
                        <span className="text-xs text-slate-500">Live Data (5s poll)</span>
                    </div>
                    <div className="h-[300px] w-full flex justify-center">
                        <Bar ref={chartRef} data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Audit Overview</h1>
                    <p className="text-slate-400">Real-time optimization feedback from Shadow Agent.</p>
                </div>

                {/* Dynamic Audit Controls */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Active Audit Session
                    </h2>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[300px]">
                            <label className="text-xs text-slate-500 font-mono mb-1 block">TARGET SCOPE</label>
                            <select
                                id="auditScope"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                            >
                                <option value="ALL">All Connected Resources ({connectedAccounts.length})</option>
                                {connectedAccounts.map((acc: any) => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.provider})</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={async () => {
                                setLoading(true);
                                const scope = (document.getElementById('auditScope') as HTMLSelectElement).value;

                                // 1. Refresh Agent Data (Colab)
                                await fetchData();

                                // 2. Trigger Real Scans
                                let accountsToScan = connectedAccounts;
                                if (scope !== 'ALL') {
                                    accountsToScan = connectedAccounts.filter((a: any) => a.id === scope);
                                }

                                // Scan logic (mirrored from Integrations Page)
                                const scanResults: any[] = [];
                                await Promise.all(accountsToScan.map(async (account: any) => {
                                    // Skip Colab for API scans (it's passive)
                                    if (account.provider === 'Colab') return;

                                    try {
                                        const endpoint = account.provider === 'GCP' ? '/api/integrations/gcp/scan' :
                                            account.provider === 'Azure' ? '/api/integrations/azure/scan' :
                                                '/api/integrations/aws/scan';

                                        const payload = {
                                            ...account.credentials,
                                            provider: account.provider,
                                            region: account.credentials.region || 'us-east-1'
                                        };

                                        const res = await fetch(endpoint, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(payload)
                                        });
                                        const json = await res.json();
                                        if (Array.isArray(json)) {
                                            scanResults.push(...json);
                                        }
                                    } catch (e) {
                                        console.error(`Scan failed for ${account.name}`, e);
                                    }
                                }));

                                // Merge Real Scan Results with Agent Data
                                // We keep existing 'agent' data (from fetchData) and append new scan results
                                setData(prev => {
                                    // Filter out previous API scan results to avoid dupes? 
                                    // Simpler: Just append for now, or replace. 
                                    // A robust app would key them by ID.
                                    // Let's assume prev contains Agent data. 
                                    // We mix them:
                                    return [...prev, ...scanResults.map(r => ({ ...r, node_id: r.target?.cloud?.instanceId || r.title }))];
                                });

                                setLoading(false);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-8 py-2 rounded-lg transition-colors flex items-center gap-2 h-[38px] shadow-lg shadow-emerald-500/20"
                        >
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Run Audit
                        </button>
                    </div>
                    {connectedAccounts.length === 0 && (
                        <div className="mt-3 text-xs text-amber-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> No accounts connected. Go to "Connect Cloud" to add providers.
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-medium">Potential Savings</h3>
                            <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">{totalSavings}</div>
                        <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Projected monthly
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-medium">Critical Issues</h3>
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                        </div>
                        <div className="text-3xl font-bold text-white">{criticalIssues}</div>
                        <div className="text-xs text-slate-500 mt-2">Immediate action required</div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-medium">Warnings</h3>
                            <LayoutDashboard className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">{warningIssues}</div>
                        <div className="text-xs text-slate-500 mt-2">Optimization opportunities</div>
                    </div>
                </div>

                {/* Recommendations Feed */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-white">Recommendations</h2>
                        <span className="text-xs text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-full">{data.length} found</span>
                    </div>

                    {data.length === 0 ? (
                        <div className="text-center py-20 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Server className="w-6 h-6 text-slate-500" />
                            </div>
                            <h3 className="text-slate-300 font-medium">No Data Yet</h3>
                            <p className="text-slate-500 text-sm mt-1">Connect your Colab agents to start.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {data.map((rec, i) => (
                                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex items-start gap-4 shadow-sm">
                                    <div className={`mt-1 w-2 h-12 rounded-full ${rec.severity === 'CRITICAL' ? 'bg-rose-500' : rec.severity === 'OPTIMIZED' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${rec.severity === 'CRITICAL'
                                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                        : rec.severity === 'OPTIMIZED'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                                                        }`}>
                                                        {rec.severity}
                                                    </span>
                                                    <h3 className="text-base font-semibold text-slate-200">{rec.title}</h3>
                                                </div>
                                                <p className="text-slate-400 text-sm mb-3 leading-relaxed">{rec.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-emerald-400">{rec.savings}</div>
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Savings</div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-950 rounded-lg p-3 text-sm font-mono text-slate-400 border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-slate-600 block text-xs mb-0.5">RECOMMENDED ACTION</span>
                                                <span className="text-indigo-300">{rec.action}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-600 block text-xs mb-0.5">OPTIMAL HARDWARE</span>
                                                <span className="text-emerald-400">{getBestGpuRecommendation(rec.gpu_util || 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
