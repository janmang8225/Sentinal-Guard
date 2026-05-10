'use client';

import Link from 'next/link';
import { ArrowUpRight, Shield } from 'lucide-react';

interface Props {
  activeSection: string;
  items: Array<{ id: string; label: string }>;
}

export default function DocsRightNav({ activeSection, items }: Props) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="sticky top-0 py-8 pr-6 pl-2">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#94A3B8]">
        On this page
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => scrollTo(item.id)}
                className={`group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-all duration-150 ${
                  isActive
                    ? 'font-medium text-[#2563EB]'
                    : 'text-[#64748B] hover:text-[#2563EB]'
                }`}
              >
                <span
                  className={`flex-shrink-0 h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                    isActive ? 'bg-[#2563EB] scale-125' : 'bg-[#CBD5E1] group-hover:bg-[#93C5FD]'
                  }`}
                />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Live Demo card */}
      <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={16} className="text-[#2563EB]" fill="currentColor" />
          <span className="text-[13px] font-semibold text-[#0F172A]">Live Demo</span>
        </div>
        <p className="text-[11px] text-[#64748B] leading-relaxed mb-3">
          See SentinelGuard detect a real exploit in action.
        </p>
        <Link
          href="/dashboard"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-[#1D4ED8]"
        >
          Open Dashboard
          <ArrowUpRight size={12} />
        </Link>
      </div>

      {/* Edit this page */}
      <p className="mt-6 text-[11px] text-[#94A3B8]">
        <Link
          href="https://github.com/Rudraprajapati2612/Sentinal-Guard"
          target="_blank"
          className="hover:text-[#2563EB] transition"
        >
          Edit this page ↗
        </Link>
      </p>
    </div>
  );
}
