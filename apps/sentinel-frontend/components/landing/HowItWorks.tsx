'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';

const STEPS = [
  {
    id: '01',
    title: 'Watch',
    description:
      'A Rust Geyser subscriber connects to the Solana WebSocket and receives every transaction touching the monitored protocol in real time. Each transaction is parsed for token deltas, CPI depth, flash loan keywords, and program IDs.',
    summary: 'Validator stream · Geyser parser · Transaction signals',
    visual: (
      <div className="rounded-[28px] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,255,0.84))] p-6 shadow-[0_20px_56px_rgba(15,23,42,0.08)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-primary">Live ingestion</div>
            <div className="mt-1 font-display text-[20px] font-semibold text-primary">Transaction Watcher</div>
          </div>
          <div className="rounded-full border border-brand-border/70 bg-brand-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-text">
            Real time
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/82 bg-white/82 px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[12px] font-semibold text-primary">Solana Validator</span>
              <span className="font-mono text-[11px] text-brand-primary">source</span>
            </div>
            <div className="text-[13px] text-secondary">Streams protocol-related transactions into the watcher.</div>
          </div>
          <div className="flex items-center justify-center py-1">
            <div className="rounded-full border border-brand-border/60 bg-white/80 px-3 py-1 font-mono text-[11px] text-brand-primary">
              Geyser WebSocket
            </div>
          </div>
          <div className="rounded-2xl border border-white/82 bg-white/82 px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[12px] font-semibold text-primary">SentinelGuard Watcher</span>
              <span className="font-mono text-[11px] text-brand-primary">parser</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="rounded-xl bg-[#eef1f8] px-3 py-2 font-mono text-[11px] text-secondary">token deltas</div>
              <div className="rounded-xl bg-[#eef1f8] px-3 py-2 font-mono text-[11px] text-secondary">CPI depth</div>
              <div className="rounded-xl bg-[#eef1f8] px-3 py-2 font-mono text-[11px] text-secondary">loan keywords</div>
              <div className="rounded-xl bg-[#eef1f8] px-3 py-2 font-mono text-[11px] text-secondary">program IDs</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: '02',
    title: 'Detect',
    description:
      'Incoming data is continuously evaluated against predefined detection heuristics. If a transaction exhibits malicious patterns, it scores a severity rating.',
    summary: 'Heuristic scoring · Threshold rules · Severity confidence',
    visual: (
      <div className="rounded-[28px] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,255,0.84))] p-6 shadow-[0_20px_56px_rgba(15,23,42,0.08)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-primary">Decision engine</div>
            <div className="mt-1 font-display text-[20px] font-semibold text-primary">Rule Evaluation Layer</div>
          </div>
          <div className="rounded-full border border-brand-border/70 bg-brand-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-text">
            Severity scored
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-white/82 bg-white/82 px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[12px] font-semibold text-primary">R1 Flash Loan + Drain</span>
              <span className="font-mono text-[11px] text-brand-primary">threshold 60+</span>
            </div>
            <div className="text-[13px] text-secondary">Detects flash borrow followed by TVL drop within the same slot window.</div>
          </div>
          <div className="rounded-2xl border border-white/82 bg-white/82 px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[12px] font-semibold text-primary">R2 TVL Velocity</span>
              <span className="font-mono text-[11px] text-brand-primary">up to 99</span>
            </div>
            <div className="text-[13px] text-secondary">Detects rapid TVL drop &gt; 20% within a 10-slot rolling window.</div>
          </div>
          <div className="rounded-2xl border border-white/82 bg-white/82 px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[12px] font-semibold text-primary">R3 Bridge Outflow Spike</span>
              <span className="font-mono text-[11px] text-brand-primary">bridge watch</span>
            </div>
            <div className="text-[13px] text-secondary">Detects funds leaving Solana via known bridge programs using multiplier-based thresholds.</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: '03',
    title: 'Pause',
    description:
      'When severity crosses the threshold, the responder builds a pause_withdrawals instruction with the alert ID as PDA seed and submits it to the sentinel_guardian Anchor program. The protocol is paused on-chain. Kafka, Discord, and PostgreSQL are notified simultaneously.',
    summary: 'Anchor instruction · On-chain pause · Background notifications',
    visual: (
      <div className="rounded-[28px] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,255,0.84))] p-6 shadow-[0_20px_56px_rgba(15,23,42,0.08)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-status-paused">Emergency action</div>
            <div className="mt-1 font-display text-[20px] font-semibold text-primary">Autonomous Pause Flow</div>
          </div>
          <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-status-paused">
            Executed
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-2xl border border-white/82 bg-white/82 px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-primary" />
            <div>
              <div className="font-mono text-[12px] font-semibold text-primary">AlertEvent emitted</div>
              <div className="mt-1 text-[13px] text-secondary">Responder receives the alert payload and creates the pause request.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-white/82 bg-white/82 px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-primary" />
            <div>
              <div className="font-mono text-[12px] font-semibold text-primary">pause_withdrawals ix built</div>
              <div className="mt-1 text-[13px] text-secondary">Instruction is assembled and submitted with skipPreflight for speed.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-white/82 bg-white/82 px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-status-paused" />
            <div>
              <div className="font-mono text-[12px] font-semibold text-primary">sentinel_state.paused = true</div>
              <div className="mt-1 text-[13px] text-secondary">Protocol state flips on-chain while Kafka, Discord, and DB are notified in the background.</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const nextStep = Math.min(STEPS.length - 1, Math.floor(latest * STEPS.length));
    setActiveStep((current) => (current === nextStep ? current : nextStep));
  });

  return (
    <section ref={sectionRef} className="relative bg-base py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <span className="mb-4 block text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-primary">
            HOW IT WORKS
          </span>
          <h2 className="mb-4 font-display text-[36px] font-bold text-primary">From exploit to pause — autonomously</h2>
          <p className="text-[18px] text-secondary">No human in the loop. No delay. No mercy for attackers.</p>
        </motion.div>

        <div className="hidden lg:block">
          <div className="relative h-[300vh]">
            <div className="sticky top-24 grid h-[calc(100vh-8rem)] grid-cols-[144px_minmax(0,0.92fr)_minmax(0,1.08fr)] items-center gap-12 overflow-hidden rounded-[40px] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.44),rgba(243,247,255,0.8))] px-10 py-9 shadow-[0_20px_64px_rgba(15,23,42,0.07)] backdrop-blur-sm">
              <div className="absolute inset-x-[28%] top-10 h-20 rounded-full bg-brand-primary/6 blur-3xl" />

              <div className="relative z-10 h-[332px]">
                <div className="absolute left-[28px] top-[52px] h-[228px] w-[32px] rounded-l-full border-l border-t border-b border-brand-border/28 -z-10" />
                {STEPS.map((step, index) => (
                  <motion.div
                    key={step.id}
                    animate={{
                      opacity: activeStep === index ? 1 : 0.46,
                      x: activeStep === index ? 0 : -6,
                      scale: activeStep === index ? 1 : 0.97,
                    }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className={`absolute flex w-[118px] items-center gap-3 ${
                      index === 0 ? 'left-8 top-6' : index === 1 ? 'left-0 top-[136px]' : 'left-8 bottom-6'
                    }`}
                  >
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold transition-colors ${
                        activeStep === index
                          ? 'border-brand-border bg-brand-primary text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)]'
                          : 'border-border-default/80 bg-white text-secondary'
                      }`}
                    >
                      {step.id}
                    </div>
                    <div
                      className={`w-[48px] text-left text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                        activeStep === index ? 'text-primary' : 'text-secondary'
                      }`}
                    >
                      {step.title}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="relative z-10">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={STEPS[activeStep].id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="relative"
                  >
                    <div className="max-w-[33rem]">
                      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-primary">
                        Step {STEPS[activeStep].id}
                      </div>
                      <h3 className="mb-5 font-display text-[38px] font-bold tracking-[-0.04em] text-primary">
                        {STEPS[activeStep].title}
                      </h3>
                      <p className="max-w-[31rem] text-[16px] leading-[1.8] text-secondary">
                        {STEPS[activeStep].description}
                      </p>
                      <div className="mt-6 max-w-[25rem] text-[12px] font-medium uppercase tracking-[0.14em] text-tertiary">
                        {STEPS[activeStep].summary}
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="relative z-10">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={STEPS[activeStep].id}
                    initial={{ opacity: 0, scale: 0.99, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.99, y: -12 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="relative"
                  >
                    <div className="flex min-h-[380px] items-center">
                      <div className="w-full">{STEPS[activeStep].visual}</div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-20 lg:hidden">
          {STEPS.map((step) => (
            <div key={step.id} className="grid grid-cols-1 gap-10">
              <div>
                <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-primary">Step {step.id}</div>
                <h3 className="mb-4 font-display text-[28px] font-bold text-primary">{step.title}</h3>
                <p className="text-[15px] leading-[1.7] text-secondary">{step.description}</p>
              </div>
              <div>{step.visual}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
