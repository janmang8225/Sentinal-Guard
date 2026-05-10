'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  BookOpen,
  ChevronRight,
  Code2,
  Cpu,
  GitCommit,
  HelpCircle,
  PauseCircle,
  Settings2,
  Shield,
  Webhook,
  Waves,
  Zap,
} from 'lucide-react';

type SidebarGroup = {
  label: string;
  items: Array<{
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    href: string;
  }>;
};

const INTRODUCTION_SIDEBAR: SidebarGroup[] = [
  {
    label: 'Getting Started',
    items: [
      { icon: BookOpen, label: 'Introduction', href: '/docs/introduction' },
      { icon: Zap, label: 'Quick Start', href: '/docs/quick-start' },
    ],
  },
  {
    label: 'Core Concepts',
    items: [
      { icon: Shield, label: 'How It Works', href: '/docs/how-it-works' },
      { icon: Cpu, label: 'Detection Rules', href: '/docs/detection-rules' },
      { icon: Code2, label: 'SDK Integration', href: '#' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { icon: Code2, label: 'API Reference', href: '#' },
      { icon: GitCommit, label: 'Changelog', href: '#' },
    ],
  },
];

const QUICKSTART_SIDEBAR: SidebarGroup[] = [
  {
    label: 'Getting Started',
    items: [
      { icon: BookOpen, label: 'Overview', href: '/docs/introduction' },
      { icon: Zap, label: 'Quick Start', href: '/docs/quick-start' },
      { icon: Code2, label: 'Installation', href: '#' },
      { icon: Settings2, label: 'Environment Setup', href: '/docs/quick-start#environment-setup' },
    ],
  },
  {
    label: 'Core Concepts',
    items: [
      { icon: Shield, label: 'How Detection Works', href: '/docs/how-it-works' },
      { icon: Activity, label: 'Rolling Window Engine', href: '#' },
      { icon: Cpu, label: 'Severity Scoring', href: '/docs/detection-rules#severity-model' },
      { icon: Shield, label: 'Alert Lifecycle', href: '#' },
    ],
  },
  {
    label: 'Detection Rules',
    items: [
      { icon: Zap, label: 'Rule 1 — Flash Loan Drain', href: '/docs/detection-rules#flash-loan-drain' },
      { icon: Zap, label: 'Rule 2 — TVL Velocity', href: '/docs/detection-rules#tvl-velocity' },
      { icon: Zap, label: 'Rule 3 — Bridge Spike', href: '/docs/detection-rules#bridge-spike' },
    ],
  },
  {
    label: 'Integration',
    items: [
      { icon: Code2, label: 'SDK Reference', href: '#' },
      { icon: Webhook, label: 'Webhook Setup', href: '#' },
      { icon: Shield, label: 'Protocol Registration', href: '#' },
      { icon: PauseCircle, label: 'On-chain Pause', href: '#' },
    ],
  },
  {
    label: 'API Reference',
    items: [
      { icon: Code2, label: 'REST Endpoints', href: '#' },
      { icon: Waves, label: 'WebSocket Feed', href: '#' },
      { icon: GitCommit, label: 'Alert Schema', href: '#' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { icon: Shield, label: 'Architecture Diagram', href: '/docs/introduction#architecture' },
      { icon: Shield, label: 'Attack Scenarios', href: '#' },
      { icon: HelpCircle, label: 'FAQ', href: '#' },
    ],
  },
];

interface Props {
  onLinkClick: () => void;
  variant: 'introduction' | 'quickstart';
}

export default function DocsSidebar({ onLinkClick, variant }: Props) {
  const pathname = usePathname();
  const groups = variant === 'introduction' ? INTRODUCTION_SIDEBAR : QUICKSTART_SIDEBAR;

  return (
    <div className="flex h-full flex-col px-4 py-6">
      <nav className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 mt-1 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onLinkClick}
                      className={`group flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'border-l-2 border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                          : 'text-[#64748B] hover:bg-[#F8F9FC] hover:text-[#0F172A]'
                      }`}
                    >
                      <Icon
                        size={14}
                        className={
                          isActive ? 'text-[#2563EB]' : 'text-[#94A3B8] group-hover:text-[#64748B]'
                        }
                      />
                      <span className="flex-1">{item.label}</span>
                      {isActive ? <ChevronRight size={12} className="text-[#2563EB]" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-[#EFF6FF] px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#1E40AF]">
            V1.4.2 — Stable
          </span>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
          <p className="text-[12px] font-semibold text-[#0F172A]">Need help?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#64748B]">
            Open an issue or join our community Discord.
          </p>
          <Link
            href="https://github.com/Rudraprajapati2612/Sentinal-Guard/issues"
            target="_blank"
            className="mt-3 block w-full rounded-lg bg-[#2563EB] py-1.5 text-center text-[11px] font-semibold text-white transition hover:bg-[#1D4ED8]"
          >
            Open Issue →
          </Link>
        </div>
      </div>
    </div>
  );
}
