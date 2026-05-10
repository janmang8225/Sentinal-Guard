import {
  ArrowDown,
  ArrowRight,
  BadgeAlert,
  BellRing,
  Bot,
  Cpu,
  Radar,
  ShieldCheck,
} from 'lucide-react';

type BadgeTone = 'green' | 'blue' | 'orange' | 'gray';

type ArchitectureStage = {
  title: string;
  icon: React.ReactNode;
  badge: string;
  badgeTone: BadgeTone;
  points: string[];
};

const STAGES: ArchitectureStage[] = [
  {
    title: 'Helius Geyser gRPC',
    icon: <Radar size={18} aria-hidden="true" />,
    badge: 'LIVE',
    badgeTone: 'green',
    points: ['Raw Solana transaction stream', 'Real-time slot monitoring'],
  },
  {
    title: 'Rust Watcher Engine',
    icon: <Cpu size={18} aria-hidden="true" />,
    badge: '<400MS',
    badgeTone: 'blue',
    points: [
      'Low-latency detection engine',
      'Flash loan detection',
      'TVL velocity monitoring',
      'Bridge exploit detection',
    ],
  },
  {
    title: 'Threat Analysis',
    icon: <BadgeAlert size={18} aria-hidden="true" />,
    badge: 'SEVERITY 99',
    badgeTone: 'orange',
    points: ['Severity scoring', 'Risk classification', 'Confidence analysis'],
  },
  {
    title: 'Automated Response',
    icon: <ShieldCheck size={18} aria-hidden="true" />,
    badge: 'ACTING',
    badgeTone: 'blue',
    points: ['Emergency pause transaction', 'Discord alerts', 'Webhook notifications'],
  },
  {
    title: 'Public Alert Feed',
    icon: <BellRing size={18} aria-hidden="true" />,
    badge: 'OPEN FEED',
    badgeTone: 'gray',
    points: ['WebSocket stream', 'Dashboard consumers', 'SDK/API integration'],
  },
];

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const toneClass =
    tone === 'green'
      ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]'
      : tone === 'orange'
        ? 'border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]'
        : tone === 'gray'
          ? 'border-[#E2E8F0] bg-[#F8F9FC] text-[#64748B]'
          : 'border-[#DBEAFE] bg-[#EFF6FF] text-[#2563EB]';

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}
    >
      {label}
    </span>
  );
}

function FlowCard({ stage }: { stage: ArchitectureStage }) {
  return (
    <div className="flex min-h-[180px] w-full min-w-[200px] max-w-[280px] flex-col rounded-[12px] border border-[#E2E8F0] bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] text-[#2563EB]">
          {stage.icon}
        </div>
        <Badge label={stage.badge} tone={stage.badgeTone} />
      </div>

      <h3 className="text-[15px] font-bold leading-6 text-[#0F172A]">{stage.title}</h3>

      <ul className="mt-4 space-y-2">
        {stage.points.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-[13px] leading-[1.6] text-[#64748B]">
            <span className="mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#93C5FD]" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerticalConnector() {
  return (
    <div className="flex justify-center py-2 text-[#2563EB]" aria-hidden="true">
      <div className="flex flex-col items-center">
        <div className="h-8 w-0.5 bg-[#2563EB]" />
        <ArrowDown size={16} />
      </div>
    </div>
  );
}

function HorizontalConnector() {
  return (
    <div className="flex w-12 flex-shrink-0 items-center justify-center text-[#2563EB]" aria-hidden="true">
      <div className="flex w-full items-center">
        <div className="h-0.5 flex-1 bg-[#2563EB]" />
        <ArrowRight size={16} className="-ml-0.5" />
      </div>
    </div>
  );
}

export default function ArchitectureFlow() {
  const [helius, watcher, analysis, response, feed] = STAGES;

  return (
    <div className="w-full overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8F9FC] text-[#2563EB]">
          <Bot size={18} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[16px] font-bold text-[#0F172A]">SentinelGuard Architecture Pipeline</p>
          <p className="text-[13px] text-[#64748B]">
            From raw slot activity to automated defense and public distribution.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:hidden">
        {[helius, watcher, analysis, response, feed].map((stage, index) => (
          <div key={stage.title} className="flex flex-col items-center">
            <FlowCard stage={stage} />
            {index < STAGES.length - 1 ? <VerticalConnector /> : null}
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <div className="flex items-stretch justify-center gap-3">
          <FlowCard stage={helius} />
          <HorizontalConnector />
          <FlowCard stage={watcher} />
          <HorizontalConnector />
          <FlowCard stage={analysis} />
        </div>

        <div className="flex justify-center py-4 pr-[292px]">
          <VerticalConnector />
        </div>

        <div className="flex items-stretch justify-center gap-3">
          <FlowCard stage={response} />
          <HorizontalConnector />
          <FlowCard stage={feed} />
        </div>
      </div>
    </div>
  );
}
