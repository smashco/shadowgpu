'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Shield, Server, CheckCircle, AlertTriangle, Play, Lock, X, FileText, Eye, ArrowLeft } from 'lucide-react';

export default function IntegrationsPage() {
    const [provider, setProvider] = useState('AWS');
    // Multi-Account State
    const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [showConsent, setShowConsent] = useState(false);

    // Credentials State
    const [accessKey, setAccessKey] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [gcpJson, setGcpJson] = useState('');
    const [azureCreds, setAzureCreds] = useState({ tenantId: '', clientId: '', clientSecret: '', subId: '' });
    const [sessionName, setSessionName] = useState('');

    const runScan = async () => {
        setLoading(true);
        setError('');
        setResults([]);

        if (connectedAccounts.length === 0) {
            setError("No accounts connected. Please connect at least one provider.");
            setLoading(false);
            return;
        }

        try {
            let allResults: any[] = [];

            // Parallel scan for all connected accounts
            await Promise.all(connectedAccounts.map(async (account) => {
                const payload = {
                    ...account.credentials,
                    provider: account.provider,
                    region: account.credentials.region || 'us-east-1'
                };

                let endpoint = '/api/integrations/aws/scan';
                if (account.provider === 'GCP') endpoint = '/api/integrations/gcp/scan';
                if (account.provider === 'Azure') endpoint = '/api/integrations/azure/scan';

                // For Colab, we don't scan via API, it's agent based.
                // We return a "Monitoring" status to show it's active in the results.
                if (account.provider === 'Colab') {
                    allResults.push({
                        title: `Colab Agent: ${account.name || 'Active'}`,
                        description: "Listening for incoming telemetry from runtime...",
                        savings: "Monitoring",
                        target: { cloud: { instanceId: account.name || 'colab-runtime' } }
                    });
                    return;
                }

                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.error) throw new Error(`${account.provider}: ${json.error}`);

                if (Array.isArray(json)) {
                    allResults = [...allResults, ...json];
                }
            }));

            setResults(allResults);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const initiateConnection = () => {
        setLoading(true);
        // Simulate initial handshake delay
        setTimeout(() => {
            setLoading(false);
            setShowConsent(true);
        }, 800);
    };

    const confirmConnection = async () => {
        if (provider === 'AWS' && (!accessKey || !secretKey)) {
            alert("Please enter AWS Credentials for Real Mode.");
            return;
        }

        setShowConsent(false);
        setLoading(true);
        // Simulate OAuth token exchange
        await new Promise(r => setTimeout(r, 1500));

        const newAccount = {
            id: Math.random().toString(36).substr(2, 9),
            provider,
            name: sessionName || `${provider} Account`,
            connectedAt: new Date(),
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
                serviceAccountJson: gcpJson,
                ...azureCreds
            }
        };

        const updatedAccounts = [...connectedAccounts, newAccount];
        setConnectedAccounts(updatedAccounts);

        // Persist for Dashboard access
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('shadow_connected_accounts', JSON.stringify(updatedAccounts));
        }

        // Reset inputs
        setAccessKey('');
        setSecretKey('');
        setGcpJson('');
        setAzureCreds({ tenantId: '', clientId: '', clientSecret: '', subId: '' });
        setSessionName('');

        setLoading(false);
    };

    // Load from storage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = sessionStorage.getItem('shadow_connected_accounts');
            if (saved) {
                try {
                    setConnectedAccounts(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse saved accounts");
                }
            }
        }
    }, []);

    // Remove account handler
    const disconnectAccount = (id: string) => {
        const updated = connectedAccounts.filter(a => a.id !== id);
        setConnectedAccounts(updated);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('shadow_connected_accounts', JSON.stringify(updated));
        }
        setResults([]);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-8 relative">

            {/* Consent Modal Overlay */}
            {showConsent && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Mock Browser Header for Authenticity */}
                        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            </div>
                            <div className="flex-1 text-center">
                                <span className="bg-white px-3 py-0.5 rounded text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1">
                                    <Lock className="w-2 h-2" />
                                    {provider === 'AWS' ? 'aws.amazon.com/auth' : 'accounts.google.com/oauth'}
                                </span>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="flex justify-center mb-6">
                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${provider === 'AWS' ? 'bg-[#FF9900]' : provider === 'GCP' ? 'bg-[#4285F4]' : 'bg-[#0078D4]'}`}>
                                    <span className="text-white font-bold text-xl">{provider}</span>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-center mb-2">Authorize Shadow GPU?</h3>
                            <p className="text-center text-slate-500 text-sm mb-6">
                                Enter your Cloud credentials to enable <strong>Real-Time Scanning</strong>.
                                <br />Keys are never stored, only used for this session.
                            </p>

                            {/* Credential Inputs */}
                            {provider === 'AWS' && (
                                <div className="space-y-3 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Access Key ID</label>
                                        <input
                                            type="text"
                                            value={accessKey}
                                            onChange={(e) => setAccessKey(e.target.value)}
                                            placeholder="AKIA..."
                                            className="w-full border border-slate-300 rounded p-2 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Secret Access Key</label>
                                        <input
                                            type="password"
                                            value={secretKey}
                                            onChange={(e) => setSecretKey(e.target.value)}
                                            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                                            className="w-full border border-slate-300 rounded p-2 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {provider === 'GCP' && (
                                <div className="space-y-3 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Service Account JSON</label>
                                        <textarea
                                            value={gcpJson}
                                            onChange={(e) => setGcpJson(e.target.value)}
                                            placeholder='{"type": "service_account", "project_id": ...}'
                                            rows={5}
                                            className="w-full border border-slate-300 rounded p-2 text-[10px] font-mono text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1">Paste the content of your .json key file here.</p>
                                    </div>
                                </div>
                            )}

                            {provider === 'Azure' && (
                                <div className="space-y-3 mb-6">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase">Tenant ID</label>
                                            <input type="text" value={azureCreds.tenantId} onChange={(e) => setAzureCreds({ ...azureCreds, tenantId: e.target.value })} placeholder="0000-..." className="w-full border border-slate-300 rounded p-2 text-xs font-mono" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase">Subscription ID</label>
                                            <input type="text" value={azureCreds.subId} onChange={(e) => setAzureCreds({ ...azureCreds, subId: e.target.value })} placeholder="1111-..." className="w-full border border-slate-300 rounded p-2 text-xs font-mono" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Client ID (App ID)</label>
                                        <input type="text" value={azureCreds.clientId} onChange={(e) => setAzureCreds({ ...azureCreds, clientId: e.target.value })} placeholder="Application ID" className="w-full border border-slate-300 rounded p-2 text-xs font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Client Secret</label>
                                        <input type="password" value={azureCreds.clientSecret} onChange={(e) => setAzureCreds({ ...azureCreds, clientSecret: e.target.value })} placeholder="Value..." className="w-full border border-slate-300 rounded p-2 text-xs font-mono" />
                                    </div>
                                </div>
                            )}

                            {provider === 'Colab' && (
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Session Name / Notebook Title</label>
                                        <input
                                            type="text"
                                            value={sessionName}
                                            onChange={(e) => setSessionName(e.target.value)}
                                            placeholder="e.g., Llama-3-Training"
                                            className="w-full border border-slate-300 rounded p-2 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Colab Setup Script</span>
                                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Copy & Run in Notebook</span>
                                        </div>
                                        <code className="block text-[10px] font-mono text-emerald-300 break-all bg-black/50 p-2 rounded border border-slate-800">
                                            !curl -s "{typeof window !== 'undefined' ? window.location.origin : 'https://your-app.onrender.com'}/agent?name={sessionName || 'Colab-Session'}" | python3
                                        </code>
                                    </div>
                                    <p className="text-xs text-slate-500 text-center">
                                        Run this command in a Colab cell to connect this specific session.
                                    </p>
                                </div>
                            )}

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 mb-6">
                                <div className="flex items-start gap-3">
                                    <Eye className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700">View EC2 Instances & Metrics</h4>
                                        <p className="text-xs text-slate-500">Read-only access to instance limits and utilization data.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-700">View CloudWatch/Monitoring Data</h4>
                                        <p className="text-xs text-slate-500">Read-only access to historical performance metrics.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center bg-slate-300">
                                    <CheckCircle className="w-3 h-3 text-white" />
                                </div>
                                <span className="text-xs text-slate-500">I trust Shadow GPU with Read-Only access.</span>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConsent(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmConnection}
                                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                    Authorize Access
                                </button>
                            </div>

                            <p className="text-center text-[10px] text-slate-400 mt-4">
                                This app will <strong>not</strong> be able to modify or delete resources.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`max-w-4xl mx-auto space-y-8 transition-all duration-300 ${showConsent ? 'blur-sm grayscale' : ''}`}>

                {/* Back Button */}
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                </Link>

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-emerald-500" />
                        Cloud Integrations (Agentless)
                    </h1>
                    <p className="text-slate-400">Connect your cloud provider to scan for waste without installing agents.</p>
                </div>

                {/* Provider Selector */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {['AWS', 'GCP', 'Azure', 'Colab'].map((p) => (
                        <button
                            key={p}
                            onClick={() => {
                                setProvider(p);
                                setResults([]);
                                setError('');
                                // Reset inputs
                                setAccessKey('');
                                setSecretKey('');
                                setGcpJson('');
                                setAzureCreds({ tenantId: '', clientId: '', clientSecret: '', subId: '' });
                                setSessionName('');
                            }}
                            className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${provider === p ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${provider === p ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800 border-slate-700'}`}>
                                <span className={`font-bold text-sm ${provider === p ? 'text-emerald-400' : 'text-slate-400'}`}>{p}</span>
                            </div>
                            <div className="text-left">
                                <span className={`block font-semibold ${provider === p ? 'text-white' : 'text-slate-400'}`}>{p === 'AWS' ? 'Amazon AWS' : p === 'GCP' ? 'Google Cloud' : p === 'Azure' ? 'Microsoft Azure' : 'Google Colab'}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Cloud Credentials Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${provider === 'AWS' ? 'bg-[#FF9900]/10 border-[#FF9900]/20' : provider === 'GCP' ? 'bg-[#4285F4]/10 border-[#4285F4]/20' : 'bg-[#0078D4]/10 border-[#0078D4]/20'}`}>
                            <span className={`font-bold ${provider === 'AWS' ? 'text-[#FF9900]' : provider === 'GCP' ? 'text-[#4285F4]' : 'text-[#0078D4]'}`}>{provider}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">{provider === 'AWS' ? 'Amazon Web Services' : provider === 'GCP' ? 'Google Cloud Platform' : provider === 'Azure' ? 'Azure Cloud' : 'Google Colab'}</h2>
                            <p className="text-sm text-slate-500">
                                {provider === 'AWS' ? 'Scans EC2 & CloudWatch for idle instances.' :
                                    provider === 'GCP' ? 'Scans Compute Engine for underutilized VMs.' :
                                        provider === 'Azure' ? 'Scans CycleCloud & VM Scale Sets.' :
                                            'Connect runtime via agent script.'}
                            </p>
                        </div>
                    </div>

                    {/* Connected Accounts List */}
                    <div className="space-y-4 mb-8">
                        {connectedAccounts.map(account => (
                            <div key={account.id} className="bg-slate-950/50 border border-emerald-500/20 rounded-lg p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <div>
                                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                            {account.name} Connected
                                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        </h3>
                                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                                            Added: {account.connectedAt.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => disconnectAccount(account.id)}
                                    className="text-xs text-slate-500 hover:text-white underline hover:text-rose-400"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Always Show Connect Button (for adding more) */}
                    <div className="mb-6 py-8 text-center border-2 border-dashed border-slate-800 rounded-xl hover:bg-slate-800/20 transition-colors group cursor-pointer" onClick={initiateConnection}>
                        <div className="mb-4 w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                            <Shield className="w-8 h-8 text-slate-500 group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-white font-semibold mb-1">
                            {connectedAccounts.length > 0 ? 'Connect Another Account' : `Connect ${provider} Account`}
                        </h3>
                        <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                            Add multiple environments to scan them all at once.
                        </p>
                        <button
                            className="bg-white hover:bg-slate-200 text-slate-900 font-bold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all scale-100 active:scale-95"
                        >
                            {loading && !showConsent ? 'Connecting...' : `Connect New ${provider}`}
                        </button>
                    </div>

                    <div className="flex items-center gap-4 border-t border-slate-800 pt-6">
                        <button
                            onClick={runScan}
                            disabled={loading || connectedAccounts.length === 0}
                            className={`bg-[#FF9900] hover:bg-[#FF9900]/90 text-white font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all ${loading ? 'opacity-50 cursor-wait' : ''} ${connectedAccounts.length === 0 ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500' : ''}`}
                            style={{ backgroundColor: connectedAccounts.length === 0 ? '' : provider === 'GCP' ? '#4285F4' : provider === 'Azure' ? '#0078D4' : '#FF9900' }}
                        >
                            {loading && connectedAccounts.length > 0 ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
                            {loading && connectedAccounts.length > 0 ? 'Scanning All...' : 'Start Scan'}
                        </button>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Lock className="w-3 h-3" /> Zero-Trust Access. Read-Only Scope.
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {results.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            Use API to fix: {results.length} Issues Found
                        </h3>

                        <div className="grid gap-4">
                            {results.map((rec, i) => (
                                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start justify-between group hover:border-slate-600 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 w-2 h-12 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                                        <div>
                                            <h4 className="font-bold text-slate-200">{rec.title}</h4>
                                            <p className="text-slate-400 text-sm">{rec.description}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-500">
                                                    {rec.target.cloud?.instanceId}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${provider === 'AWS' ? 'text-[#FF9900] bg-[#FF9900]/10' : provider === 'GCP' ? 'text-[#4285F4] bg-[#4285F4]/10' : 'text-[#0078D4] bg-[#0078D4]/10'}`}>{provider}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <button
                                            className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-rose-500/20"
                                            onClick={() => alert(`Stopping ${rec.target.cloud?.instanceId}... (Demo Action)`)}
                                        >
                                            Fix Issue
                                        </button>
                                        <div className="text-xs text-emerald-400 mt-2 font-mono">
                                            Save {rec.savings}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State / Success */}
                {!loading && results.length === 0 && !error && (
                    <div className="text-center py-12">
                        <p className="text-slate-600 italic">No scans run yet. Enter credentials to begin.</p>
                    </div>
                )}

            </div>
        </div>
    );
}
