'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'motion/react';

const ARCHITECTURE_LAYERS = [
  {
    id: 'solana',
    title: 'SOLANA BLOCKCHAIN',
    sublabel: '~400ms slots · Geyser events',
    color: '#1e3a8a',
    description:
      'The foundation of every detection. SentinelGuard connects directly to a local Solana validator, receiving every block at the native ~400ms slot cadence via the Geyser WebSocket plugin. No API rate limits. No polling delays. Every transaction touching the monitored protocol is seen in real time.',
    bullets: [
      'Local validator access — no RPC rate limits',
      'Full block coverage via Yellowstone Geyser plugin',
      '~400ms slot cadence — native chain speed',
      'Pubkey: EbVbJD...VYa7m',
    ],
    badges: ['Yellowstone', 'Geyser', '~400ms slots'],
  },
  {
    id: 'grpc',
    title: 'gRPC / WEBSOCKET STREAMS',
    sublabel: 'Yellowstone · Geyser plugin',
    color: '#2563eb',
    description:
      'Raw blockchain events stream over gRPC using the Yellowstone Geyser plugin, providing SentinelGuard with a high-throughput, low-latency feed of slot updates, account deltas, and transaction confirmations. Unlike polling, this is push-based — events arrive the moment they are finalized.',
    bullets: [
      'Push-based — no polling, no missed transactions',
      'Yellowstone Geyser plugin for sub-millisecond delivery',
      'Slot updates + account changes + tx confirmations',
      'Bidirectional gRPC stream for control messages',
    ],
    badges: ['gRPC', 'WebSocket', 'Push-based'],
  },
  {
    id: 'parser',
    title: 'TRANSACTION PARSER',
    sublabel: 'geyser.rs · Flash detection · 3 methods',
    color: '#3b82f6',
    description:
      'geyser.rs is the decode layer. It receives every raw transaction and extracts structured intelligence: token balance deltas, CPI call trees, flash loan evidence via 3 methods: Program ID (conf 95), Log keyword (conf 70), Delta pattern (conf 55). Writes TVL to Redis every slot. Broadcasts ParsedTransaction on channel (cap: 10,000).',
    bullets: [
      'geyser.rs — Rust async parser, zero-copy deserialization',
      'Token delta computation: before/after balances per tx',
      'Flash loan detection: Program ID (conf 95), Log keyword (70), Delta pattern (55)',
      '+10 confidence boost when 2+ methods agree',
      'Writes TVL to Redis · Broadcasts ParsedTransaction (channel cap: 10,000)',
    ],
    badges: ['geyser.rs', 'Rust', '3 heuristics', 'Redis TVL'],
  },
  {
    id: 'engine',
    title: 'DETECTION ENGINE',
    sublabel: 'engine.rs · R1 · R2 · R3 · Score ≥ 60',
    color: '#60a5fa',
    description:
      'engine.rs — evaluates 3 rules on every ParsedTransaction. R1 flash_loan.rs: flash + TVL drop >15% in 5 slots, score 40–99. R2 tvl_velocity.rs: TVL drop ≥20% in 3 slots, score 75–99. R3 bridge_spike.rs: outflow 10x rolling avg, score 85–95. Fires AlertEvent when score ≥ 60.',
    bullets: [
      'engine.rs — rolling 5-slot evaluation window, every slot',
      'R1 Flash Loan Drain: flash evidence + TVL drop ≥20%, score 0–95',
      'R2 TVL Velocity: ≥20% TVL drop in 3 slots, score 0–99',
      'R3 Bridge Outflow Spike: 10× rolling average outflow, score 85–95',
      'max(R1, R2, R3) — threshold 60 triggers AlertEvent',
      'Redis deduplication: cooldown + paused keys prevent re-fire',
    ],
    badges: ['engine.rs', 'R1/R2/R3', 'Score ≥ 60', 'Redis dedup'],
  },
  {
    id: 'responder',
    title: 'RESPONDER SERVICE',
    sublabel: 'pause.rs · webhooks.rs · DB insert',
    color: '#93c5fd',
    description:
      'On AlertEvent — simultaneously: (1) sends pause_withdrawals Anchor instruction on-chain, (2) inserts alert to PostgreSQL, (3) publishes to Kafka topic, (4) dispatches webhooks to Discord/Telegram. Entire detect-to-pause loop: ~2–3s.',
    bullets: [
      'Redis optimistic pause key set in ~2ms — blocks further processing',
      'pause.rs: builds pause_withdrawals Anchor instruction, skipPreflight',
      'On-chain confirmation in ~400ms (localnet latency)',
      'webhooks.rs: Kafka topic sentinel.alerts + Discord notification',
      'PostgreSQL insert with ON CONFLICT DO NOTHING deduplication',
      'Confirmed pause txs: 3sX4PLsG... · 28wPiUda...',
    ],
    badges: ['pause.rs', 'webhooks.rs', '~2ms pause', 'Kafka', 'PostgreSQL'],
  },
  {
    id: 'dashboard',
    title: 'DASHBOARD & OUTPUTS',
    sublabel: 'Next.js · WS feed · Kafka · REST',
    color: '#bfdbfe',
    description:
      'Next.js 14. WebSocket feed at /feed. REST endpoints: /alerts, /stats, /tvl-history/:protocol. Shows live alert stream, TVL chart, protocol status, on-chain pause confirmations.',
    bullets: [
      'Next.js 14 App Router — TypeScript, Tailwind, Recharts',
      'WS /feed — real-time alert push to dashboard UI',
      'REST: /alerts, /tvl, /protocol-status, /stats',
      'On-chain state read directly from SentinelState PDA',
      'One-click unpause_withdrawals instruction from UI',
      'SentinelState PDA: 2oQ8Z6u...mt8q',
    ],
    badges: ['Next.js 14', 'WebSocket', 'REST', 'One-click unpause'],
  },
];

const GRID_SEQUENCE = [
  { layerIndex: 0, mobileTop: '10px', desktopTop: '70px', align: 'left' },
  { layerIndex: 1, mobileTop: '156px', desktopTop: '70px', align: 'right' },
  { layerIndex: 2, mobileTop: '302px', desktopTop: '260px', align: 'right' },
  { layerIndex: 3, mobileTop: '448px', desktopTop: '260px', align: 'left' },
  { layerIndex: 4, mobileTop: '594px', desktopTop: '450px', align: 'left' },
  { layerIndex: 5, mobileTop: '740px', desktopTop: '450px', align: 'right' },
];

const GRID_CONNECTIONS = [
  { top: '130px', left: 'calc(50% - 30px)', width: '60px', height: '10px', x1: '0', y1: '5', x2: '60', y2: '5' },
  { top: '200px', left: 'calc(50% + 135px)', width: '10px', height: '60px', x1: '5', y1: '0', x2: '5', y2: '60' },
  { top: '320px', left: 'calc(50% - 30px)', width: '60px', height: '10px', x1: '60', y1: '5', x2: '0', y2: '5' },
  { top: '390px', left: 'calc(50% - 145px)', width: '10px', height: '60px', x1: '5', y1: '0', x2: '5', y2: '60' },
  { top: '510px', left: 'calc(50% - 30px)', width: '60px', height: '10px', x1: '0', y1: '5', x2: '60', y2: '5' },
];

export default function ArchitectureSection() {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
    const nextStep = Math.min(ARCHITECTURE_LAYERS.length - 1, Math.floor(latest * ARCHITECTURE_LAYERS.length));
    setActiveStep((current) => (current === nextStep ? current : nextStep));
  });

  const activeLayer = ARCHITECTURE_LAYERS[activeStep];

  return (
    <section className="bg-base">
      <div className="mx-auto w-full max-w-7xl px-6 pb-8 pt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 text-center lg:text-left"
        >
          <span className="mb-4 block text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-primary">
            SYSTEM ARCHITECTURE
          </span>
          <h2 className="mb-4 font-display text-[36px] font-bold tracking-[-0.04em] text-primary">
            Six layers of on-chain defense.
          </h2>
          <p className="mx-auto lg:mx-0 max-w-[31rem] text-[18px] leading-[1.65] text-secondary">
            Every component engineered for sub-second threat response.
          </p>
        </motion.div>
      </div>

      <div ref={containerRef} className="relative lg:h-[600vh]">
        <div className="flex w-full items-center justify-center overflow-hidden lg:sticky lg:top-[80px] lg:h-[calc(100vh-80px)]">
          <div className="mx-auto w-full max-w-7xl px-6 pb-20 lg:py-8">
            <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
              <div className="relative h-[890px] lg:h-[650px] rounded-[28px] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,255,0.84))] p-5 shadow-[0_20px_56px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes flow {
              to { stroke-dashoffset: -12; }
            }
            .animate-flow {
              animation: flow 1s linear infinite;
            }
            @media (min-width: 1024px) {
              .responsive-top { top: var(--desktop-top) !important; }
            }
          `}} />

          {/* Interactive Flow Container */}
          <div className="relative z-0 h-full w-full">
            {/* Mobile connections (straight vertical line) */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none lg:hidden z-0">
              <line x1="50%" y1="140" x2="50%" y2="740" stroke="#2563eb" strokeWidth="3" strokeDasharray="6 6" className="animate-flow opacity-30" />
            </svg>

            {/* Desktop connections (grid layout) */}
            <div className="absolute inset-0 h-full w-full pointer-events-none hidden lg:block z-0">
              {GRID_CONNECTIONS.map((conn, index) => (
                <div key={index} className="absolute" style={{ left: conn.left, width: conn.width, top: conn.top, height: conn.height }}>
                  <svg width="100%" height="100%">
                    <line 
                      x1={conn.x1} y1={conn.y1} x2={conn.x2} y2={conn.y2}
                      stroke="#2563eb" 
                      strokeWidth="3" 
                      strokeDasharray="6 6" 
                      className="animate-flow opacity-30" 
                    />
                  </svg>
                </div>
              ))}
            </div>

            {/* Buttons */}
            {GRID_SEQUENCE.map((item) => {
              const layer = ARCHITECTURE_LAYERS[item.layerIndex];
              const isActive = activeStep === item.layerIndex;

              const alignClass = 
                item.align === 'left' ? 'left-1/2 -ml-[110px] lg:left-[calc(50%-250px)] lg:ml-0' :
                item.align === 'right' ? 'left-1/2 -ml-[110px] lg:left-[calc(50%+30px)] lg:ml-0' :
                'left-1/2 -ml-[110px]';

              return (
                <motion.div
                  key={layer.id}
                  animate={{
                    opacity: isActive ? 1 : 0.6,
                    scale: isActive ? 1.02 : 1,
                    backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                    borderColor: isActive ? '#2563eb' : 'rgba(255,255,255,0.9)',
                    boxShadow: isActive ? '0 0 0 1px #2563eb, 0 16px 34px rgba(37,99,235,0.12)' : '0 10px 26px rgba(15,23,42,0.04)',
                  }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute h-[130px] w-[220px] rounded-[18px] border px-5 py-4 flex flex-col justify-center text-left responsive-top ${alignClass} z-10`}
                  style={{
                    '--mobile-top': item.mobileTop,
                    '--desktop-top': item.desktopTop,
                    top: 'var(--mobile-top)'
                  } as React.CSSProperties}
                >
                  <div className="mb-3 flex items-center justify-between w-full">
                    <span className={`font-mono text-[13px] font-semibold transition-colors duration-300 ${isActive ? 'text-[#2563eb]' : 'text-slate-500'}`}>
                      0{item.layerIndex + 1}
                    </span>
                    <span 
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                  </div>
                  <div className={`mb-1.5 text-[12px] font-bold uppercase tracking-[0.08em] transition-colors duration-300 ${isActive ? 'text-primary' : 'text-secondary'}`}>
                    {layer.title}
                  </div>
                  <div className={`text-[11px] leading-[1.4] transition-colors duration-300 ${isActive ? 'text-secondary' : 'text-tertiary'}`}>
                    {layer.sublabel}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="relative h-[610px] lg:h-[650px] overflow-hidden rounded-[24px] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,255,0.84))] shadow-[0_20px_56px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeLayer.id}
              initial={{ opacity: 0, scale: 0.99, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col p-6"
            >
              <div className="h-full overflow-y-auto pr-3 custom-scrollbar">
                <div className="mb-5 flex items-center gap-3">
                  <div 
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: activeLayer.color }}
                  >
                    <span className="font-mono text-sm font-bold">0{activeStep + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-[20px] font-semibold text-primary">{activeLayer.title}</h3>
                  </div>
                </div>

                <div className="mb-6 rounded-2xl border border-white/82 bg-white/82 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                  <p className="text-[14px] leading-[1.7] text-secondary">
                    {activeLayer.description}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-primary">
                    Core Functions
                  </div>
                  <ul className="space-y-2.5">
                    {activeLayer.bullets.map((bullet, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#eef4ff] text-[#2563eb]">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="text-[13.5px] leading-[1.6] text-secondary">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-primary">
                    Stack Details
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeLayer.badges.map((badge, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-border-default/80 bg-white/72 px-3 py-1.5 font-mono text-[11px] text-tertiary"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
</div>
</section>
  );
}
