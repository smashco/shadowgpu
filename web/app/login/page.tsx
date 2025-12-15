'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Simple client-side check for Demo/MVP (In prod, verify on API)
        // We will set a cookie that Middleware checks
        if (code === 'admin' || code === 'shadow123') {
            document.cookie = "shadow_auth_token=valid; path=/; max-age=86400"; // 1 day
            router.push('/dashboard');
        } else {
            setError('Invalid Access Code');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center ring-1 ring-emerald-500/50">
                        <Lock className="w-8 h-8 text-emerald-500" />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Shadow GPU</h1>
                    <p className="text-slate-400">Enter access code to view the dashboard.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Access Code"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-rose-400 text-sm text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        Enter Dashboard <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
