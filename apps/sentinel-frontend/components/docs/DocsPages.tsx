import Link from 'next/link';
import {
  BookOpen,
  Check,
  Code2,
  Copy,
  ChevronRight,
  Globe,
  Info,
  Plug,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Zap,
} from 'lucide-react';
import ArchitectureFlow from '@/components/docs/ArchitectureFlow';

type TocItem = { id: string; label: string };

export type DocsPageConfig = {
  toc: TocItem[];
  content: React.ReactNode;
  sidebarVariant: 'introduction' | 'quickstart';
};

function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="mb-6 flex items-center gap-1.5 text-[12px] text-[#94A3B8]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const href =
          item === 'Docs' || item === 'Getting Started' ? '/docs/introduction' : undefined;

        return (
          <span key={`${item}-${index}`} className="flex items-center gap-1.5">
            {href && !isLast ? (
              <Link href={href} className="transition hover:text-[#2563EB]">
                {item}
              </Link>
            ) : (
              <span className={isLast ? 'font-medium text-[#0F172A]' : ''}>{item}</span>
            )}
            {!isLast ? <ChevronRight size={12} /> : null}
          </span>
        );
      })}
    </nav>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="border-b border-[#E2E8F0] pb-3">
      <h2 className="text-[20px] font-semibold tracking-tight text-[#0F172A]">{title}</h2>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-[22px]" aria-hidden="true">
          {icon}
        </span>
        <h3 className="text-[16px] font-semibold text-[#0F172A]">{title}</h3>
      </div>
      <p className="text-[14px] leading-6 text-[#64748B]">{description}</p>
    </div>
  );
}

function TimelineStep({
  time,
  label,
  tone,
}: {
  time: string;
  label: string;
  tone: 'critical' | 'warning' | 'late';
}) {
  const dotColor =
    tone === 'critical' ? 'bg-[#EF4444]' : tone === 'warning' ? 'bg-[#F59E0B]' : 'bg-[#0F172A]';

  return (
    <div className="relative flex min-w-[120px] flex-1 flex-col items-center text-center">
      <span className={`mb-3 h-3 w-3 rounded-full ${dotColor}`} />
      <p className="text-[12px] font-semibold text-[#0F172A]">{time}</p>
      <p className="mt-1 max-w-[120px] text-[12px] leading-5 text-[#64748B]">{label}</p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white px-5 py-5 text-center shadow-sm">
      <p className="text-[28px] font-bold tracking-tight text-[#0F172A]">{value}</p>
      <p className="mt-2 text-[13px] leading-5 text-[#64748B]">{label}</p>
    </div>
  );
}

function NextStepCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[188px] flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition-all duration-200 hover:border-[#2563EB] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
    >
      <div className="mb-1 text-[#2563EB]">{icon}</div>
      <div>
        <p className="text-[15px] font-bold text-[#0F172A]">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">{desc}</p>
      </div>
      <span className="mt-auto text-[13px] font-medium text-[#2563EB] group-hover:underline">
        Read more →
      </span>
    </Link>
  );
}

function SearchPrompt() {
  return (
    <div className="mb-8 hidden md:block">
      <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4 flex-shrink-0 text-[#94A3B8]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="flex-1 text-[14px] text-[#94A3B8]">Search documentation...</span>
        <kbd className="rounded-md border border-[#E2E8F0] bg-[#F8F9FC] px-2 py-1 text-[11px] font-medium text-[#94A3B8]">
          Ctrl K
        </kbd>
      </div>
    </div>
  );
}

function CodeBlock({
  lang,
  filename,
  children,
}: {
  lang: string;
  filename: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] bg-[#0F172A] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#93C5FD]">
          {filename}
        </span>
        <button className="flex items-center gap-1.5 text-[12px] text-[#64748B] transition hover:text-[#E2E8F0]">
          <Copy size={13} />
          Copy
        </button>
      </div>
      <div className="px-6 py-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
          {lang}
        </div>
        <pre className="overflow-x-auto text-[13px] leading-6 text-[#E2E8F0]">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );
}

function RequirementCard({
  icon,
  title,
  subtext,
}: {
  icon: string;
  title: string;
  subtext: string;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-[20px]" aria-hidden="true">
          {icon}
        </span>
        <div>
          <p className="text-[14px] font-semibold text-[#0F172A]">{title}</p>
          <p className="text-[12px] text-[#64748B]">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

function RequirementBadge({ required }: { required: boolean }) {
  return required ? (
    <span className="inline-flex rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[11px] font-medium text-[#15803D]">
      ✅ Yes
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#94A3B8]">
      Optional
    </span>
  );
}

function Feedback() {
  return (
    <div className="mt-10 border-t border-[#E2E8F0] pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-[13px] text-[#64748B]">Was this page helpful?</p>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#475569] transition hover:border-[#CBD5E1] hover:bg-[#F8F9FC]">
            👍 Yes
          </button>
          <button className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#475569] transition hover:border-[#CBD5E1] hover:bg-[#F8F9FC]">
            👎 No
          </button>
        </div>
      </div>
    </div>
  );
}

function IntroContent() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-10">
      <Breadcrumb items={['Docs', 'Getting Started', 'Introduction']} />

      <div className="mb-12">
        <div className="mb-4 inline-flex items-center rounded-full bg-[#EFF6FF] px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
            INTRODUCTION
          </span>
        </div>
        <h1 className="max-w-3xl text-[36px] font-bold tracking-tight text-[#0F172A]">
          What is SentinelGuard?
        </h1>
        <p className="mt-4 max-w-3xl text-[16px] leading-7 text-[#64748B]">
          An autonomous exploit detection and circuit-breaker layer for Solana DeFi — built
          to act in under one slot.
        </p>
      </div>

      <section id="the-problem" data-section className="mb-14 scroll-mt-20">
        <SectionTitle title="The Problem" />
        <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[#64748B]">
          Every major DeFi exploit follows the same pattern. A flash loan is initiated, TVL
          drops across 2-3 transactions, and by the time the protocol team coordinates a
          manual pause, funds are already bridged out. The average response window is 4-22
          minutes. SentinelGuard closes that window to under 400ms.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
          <div className="px-5 py-6 sm:px-6">
            <div className="relative flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-3">
              <div className="absolute top-1.5 left-0 hidden h-px w-full border-t-2 border-dotted border-[#CBD5E1] md:block" />
              <TimelineStep time="T+0s" label='🔴 "Attack begins"' tone="critical" />
              <TimelineStep time="T+8s" label='🔴 "Vault drained"' tone="critical" />
              <TimelineStep time="T+4min" label='🟡 "Team sees Twitter alert"' tone="warning" />
              <TimelineStep time="T+18min" label='🟡 "Multisig submitted"' tone="warning" />
              <TimelineStep time="T+22min" label='⚫ "Funds bridged — too late"' tone="late" />
            </div>
          </div>
          <div className="bg-[#EF4444] px-5 py-3 text-[13px] font-semibold text-white sm:px-6">
            22 minutes. $0 recovered.
          </div>
        </div>
      </section>

      <section id="how-it-fixes-it" data-section className="mb-14 scroll-mt-20">
        <SectionTitle title="How SentinelGuard Fixes It" />
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FeatureCard
            icon="⚡"
            title="Sub-slot Detection"
            description="Watches every transaction via Geyser gRPC stream. Three detection rules score each slot in real time."
          />
          <FeatureCard
            icon="🔒"
            title="Automated On-chain Pause"
            description="When severity exceeds threshold, pause_withdrawals fires on-chain within the same slot. No human needed."
          />
          <FeatureCard
            icon="📡"
            title="Public Threat Feed"
            description="Open WebSocket feed streams live alerts. No API key. Any wallet or aggregator can consume it."
          />
          <FeatureCard
            icon="🔌"
            title="3-line Integration"
            description="Protocols add SentinelGuard via npm SDK. No smart contract rewrite required."
          />
        </div>
      </section>

      <section id="architecture" data-section className="mb-14 scroll-mt-20">
        <SectionTitle title="Architecture at a Glance" />
        <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[#64748B]">
          SentinelGuard turns raw Solana transaction data into threat scoring, automated
          defense, and public alert distribution through a single low-latency pipeline.
        </p>
        <div className="mt-6">
          <ArchitectureFlow />
        </div>
      </section>

      <section id="real-world-reference" data-section className="mb-14 scroll-mt-20">
        <SectionTitle title="Real World Reference" />
        <div className="mt-6 rounded-2xl border-l-4 border-l-[#2563EB] bg-white p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="mt-0.5 flex-shrink-0 text-[#2563EB]" />
            <p className="text-[15px] leading-7 text-[#475569]">
              On April 1st 2026, Drift Protocol lost $232M in a drain that ran across
              ~12 transactions over ~8 seconds. SentinelGuard would have detected it after
              transaction 2-3 and paused withdrawals before transaction 4 fired.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard value="70-80%" label="Estimated funds that could have been saved" />
          <StatCard value="400ms" label="Time from detection to on-chain pause" />
          <StatCard value="Tx 2-3" label="When detection would have triggered" />
        </div>
      </section>

      <section id="next-steps" data-section className="scroll-mt-20">
        <SectionTitle title="Next Steps" />
        <p className="mt-3 text-[14px] leading-7 text-[#64748B]">
          Continue from the architecture overview into setup, rule logic, or protocol integration.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NextStepCard
            href="/docs/quick-start"
            icon={<Zap size={24} aria-hidden="true" />}
            title="Quick Start"
            desc="Move from concept to a local running instance and attack simulation."
          />
          <NextStepCard
            href="/docs/detection-rules"
            icon={<Siren size={24} aria-hidden="true" />}
            title="Detection Rules"
            desc="See how Rule 1, Rule 2, and Rule 3 assign severity in real time."
          />
          <NextStepCard
            href="/docs/how-it-works"
            icon={<Plug size={24} aria-hidden="true" />}
            title="How It Works"
            desc="Follow the full monitoring-to-response lifecycle inside the platform."
          />
        </div>
      </section>
    </article>
  );
}

function QuickStartContent() {
  return (
    <article className="mx-auto max-w-[720px] px-6 py-12">
      <SearchPrompt />

      <nav className="mb-4 text-[13px] text-[#94A3B8]">Getting Started / Quick Start</nav>

      <div className="mb-8">
        <h1 className="text-[36px] font-bold tracking-tight text-[#0F172A]">Quick Start</h1>
        <p className="mt-3 text-[16px] leading-7 text-[#64748B]">
          Get SentinelGuard monitoring your Solana DeFi protocol in under 5 minutes.
        </p>
      </div>

      <div className="mb-10 border-b border-[#E2E8F0]" />

      <section id="prerequisites" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="Prerequisites" />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <RequirementCard icon="🦀" title="Rust 1.75+" subtext="cargo installed" />
          <RequirementCard icon="📦" title="Bun 1.0+" subtext="or Node 18+" />
          <RequirementCard icon="⚓" title="Anchor CLI 0.31" subtext="for program deploy" />
        </div>
      </section>

      <section id="clone-and-install" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="1. Clone and Install" />
        <div className="mt-5">
          <CodeBlock lang="bash" filename="terminal">
            <span className="text-[#64748B]"># Clone the monorepo</span>{'\n'}
            <span className="text-[#93C5FD]">git clone https://github.com/Rudraprajapati2612/sentinel-guard</span>{'\n'}
            <span className="text-[#93C5FD]">cd sentinel-guard</span>{'\n'}
            {'\n'}
            <span className="text-[#64748B]"># Install JS dependencies</span>{'\n'}
            <span className="text-[#93C5FD]">bun install</span>{'\n'}
            {'\n'}
            <span className="text-[#64748B]"># Build Rust workspace</span>{'\n'}
            <span className="text-[#93C5FD]">cargo build --release</span>
          </CodeBlock>
        </div>
      </section>

      <section id="environment-setup" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="2. Environment Setup" />
        <p className="mt-4 text-[14px] leading-7 text-[#64748B]">
          Copy the example env file and fill in your keys.
        </p>
        <div className="mt-4">
          <CodeBlock lang="bash" filename="terminal">
            <span className="text-[#93C5FD]">cp watcher/.env.example watcher/.env</span>
          </CodeBlock>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full border-collapse text-left">
            <thead className="bg-white">
              <tr className="border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Variable</th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Required</th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['HELIUS_API_KEY', true, 'Helius RPC + Geyser access'],
                ['SENTINEL_PROGRAM_ID', true, 'Deployed program address'],
                ['DATABASE_URL', true, 'PostgreSQL connection string'],
                ['REDIS_URL', true, 'Redis for TVL state + cooldowns'],
                ['VAULT_ACCOUNTS', true, 'Comma-separated vault addresses'],
                ['DISCORD_WEBHOOK_URL', false, 'Alert notifications'],
                ['KAFKA_BROKERS', false, 'Durable alert logging'],
                ['MIN_SEVERITY_TO_PAUSE', false, 'Default: 60'],
              ].map(([variable, required, description], index) => (
                <tr
                  key={variable as string}
                  className={`border-b border-[#E2E8F0] last:border-b-0 ${index % 2 === 1 ? 'bg-[#F8F9FC]' : 'bg-white'}`}
                >
                  <td className="px-4 py-3 align-top">
                    <code className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[12px] font-medium text-[#2563EB]">
                      {variable}
                    </code>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <RequirementBadge required={required as boolean} />
                  </td>
                  <td className="px-4 py-3 text-[13px] leading-6 text-[#64748B]">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="start-the-watcher" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="3. Start the Watcher" />
        <div className="mt-5">
          <CodeBlock lang="bash" filename="terminal">
            <span className="text-[#64748B]"># Start infrastructure</span>{'\n'}
            <span className="text-[#93C5FD]">docker compose up -d</span>{'\n'}
            {'\n'}
            <span className="text-[#64748B]"># Run database migrations</span>{'\n'}
            <span className="text-[#93C5FD]">sqlx migrate run</span>{'\n'}
            {'\n'}
            <span className="text-[#64748B]"># Start the watcher</span>{'\n'}
            <span className="text-[#93C5FD]">cargo run --bin watcher</span>
          </CodeBlock>
        </div>

        <div className="mt-5 rounded-lg border-l-4 border-[#22C55E] bg-[#F0FDF4] p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-[#22C55E]" />
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[#166534]">If setup is correct, you&apos;ll see:</p>
              <div className="mt-3 overflow-hidden rounded-[10px] bg-[#0F172A] px-4 py-4">
                <pre className="overflow-x-auto text-[13px] leading-6 text-[#E2E8F0]">
{`╔══════════════════════════════════════╗
║  SentinelGuard — Monitoring Active   ║
║  Protocol: your_protocol_address     ║
║  Vault TVL: $1,200,000 USDC          ║
╚══════════════════════════════════════╝
Geyser connected. Watching 1 program.`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="test-with-simulation" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="4. Test with Attack Simulation" />
        <p className="mt-4 text-[14px] leading-7 text-[#64748B]">
          Run the included attack scenarios to verify detection is working.
        </p>
        <div className="mt-4">
          <CodeBlock lang="bash" filename="terminal">
            <span className="text-[#93C5FD]">bun run tests/attack_scenarios.ts</span>
          </CodeBlock>
        </div>
        <div className="mt-5 rounded-lg border-l-4 border-[#2563EB] bg-[#EFF6FF] p-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 flex-shrink-0 text-[#2563EB]" />
            <p className="text-[14px] leading-7 text-[#1E40AF]">
              Scenario 13 is the recommended demo scenario — it shows a drain attack being detected
              and the vault paused on-chain before the attacker can withdraw.
            </p>
          </div>
        </div>
      </section>

      <section id="next-steps" data-section className="scroll-mt-20">
        <SectionTitle title="Next Steps" />
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <NextStepCard
            href="/docs/detection-rules"
            icon={<Zap size={24} aria-hidden="true" />}
            title="Detection Rules"
            desc="Understand how Rule 1, 2, and 3 score transactions"
          />
          <NextStepCard
            href="#"
            icon={<Plug size={24} aria-hidden="true" />}
            title="SDK Integration"
            desc="Add SentinelGuard to your protocol in 3 lines"
          />
          <NextStepCard
            href="#"
            icon={<Globe size={24} aria-hidden="true" />}
            title="Public Threat Feed"
            desc="Consume live alerts with no API key required"
          />
        </div>
      </section>

      <Feedback />
    </article>
  );
}

function HowItWorksContent() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-10">
      <Breadcrumb items={['Docs', 'Core Concepts', 'How Detection Works']} />

      <div className="mb-12">
        <div className="mb-4 inline-flex items-center rounded-full bg-[#EFF6FF] px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
            HOW IT WORKS
          </span>
        </div>
        <h1 className="max-w-3xl text-[32px] font-bold tracking-tight text-[#0F172A]">
          Detection, Scoring, and Response
        </h1>
        <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[#64748B]">
          SentinelGuard moves from raw transaction to on-chain pause inside a single Solana slot
          — no human in the loop.
        </p>
      </div>

      <section id="signal-intake" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="Signal Intake" />
        <div className="mt-4 space-y-4">
          <p className="text-[14px] leading-7 text-[#64748B]">
            The watcher subscribes to Solana transaction activity via Helius Geyser gRPC. Every
            slot fires a callback. Each transaction is parsed into a ParsedTransaction struct
            containing token deltas, program IDs, log messages, and signer addresses.
          </p>
          <CodeBlock lang="rust" filename="parsed_transaction.rs">
            <span className="text-[#93C5FD]">struct</span>{' '}
            <span className="text-[#E2E8F0]">ParsedTransaction</span>{' '}
            <span className="text-[#E2E8F0]">{'{'}</span>{'\n'}
            {'    '}<span className="text-[#E2E8F0]">signature</span>: <span className="text-[#93C5FD]">String</span>,{'\n'}
            {'    '}<span className="text-[#E2E8F0]">slot</span>: <span className="text-[#93C5FD]">u64</span>,{'\n'}
            {'    '}<span className="text-[#E2E8F0]">program_ids</span>: <span className="text-[#93C5FD]">Vec</span>&lt;<span className="text-[#E2E8F0]">Pubkey</span>&gt;,{'\n'}
            {'    '}<span className="text-[#E2E8F0]">log_messages</span>: <span className="text-[#93C5FD]">Vec</span>&lt;<span className="text-[#93C5FD]">String</span>&gt;,{'\n'}
            {'    '}<span className="text-[#E2E8F0]">token_deltas</span>: <span className="text-[#E2E8F0]">HashMap</span>&lt;<span className="text-[#E2E8F0]">Pubkey</span>, <span className="text-[#93C5FD]">i64</span>&gt;,{'\n'}
            {'    '}<span className="text-[#E2E8F0]">signer</span>: <span className="text-[#E2E8F0]">Option</span>&lt;<span className="text-[#E2E8F0]">Pubkey</span>&gt;,{'\n'}
            <span className="text-[#E2E8F0]">{'}'}</span>
          </CodeBlock>
          <div className="rounded-lg border-l-[3px] border-[#2563EB] bg-[#EFF6FF] p-4">
            <p className="text-[14px] leading-7 text-[#1E40AF]">
              Helius is used as a Geyser-compatible devnet substitute. In production, this would
              be a direct Yellowstone gRPC connection.
            </p>
          </div>
        </div>
      </section>

      <section id="rolling-window-engine" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="Rolling Window Engine" />
        <div className="mt-4 space-y-4">
          <p className="text-[14px] leading-7 text-[#64748B]">
            SentinelGuard maintains a 10-slot rolling window per monitored protocol. Each slot,
            TVL is recalculated from token delta aggregation. The window tracks:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[14px] leading-7 text-[#64748B]">
            <li><span className="font-medium text-[#0F172A]">peak_tvl</span> — highest TVL seen since monitoring started</li>
            <li><span className="font-medium text-[#0F172A]">current_tvl</span> — sum of all token deltas in latest slot</li>
            <li><span className="font-medium text-[#0F172A]">slot_history</span> — ring buffer of last 10 TVL snapshots</li>
            <li><span className="font-medium text-[#0F172A]">bridge_outflow_avg</span> — rolling average of bridge transfers</li>
          </ul>
          <div className="rounded-lg bg-[#F1F5F9] p-4">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
              Key Invariant
            </p>
            <p className="mt-2 text-[14px] leading-7 text-[#475569]">
              TVL baseline is set from first observed slot with activity &gt; $50k. This prevents
              cold-start false positives on protocol initialization.
            </p>
          </div>
        </div>
      </section>

      <section id="detection-rules" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="Detection Rules" />
        <div className="mt-4 space-y-5">
          <p className="text-[14px] leading-7 text-[#64748B]">
            Three rules run simultaneously on every slot. The highest score is used — rules do
            not stack.
          </p>

          <div className="rounded-xl border border-[#E2E8F0] border-l-4 border-l-[#F97316] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#FFF7ED] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F97316]">
                Rule 1
              </span>
              <span className="rounded-md bg-[#F1F5F9] px-2.5 py-1 font-mono text-[11px] text-[#475569]">
                FLASH_LOAN_DRAIN
              </span>
              <span className="ml-auto rounded-full bg-[#FFF7ED] px-2.5 py-1 text-[11px] font-medium text-[#F97316]">
                Score: 40–99
              </span>
            </div>
            <h3 className="mt-4 text-[15px] font-bold text-[#0F172A]">Flash Loan Correlation</h3>
            <p className="mt-2 text-[13px] leading-6 text-[#64748B]">
              Detects flash loan instruction via known program IDs (Solend, Marginfi, Orca) or
              log keywords (&apos;flash_loan&apos;, &apos;FlashLoan&apos;), then checks for TVL drop &gt;15% in
              the same 5-slot window using peak_tvl as baseline.
            </p>
            <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
              Score Formula
            </p>
            <div className="mt-2 inline-flex rounded-md bg-[#F1F5F9] px-3 py-2 font-mono text-[12px] text-[#475569]">
              40 + (drop * 100 * confidence_factor) + same_signer_bonus
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] text-[#64748B]">
                same-slot signer match: +15 bonus
              </span>
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] text-[#64748B]">
                confidence_factor: 0.5 – 1.0
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] border-l-4 border-l-[#EF4444] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#FEF2F2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#EF4444]">
                Rule 2
              </span>
              <span className="rounded-md bg-[#F1F5F9] px-2.5 py-1 font-mono text-[11px] text-[#475569]">
                TVL_VELOCITY
              </span>
              <span className="ml-auto rounded-full bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-medium text-[#EF4444]">
                Score: 75–99
              </span>
            </div>
            <h3 className="mt-4 text-[15px] font-bold text-[#0F172A]">TVL Velocity Drop</h3>
            <p className="mt-2 text-[13px] leading-6 text-[#64748B]">
              TVL drops ≥20% within the last 3 slots regardless of flash loan presence. Guards:
              TVL must be above $50k and absolute drop must exceed $10k to filter low-liquidity
              noise.
            </p>
            <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
              Score Formula
            </p>
            <div className="mt-2 inline-flex rounded-md bg-[#F1F5F9] px-3 py-2 font-mono text-[12px] text-[#475569]">
              75 + (drop - 0.20) * 100
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] text-[#64748B]">
                min TVL: $50,000
              </span>
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11px] text-[#64748B]">
                min abs drop: $10,000
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] border-l-4 border-l-[#8B5CF6] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F5F3FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8B5CF6]">
                Rule 3
              </span>
              <span className="rounded-md bg-[#F1F5F9] px-2.5 py-1 font-mono text-[11px] text-[#475569]">
                BRIDGE_SPIKE
              </span>
              <span className="ml-auto rounded-full bg-[#F5F3FF] px-2.5 py-1 text-[11px] font-medium text-[#8B5CF6]">
                Score: 85–95
              </span>
            </div>
            <h3 className="mt-4 text-[15px] font-bold text-[#0F172A]">Bridge Outflow Spike</h3>
            <p className="mt-2 text-[13px] leading-6 text-[#64748B]">
              Bridge transfer volume exceeds 10x the rolling average in the current slot.
              Designed to catch exfiltration after a drain even if TVL impact is delayed
              cross-chain.
            </p>
            <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
              Score Formula
            </p>
            <div className="mt-2 inline-flex flex-col rounded-md bg-[#F1F5F9] px-3 py-2 font-mono text-[12px] text-[#475569]">
              <span>10–20x multiplier → 85</span>
              <span>20x+ multiplier → 95</span>
            </div>
          </div>
        </div>
      </section>

      <section id="severity-threshold" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="Severity Threshold" />
        <div className="mt-4 space-y-4">
          <p className="text-[14px] leading-7 text-[#64748B]">
            After all three rules evaluate, the watcher compares the highest score against
            MIN_SEVERITY_TO_PAUSE (default: 60). Scores below this are logged but do not trigger
            any action.
          </p>
          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-white">
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Score Range</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Classification</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['40–59', 'LOW', 'Logged to Kafka only', 'bg-white'],
                  ['60–74', 'MEDIUM', 'Alert published, no pause', 'bg-[#FFFBEB]'],
                  ['75–89', 'HIGH', 'Alert + webhook', 'bg-[#FFF7ED]'],
                  ['90–99', 'CRITICAL', 'Alert + webhook + on-chain pause', 'bg-[#FEF2F2]'],
                ].map(([range, classification, action, rowClass]) => (
                  <tr key={range} className={`border-b border-[#E2E8F0] last:border-b-0 ${rowClass}`}>
                    <td className="px-4 py-3 text-[13px] text-[#0F172A]">{range}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-[#0F172A]">{classification}</td>
                    <td className="px-4 py-3 text-[13px] text-[#64748B]">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="alert-lifecycle" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="Alert Lifecycle" />
        <div className="mt-5 space-y-0">
          {[
            [
              '#2563EB',
              'Transaction Received',
              'Geyser stream fires callback. ParsedTransaction built from slot data. Signer, deltas, program IDs extracted.',
            ],
            [
              '#2563EB',
              'Rule Engine Scores',
              'All 3 rules evaluate simultaneously on 10-slot window. Highest score selected. confidence = 0 if score < 40.',
            ],
            [
              '#F97316',
              'Alert Threshold Check',
              'Score compared to MIN_SEVERITY_TO_PAUSE. Redis key checked for cooldown (key: sentinel:cooldown:{protocol}:{rule}). Duplicate suppressed if within 30s window.',
            ],
            [
              '#EF4444',
              'On-chain Pause',
              'pause_withdrawals CPI submitted using watcher keypair. Anchor program validates signer, sets paused = true on SentinelState PDA. Tx confirmed before webhook fires.',
            ],
            [
              '#22C55E',
              'Webhooks + Kafka',
              'Elysia dispatcher fans out to Discord, Circle, Wormhole via Promise.allSettled. Kafka event published with full alert payload for audit trail.',
            ],
          ].map(([color, title, body], index, array) => (
            <div key={title} className="flex gap-4">
              <div className="flex w-5 flex-col items-center">
                <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: color as string }} />
                {index < array.length - 1 ? <div className="mt-2 h-full w-0.5 bg-[#E2E8F0]" /> : null}
              </div>
              <div className="pb-8">
                <h3 className="text-[15px] font-semibold text-[#0F172A]">{title}</h3>
                <p className="mt-2 text-[14px] leading-7 text-[#64748B]">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="automated-defense" data-section className="mb-12 scroll-mt-20">
        <SectionTitle title="Automated Defense" />
        <div className="mt-4 space-y-4">
          <p className="text-[14px] leading-7 text-[#64748B]">
            The on-chain pause is the terminal action. Once paused = true is set on the
            SentinelState PDA, the mock_protocol vault rejects all withdrawal instructions until
            an authorized keypair resets it.
          </p>
          <div className="rounded-lg border-l-[3px] border-[#F59E0B] bg-[#FFFBEB] p-4">
            <p className="text-[14px] leading-7 text-[#92400E]">
              The watcher keypair must be pre-authorized in the Anchor program via the
              authorized_watcher field on SentinelState. Deploying without this set causes all
              pause CPIs to fail silently.
            </p>
          </div>
          <CodeBlock lang="rust" filename="sentinel_state.rs">
            <span className="text-[#64748B]">{'// SentinelState PDA layout'}</span>{'\n'}
            <span className="text-[#93C5FD]">pub struct</span>{' '}
            <span className="text-[#E2E8F0]">SentinelState</span>{' '}
            <span className="text-[#E2E8F0]">{'{'}</span>{'\n'}
            {'    '}<span className="text-[#93C5FD]">pub</span> <span className="text-[#E2E8F0]">paused</span>: <span className="text-[#93C5FD]">bool</span>,{'\n'}
            {'    '}<span className="text-[#93C5FD]">pub</span> <span className="text-[#E2E8F0]">authorized_watcher</span>: <span className="text-[#E2E8F0]">Pubkey</span>,{'\n'}
            {'    '}<span className="text-[#93C5FD]">pub</span> <span className="text-[#E2E8F0]">last_alert_slot</span>: <span className="text-[#93C5FD]">u64</span>,{'\n'}
            {'    '}<span className="text-[#93C5FD]">pub</span> <span className="text-[#E2E8F0]">bump</span>: <span className="text-[#93C5FD]">u8</span>,{'\n'}
            <span className="text-[#E2E8F0]">{'}'}</span>
          </CodeBlock>
        </div>
      </section>

      <section id="next-steps" data-section className="scroll-mt-20">
        <SectionTitle title="Next Steps" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NextStepCard
            href="/docs/detection-rules"
            icon={<Zap size={24} aria-hidden="true" />}
            title="Detection Rules"
            desc="See exact score formulas and guard conditions for all three rules."
          />
          <NextStepCard
            href="#"
            icon={<Code2 size={24} aria-hidden="true" />}
            title="SDK Integration"
            desc="Add SentinelGuard to your protocol in 3 lines."
          />
          <NextStepCard
            href="/docs/how-detection-works#alert-lifecycle"
            icon={<Radar size={24} aria-hidden="true" />}
            title="Alert Lifecycle"
            desc="Full flow from slot event to on-chain pause."
          />
        </div>
      </section>
    </article>
  );
}

function DetectionRulesContent() {
  return (
    <article className="mx-auto max-w-[760px] px-6 py-10">
      <Breadcrumb items={['Docs', 'Core Concepts', 'Detection Rules']} />

      <div className="mb-12">
        <div className="mb-4 inline-flex items-center rounded-full bg-[#EFF6FF] px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
            DETECTION RULES
          </span>
        </div>
        <h1 className="max-w-3xl text-[32px] font-bold tracking-tight text-[#0F172A]">
          The Three Core Detection Rules
        </h1>
        <p className="mt-4 max-w-3xl text-[14px] leading-7 text-[#64748B]">
          SentinelGuard does not rely on a single exploit signature. Three rule families run
          simultaneously per slot — highest score wins. Rules do not stack.
        </p>
      </div>

      <section id="flash-loan-drain" data-section className="mb-14 scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <h2 className="text-[24px] font-bold tracking-tight text-[#0F172A]">
            Rule 1: Flash Loan Drain
          </h2>
          <span className="rounded-md bg-[#F1F5F9] px-3 py-1 font-mono text-[12px] text-[#64748B]">
            FLASH_LOAN_DRAIN
          </span>
        </div>
        <p className="mt-4 text-[14px] leading-7 text-[#64748B]">
          Correlates flash loan program invocation with a TVL drop &gt;15% in the same 5-slot
          window.
        </p>

        <div className="mt-5 rounded-xl border border-[#E2E8F0] border-l-4 border-l-[#F97316] bg-white p-6 shadow-sm">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
            Trigger Conditions
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-[14px] font-semibold text-[#0F172A]">Flash Loan Detected if:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-6 text-[#64748B]">
                <li>
                  Program ID matches known list:
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Solend: So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo</li>
                    <li>Marginfi: MFv2hWf31Z9kbCa1snEPdcgp168vLs2YzvYWZbe83Er</li>
                    <li>Orca: 9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP</li>
                  </ul>
                </li>
                <li>OR log message contains &apos;flash_loan&apos; or &apos;FlashLoan&apos;</li>
              </ul>
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#0F172A]">TVL Drop Check:</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[13px] leading-6 text-[#64748B]">
                <li>Drop &gt; 15% from peak_tvl baseline</li>
                <li>Within same 5-slot window as flash loan detection</li>
                <li>peak_tvl set from highest observed TVL</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-[#0F172A] p-6">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
            Score Formula
          </p>
          <pre className="overflow-x-auto text-[13px] leading-6 text-[#E2E8F0]">
{`base_score = 40
drop_bonus  = tvl_drop_pct * 100 * confidence_factor
signer_bonus = 15  // if flash loan signer == drain signer

final_score = base_score + drop_bonus + signer_bonus

// confidence_factor range: 0.5 – 1.0
// final_score clamped to 99`}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#FFF7ED] px-3 py-1 text-[12px] font-medium text-[#F97316]">
              Score: 40–99
            </span>
            <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-medium text-[#64748B]">
              Window: 5 slots
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] p-5">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
            False Positive Guards
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-6 text-[#64748B]">
            <li>
              Jupiter and Raydium swap program IDs are excluded — legitimate swaps triggered false
              positives in v1.3
            </li>
            <li>
              confidence_factor drops to 0.5 if only log keyword match (no program ID match)
            </li>
            <li>
              same_signer_bonus only applied if signer is non-null and matches across both
              instructions
            </li>
          </ul>
        </div>
      </section>

      <section id="tvl-velocity" data-section className="mb-14 scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <h2 className="text-[24px] font-bold tracking-tight text-[#0F172A]">
            Rule 2: TVL Velocity Drop
          </h2>
          <span className="rounded-md bg-[#F1F5F9] px-3 py-1 font-mono text-[12px] text-[#64748B]">
            TVL_VELOCITY
          </span>
        </div>
        <p className="mt-4 text-[14px] leading-7 text-[#64748B]">
          Fires when TVL drops ≥20% across 3 consecutive slots, independent of flash loan
          detection.
        </p>

        <div className="mt-5 rounded-xl border border-[#E2E8F0] border-l-4 border-l-[#EF4444] bg-white p-6 shadow-sm">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
            Trigger Conditions
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-6 text-[#64748B]">
            <li>tvl_drop_pct &gt;= 0.20 in last 3 slots</li>
            <li>current_tvl &gt; $50,000 (low-liquidity filter)</li>
            <li>absolute_drop &gt; $10,000 (noise floor filter)</li>
            <li>No flash loan required — standalone signal</li>
          </ul>
        </div>

        <div className="mt-5 rounded-xl bg-[#0F172A] p-6">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
            Score Formula
          </p>
          <pre className="overflow-x-auto text-[13px] leading-6 text-[#E2E8F0]">
{`base_score = 75
velocity_bonus = (tvl_drop_pct - 0.20) * 100

final_score = base_score + velocity_bonus
// clamped to 99`}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#FEF2F2] px-3 py-1 text-[12px] font-medium text-[#EF4444]">
              Score: 75–99
            </span>
            <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-medium text-[#64748B]">
              Window: 3 slots
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] p-5">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
            False Positive Guards
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-6 text-[#64748B]">
            <li>Requires TVL &gt; $50k — ignores micro-protocol noise</li>
            <li>Requires absolute drop &gt; $10k regardless of percentage</li>
            <li>Does not trigger on first 3 slots of monitoring (window not yet full)</li>
          </ul>
        </div>
      </section>

      <section id="bridge-spike" data-section className="mb-14 scroll-mt-20">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          <h2 className="text-[24px] font-bold tracking-tight text-[#0F172A]">
            Rule 3: Bridge Outflow Spike
          </h2>
          <span className="rounded-md bg-[#F1F5F9] px-3 py-1 font-mono text-[12px] text-[#64748B]">
            BRIDGE_SPIKE
          </span>
        </div>
        <p className="mt-4 text-[14px] leading-7 text-[#64748B]">
          Flags post-drain exfiltration — outflow volume exceeds 10x the rolling average in the
          current slot.
        </p>

        <div className="mt-5 rounded-xl border border-[#E2E8F0] border-l-4 border-l-[#8B5CF6] bg-white p-6 shadow-sm">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
            Trigger Conditions
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-6 text-[#64748B]">
            <li>bridge_outflow &gt; bridge_outflow_avg * 10</li>
            <li>bridge_outflow_avg computed over last 10 slots</li>
            <li>Catches exfiltration even if TVL impact is delayed</li>
          </ul>
        </div>

        <div className="mt-5 rounded-xl bg-[#0F172A] p-6">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
            Score Formula
          </p>
          <pre className="overflow-x-auto text-[13px] leading-6 text-[#E2E8F0]">
{`if multiplier >= 20:
    score = 95
elif multiplier >= 10:
    score = 85
else:
    score = 0  // rule does not fire`}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#F5F3FF] px-3 py-1 text-[12px] font-medium text-[#8B5CF6]">
              Score: 85–95
            </span>
            <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[12px] font-medium text-[#64748B]">
              Multiplier: 10x+
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] p-5">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
            False Positive Guards
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[13px] leading-6 text-[#64748B]">
            <li>
              bridge_outflow_avg must have at least 5 slots of history before rule activates
            </li>
            <li>
              Zero-outflow baseline slots are included in average to prevent cold-start spikes
            </li>
          </ul>
        </div>
      </section>

      <section id="severity-model" data-section className="scroll-mt-20">
        <SectionTitle title="Severity Model" />
        <p className="mt-4 text-[14px] leading-7 text-[#64748B]">
          After all three rules evaluate, highest score is taken. Score drives classification
          and automated response.
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-white">
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Score</th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Classification</th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">Alert Published</th>
                <th className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">On-chain Pause</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['0–39', 'NONE', 'No', 'No', 'bg-white'],
                ['40–59', 'LOW', 'No', 'No', 'bg-white'],
                ['60–74', 'MEDIUM', 'Yes', 'No', 'bg-[#FFFBEB]'],
                ['75–89', 'HIGH', 'Yes', 'No', 'bg-[#FFF7ED]'],
                ['90–99', 'CRITICAL', 'Yes', 'Yes', 'bg-[#FEF2F2]'],
              ].map(([score, classification, alertPublished, onChainPause, rowClass]) => (
                <tr key={score} className={`border-b border-[#E2E8F0] last:border-b-0 ${rowClass}`}>
                  <td className="px-4 py-3 text-[13px] text-[#0F172A]">{score}</td>
                  <td className="px-4 py-3 text-[13px] font-medium text-[#0F172A]">{classification}</td>
                  <td className="px-4 py-3 text-[13px] text-[#64748B]">{alertPublished}</td>
                  <td className="px-4 py-3 text-[13px] text-[#64748B]">{onChainPause}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-lg border-l-[3px] border-[#2563EB] bg-[#EFF6FF] p-4">
          <p className="text-[14px] leading-7 text-[#1E40AF]">
            MIN_SEVERITY_TO_PAUSE defaults to 60. Set in config/default.toml. Lowering below 60
            significantly increases false positive pause rate in high-volume pools.
          </p>
        </div>

        <div id="next-steps" data-section className="mt-10">
          <SectionTitle title="Next Steps" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NextStepCard
              href="/docs/how-detection-works"
              icon={<Zap size={24} aria-hidden="true" />}
              title="How Detection Works"
              desc="See the full signal intake and rule engine pipeline."
            />
            <NextStepCard
              href="#"
              icon={<Code2 size={24} aria-hidden="true" />}
              title="SDK Integration"
              desc="Wire SentinelGuard into your protocol in 3 lines."
            />
            <NextStepCard
              href="/docs/how-detection-works#alert-lifecycle"
              icon={<Radar size={24} aria-hidden="true" />}
              title="Alert Lifecycle"
              desc="From scored alert to on-chain pause — full flow."
            />
          </div>
        </div>
      </section>
    </article>
  );
}

export const DOCS_PAGES: Record<string, DocsPageConfig> = {
  introduction: {
    sidebarVariant: 'introduction',
    toc: [
      { id: 'the-problem', label: 'The Problem' },
      { id: 'how-it-fixes-it', label: 'How It Fixes It' },
      { id: 'architecture', label: 'Architecture' },
      { id: 'real-world-reference', label: 'Real World Reference' },
      { id: 'next-steps', label: 'Next Steps' },
    ],
    content: <IntroContent />,
  },
  'quick-start': {
    sidebarVariant: 'quickstart',
    toc: [
      { id: 'prerequisites', label: 'Prerequisites' },
      { id: 'clone-and-install', label: 'Clone and Install' },
      { id: 'environment-setup', label: 'Environment Setup' },
      { id: 'start-the-watcher', label: 'Start the Watcher' },
      { id: 'test-with-simulation', label: 'Test with Simulation' },
      { id: 'next-steps', label: 'Next Steps' },
    ],
    content: <QuickStartContent />,
  },
  'how-it-works': {
    sidebarVariant: 'quickstart',
    toc: [
      { id: 'signal-intake', label: 'Signal Intake' },
      { id: 'rolling-window-engine', label: 'Rolling Window Engine' },
      { id: 'detection-rules', label: 'Detection Rules' },
      { id: 'severity-threshold', label: 'Severity Threshold' },
      { id: 'alert-lifecycle', label: 'Alert Lifecycle' },
      { id: 'automated-defense', label: 'Automated Defense' },
      { id: 'next-steps', label: 'Next Steps' },
    ],
    content: <HowItWorksContent />,
  },
  'how-detection-works': {
    sidebarVariant: 'quickstart',
    toc: [
      { id: 'signal-intake', label: 'Signal Intake' },
      { id: 'rolling-window-engine', label: 'Rolling Window Engine' },
      { id: 'detection-rules', label: 'Detection Rules' },
      { id: 'severity-threshold', label: 'Severity Threshold' },
      { id: 'alert-lifecycle', label: 'Alert Lifecycle' },
      { id: 'automated-defense', label: 'Automated Defense' },
      { id: 'next-steps', label: 'Next Steps' },
    ],
    content: <HowItWorksContent />,
  },
  'detection-rules': {
    sidebarVariant: 'quickstart',
    toc: [
      { id: 'flash-loan-drain', label: 'Flash Loan Drain' },
      { id: 'tvl-velocity', label: 'TVL Velocity' },
      { id: 'bridge-spike', label: 'Bridge Spike' },
      { id: 'severity-model', label: 'Severity Model' },
    ],
    content: <DetectionRulesContent />,
  },
};
