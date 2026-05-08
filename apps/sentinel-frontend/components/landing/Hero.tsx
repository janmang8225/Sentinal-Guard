'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import ExplorerLink from '../shared/ExplorerLink';

const ALERTS = [
  {
    type: "TVL_VELOCITY",
    severity: 99,
    label: "CRITICAL",
    title: "TVL Velocity Drop Detected",
    protocol: "3Eue3cN8...xcaC",
    slot: 930,
    atRisk: "$200,000 USDC",
    pauseTx: "3sX4PLsG...et3F8",
    time: "Paused in 2.1s",
    status: "PAUSED",
    color: "var(--severity-critical-border)"
  },
  {
    type: "FLASH_LOAN_DRAIN",
    severity: 64,
    label: "MEDIUM",
    title: "Flash Loan + Drain Detected",
    protocol: "3Eue3cN8...xcaC",
    slot: 1053,
    atRisk: "$517,800 USDC",
    pauseTx: "28wPiUda...Msou",
    time: "Paused in 3.4s",
    status: "PAUSED",
    color: "var(--severity-medium-border)"
  }
];

export default function Hero() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % ALERTS.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const alert = ALERTS[idx];

  return (
    <section className="bg-hero px-6 pb-24 pt-16 sm:pt-20 lg:pb-28 lg:pt-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <span className="mb-5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-primary">
            REAL-TIME SOLANA SECURITY
          </span>
          <h1 className="mb-5 max-w-4xl font-display text-[44px] font-bold leading-[0.98] tracking-[-0.05em] text-primary sm:text-[56px] lg:text-[72px]">
            Detect exploits.
            <span className="block text-[#2563eb]">Pause protocols.</span>
            <span className="block">Save funds.</span>
          </h1>
          <p className="mb-8 max-w-xl text-[17px] leading-[1.65] text-secondary sm:text-[18px]">
            SentinelGuard watches every Solana transaction in real time.
            When a flash loan drain or TVL attack is detected, it autonomously
            submits a pause instruction on-chain &mdash; in under 3 seconds.
          </p>
          <div className="mb-7">
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-xl bg-[#2563eb] px-6 py-3 text-[15px] font-medium text-white shadow-[0_14px_34px_rgba(37,99,235,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:shadow-[0_18px_38px_rgba(29,78,216,0.34)]"
              >
              Launch Dashboard &rarr;
              </Link>
              <Link
                href="#"
                className="inline-flex items-center rounded-xl border border-transparent px-2 py-3 text-[15px] font-medium text-secondary transition-colors hover:text-primary"
              >
                View on GitHub
              </Link>
            </div>
            <p className="mt-3 text-[12px] font-medium uppercase tracking-[0.14em] text-tertiary">
              Live monitoring. On-chain response.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[12px] text-tertiary sm:text-[13px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-light text-[11px] font-bold text-brand-text">✓</span>
              <span>5 attack scenarios tested</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-light text-[11px] font-bold text-brand-text">✓</span>
              <span>2 rule types confirmed</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-light text-[11px] font-bold text-brand-text">✓</span>
              <span>Sub-3s automated pause</span>
            </div>
          </div>
        </div>

        <div className="relative h-[360px] lg:col-span-5 lg:h-[440px]">
          <div className="absolute inset-x-[10%] top-8 h-32 rounded-full bg-brand-primary/18 blur-3xl" />
          <div className="absolute -left-2 top-14 h-24 w-24 rounded-full border border-brand-border/70 bg-white/30 blur-2xl" />
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.98 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-x-0 top-1/2 my-auto h-fit -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,255,0.92))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 sm:p-7"
              style={{ borderLeftColor: alert.color }}
            >
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-1.5"
                style={{ backgroundColor: alert.color }}
              />
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-inset px-2.5 py-1 font-mono text-[10px] text-secondary">{alert.type}</span>
                  <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px]`} style={{
                    borderColor: alert.color,
                    color: alert.label === 'CRITICAL' ? 'var(--severity-critical-text)' : 'var(--severity-medium-text)',
                    backgroundColor: alert.label === 'CRITICAL' ? 'var(--severity-critical-bg)' : 'var(--severity-medium-bg)'
                  }}>
                    {alert.label}
                  </span>
                </div>
                <span className="rounded-full bg-white/90 border border-slate-200/60 px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600 shadow-sm">{alert.time}</span>
              </div>

              <div className="mb-5 rounded-2xl border border-white/80 bg-white/72 px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Live incident response</div>
                <h3 className="max-w-sm font-display text-[24px] font-semibold leading-[1.05] text-primary sm:text-[28px]">
                  {alert.title}
                </h3>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/80 bg-white/72 px-4 py-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Severity</div>
                  <div className="font-mono text-[18px] font-semibold text-primary">{alert.severity}/100</div>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/72 px-4 py-3">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary">Action</div>
                  <div className="font-mono text-[18px] font-semibold text-status-paused">Protocol paused</div>
                </div>
              </div>

              <div className="mb-5 grid gap-2.5 font-mono text-[13px] text-secondary">
                <div className="grid grid-cols-[88px_1fr] items-center rounded-2xl border border-white/80 bg-white/72 px-4 py-3">
                  <span className="text-tertiary">Protocol</span>
                  <span className="justify-self-end">{alert.protocol}</span>
                </div>
                <div className="grid grid-cols-[88px_1fr] items-center rounded-2xl border border-white/80 bg-white/72 px-4 py-3">
                  <span className="text-tertiary">Slot</span>
                  <span className="justify-self-end">#{alert.slot}</span>
                </div>
                <div className="grid grid-cols-[88px_1fr] items-center rounded-2xl border border-white/80 bg-white/72 px-4 py-3">
                  <span className="text-tertiary">At risk</span>
                  <span className="justify-self-end font-medium text-primary">{alert.atRisk}</span>
                </div>
                <div className="grid grid-cols-[88px_1fr] items-center rounded-2xl border border-white/80 bg-white/72 px-4 py-3">
                  <span className="text-tertiary">Pause tx</span>
                  <span className="justify-self-end">
                    <ExplorerLink signature={alert.pauseTx} />
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border-default/80 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-status-paused animate-pulse" />
                  <span className="text-[12px] font-semibold text-status-paused tracking-wide">{alert.status}</span>
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-tertiary">Auto-response confirmed</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
