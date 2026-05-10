'use client';

import { useState } from 'react';
import { Shield, Menu, Search, Github, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const NAV_LINKS = [
  { label: 'Overview', href: '/docs/introduction' },
  { label: 'Quick Start', href: '/docs/quick-start' },
  { label: 'API Reference', href: '#' },
  { label: 'Architecture', href: '/docs/introduction#architecture' },
  { label: 'Changelog', href: '#' },
];

interface Props {
  onMenuClick: () => void;
}

export default function DocsNavbar({ onMenuClick }: Props) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        {/* Hamburger (mobile) */}
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] transition hover:bg-[#F1F5F9] md:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Shield size={22} className="text-[#2563EB]" fill="currentColor" />
          <span className="text-[15px] font-semibold text-[#0F172A]">SentinelGuard</span>
        </Link>

        {/* Search bar */}
        <div className="relative flex-1 max-w-md mx-auto hidden sm:block">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all duration-200 bg-[#F8FAFC] ${
              searchFocused ? 'border-[#2563EB] shadow-[0_0_0_3px_rgba(37,99,235,0.1)]' : 'border-[#E2E8F0]'
            }`}
          >
            <Search size={14} className="text-[#94A3B8] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search documentation..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-[13px] text-[#0F172A] outline-none placeholder:text-[#94A3B8]"
            />
            <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#94A3B8]">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* Center Nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-[13px] font-medium text-[#475569] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <Link
            href="https://github.com/Rudraprajapati2612/Sentinal-Guard"
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-[13px] font-medium text-[#475569] transition hover:border-[#CBD5E1] hover:text-[#0F172A]"
          >
            <Github size={14} />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-1.5 text-[13px] font-medium text-white transition hover:bg-[#1D4ED8]"
          >
            <span>Open Dashboard</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </header>
  );
}
