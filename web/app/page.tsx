import Link from 'next/link';
import { ArrowRight, Check, Shield, Zap, BarChart3, Lock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Logo */}
            <div className="flex items-baseline gap-0.5">
              <span className="font-black text-2xl tracking-tighter text-white">TWOCORE</span>
              <span className="font-black text-4xl text-emerald-500">X</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/dashboard" className="text-sm font-medium bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors">
              Client Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] -z-10" />
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-6">
            <Zap className="w-3 h-3" /> Stop Wasting Money
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-8">
            Your Cloud is Leaking <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Money. We Fix It.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Twocorex analyzes your GPU clusters and finds idle resources in 48 hours.
            We guaranteed 20% savings or you don't pay.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#pricing" className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold px-8 py-4 rounded-full transition-all hover:scale-105 flex items-center gap-2">
              Book Free Audit <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/dashboard" className="px-8 py-4 rounded-full border border-slate-700 hover:bg-slate-800 transition-colors font-medium">
              View Demo Report
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-24 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: <BarChart3 className="w-8 h-8 text-emerald-400" />,
                title: "Deep Analysis",
                desc: "Our agent tracks GPU utilization, memory, and power at the kernel level."
              },
              {
                icon: <Shield className="w-8 h-8 text-purple-400" />,
                title: "100% Safe",
                desc: "We use a 'Dumb Agent' that only reads metrics. Your code and data never leave your cluster."
              },
              {
                icon: <Lock className="w-8 h-8 text-cyan-400" />,
                title: "IP Protection",
                desc: "Our analysis engine runs in our secure cloud. Your competitors can't copy your secret sauce."
              }
            ].map((item, i) => (
              <div key={i} className="bg-slate-950 p-8 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-colors group">
                <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Simple Pricing</h2>
            <p className="text-slate-400 text-lg">Start with a free audit. Pay only when you see value.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col hover:border-slate-700 transition-colors">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">The Audit</h3>
                <div className="text-3xl font-bold text-emerald-400">$0</div>
                <p className="text-slate-500 text-sm mt-2">One-time deep scan</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-300"><Check className="w-5 h-5 text-emerald-500" /> Full Cluster Scan (48h)</li>
                <li className="flex items-center gap-3 text-slate-300"><Check className="w-5 h-5 text-emerald-500" /> Waste Report PDF</li>
                <li className="flex items-center gap-3 text-slate-300"><Check className="w-5 h-5 text-emerald-500" /> ROI Check</li>
              </ul>
              <button className="w-full py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-white font-medium transition-colors">Get Started</button>
            </div>

            {/* Pro Tier (Highlighted) */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/50 rounded-3xl p-8 flex flex-col relative shadow-2xl shadow-emerald-500/10 scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most Popular</div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Shadow Pro</h3>
                <div className="text-3xl font-bold text-white">$497<span className="text-base font-normal text-slate-500">/mo</span></div>
                <p className="text-slate-500 text-sm mt-2">Continuous Optimization</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-white"><Check className="w-5 h-5 text-emerald-400" /> Everything in Audit</li>
                <li className="flex items-center gap-3 text-white"><Check className="w-5 h-5 text-emerald-400" /> Real-time Dashboard</li>
                <li className="flex items-center gap-3 text-white"><Check className="w-5 h-5 text-emerald-400" /> Weekly Fix Recommendations</li>
                <li className="flex items-center gap-3 text-white"><Check className="w-5 h-5 text-emerald-400" /> Slack Alerts</li>
              </ul>
              <button className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-colors">Start Trial</button>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 flex flex-col hover:border-slate-700 transition-colors">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                <div className="text-3xl font-bold text-white">Custom</div>
                <p className="text-slate-500 text-sm mt-2">For large GPU fleets</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-300"><Check className="w-5 h-5 text-emerald-500" /> Auto-Remediation (Bot)</li>
                <li className="flex items-center gap-3 text-slate-300"><Check className="w-5 h-5 text-emerald-500" /> White Glove Support</li>
                <li className="flex items-center gap-3 text-slate-300"><Check className="w-5 h-5 text-emerald-500" /> Custom Integrations</li>
                <li className="flex items-center gap-3 text-slate-300"><Check className="w-5 h-5 text-emerald-500" /> SLA Guarantee</li>
              </ul>
              <button className="w-full py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-white font-medium transition-colors">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-600 text-sm">
          <p>&copy; 2024 Twocorex (OPC) Private Limited. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
