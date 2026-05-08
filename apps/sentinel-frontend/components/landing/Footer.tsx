import Link from 'next/link';
import { Shield, ArrowRight, Github, Twitter, BookOpen, Terminal } from 'lucide-react';
import { WATCHER_PUBKEY } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-[#0f172a] pt-24 pb-12 mt-12 border-t border-slate-800 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#2563eb] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Edge-to-Edge CTA Area */}
        <div className="pb-24 mb-16 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl">
            <h2 className="font-display text-[36px] sm:text-[48px] font-bold text-white leading-[1.1] tracking-tight mb-6">
              Secure your protocol in milliseconds.
            </h2>
            <p className="text-slate-400 text-[18px] leading-relaxed max-w-xl">
              SentinelGuard provides real-time transaction parsing and automated response, ensuring your TVL is protected before the next block is finalized.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-8 py-5 text-[17px] font-bold text-white shadow-[0_0_40px_rgba(37,99,235,0.3)] transition-all hover:-translate-y-1 hover:bg-[#1d4ed8] hover:shadow-[0_0_60px_rgba(37,99,235,0.5)]"
            >
              Launch Dashboard <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6 w-fit group">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#2563eb] shadow-[0_0_20px_rgba(37,99,235,0.3)] group-hover:scale-105 transition-transform">
                <Shield className="text-white" size={22} fill="currentColor" />
              </div>
              <span className="font-display font-bold text-[26px] text-white tracking-tight">
                SentinelGuard
              </span>
            </Link>
            <p className="text-slate-400 text-[16px] leading-relaxed max-w-sm mb-8">
              Real-time Solana security infrastructure. Autonomous threat detection and on-chain protocol pausing.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50">
              <span className="text-[12px] font-bold text-slate-300 uppercase tracking-wider">
                Built for Colosseum Hackathon
              </span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white text-[15px] mb-6 tracking-tight">Product</h3>
            <ul className="flex flex-col gap-4 text-[15px] text-slate-400 font-medium">
              <li><Link href="/dashboard" className="hover:text-[#3b82f6] hover:translate-x-1 transition-all flex items-center gap-2 w-fit"><Terminal size={16} /> Dashboard</Link></li>
              <li><Link href="#" className="hover:text-[#3b82f6] hover:translate-x-1 transition-all flex items-center gap-2 w-fit"><BookOpen size={16} /> Documentation</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white text-[15px] mb-6 tracking-tight">Developers</h3>
            <ul className="flex flex-col gap-4 text-[15px] text-slate-400 font-medium">
              <li><Link href="#" className="hover:text-[#3b82f6] hover:translate-x-1 transition-all flex items-center gap-2 w-fit"><Github size={16} /> GitHub</Link></li>
              <li><Link href="#" className="hover:text-[#3b82f6] hover:translate-x-1 transition-all flex items-center gap-2 w-fit"><Twitter size={16} /> Twitter / X</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-800/80">
          <p className="text-slate-500 text-[14px] font-medium">
            &copy; {new Date().getFullYear()} SentinelGuard. All rights reserved.
          </p>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-[13px] text-slate-400 shadow-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              Solana Devnet
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-[13px] text-slate-400 shadow-sm font-medium">
              Watcher: <span className="font-mono text-slate-300 font-bold">{WATCHER_PUBKEY.slice(0, 8)}...{WATCHER_PUBKEY.slice(-4)}</span>
            </div>
          </div>
        </div>
        
      </div>
    </footer>
  );
}
