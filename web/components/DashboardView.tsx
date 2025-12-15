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
    const chartRef = useRef<any>(null);

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
        labels: data.map(d => d.node_id ? d.node_id.replace('colab-', '') : d.target?.pod_name || 'Node'),
        datasets: [
            {
                label: 'GPU Utilization (%)',
                data: data.map(d => d.gpu_util || Math.random() * 100), // Fallback if no util
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
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Twocorex" className="h-8 w-auto object-contain filter invert mix-blend-screen" />
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

                {/* Dynamic Demo Controls */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Live Simulation Generator
                    </h2>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-slate-500 font-mono mb-1 block">CLOUD PROVIDER</label>
                            <select id="provider" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:ring-1 focus:ring-emerald-500 outline-none">
                                <option value="AWS">AWS</option>
                                <option value="GCP">GCP</option>
                                <option value="Azure">Azure</option>
                                <option value="Mixed">Hybrid (Mixed)</option>
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-slate-500 font-mono mb-1 block">SCENARIO</label>
                            <select id="scenario" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:ring-1 focus:ring-emerald-500 outline-none">
                                <option value="idle">Scenario A: The "Lazy" Cluster (Idle)</option>
                                <option value="inefficient">Scenario B: Over-Provisioned (Low Util)</option>
                                <option value="optimized">Scenario C: Optimized (Clean)</option>
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="text-xs text-slate-500 font-mono mb-1 block">NODES</label>
                            <input id="count" type="number" defaultValue="5" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:ring-1 focus:ring-emerald-500 outline-none" />
                        </div>
                        <button
                            onClick={async () => {
                                setLoading(true);
                                const provider = (document.getElementById('provider') as HTMLSelectElement).value;
                                const scenario = (document.getElementById('scenario') as HTMLSelectElement).value;
                                const nodeCount = parseInt((document.getElementById('count') as HTMLInputElement).value);

                                await fetch('/api/simulate', {
                                    method: 'POST',
                                    body: JSON.stringify({ provider, scenario, nodeCount })
                                });
                                await fetchData(); // Reload stats
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-6 py-2 rounded-lg transition-colors flex items-center gap-2 h-[38px]"
                        >
                            <RefreshCcw className="w-4 h-4" /> Run Sim
                        </button>
                    </div>
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
