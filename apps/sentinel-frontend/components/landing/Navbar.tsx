'use client';

import { useState } from 'react';
import { ArrowUpRight, Menu, Shield, X } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border-default bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="text-brand-primary" fill="currentColor" size={24} />
          <span className="font-display text-xl font-semibold text-primary">SentinelGuard</span>
        </div>

        <div className="hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href="#" className="text-secondary/80 transition-colors duration-200 hover:text-primary">
            Documentation
          </Link>
          <Link href="#" className="text-secondary/80 transition-colors duration-200 hover:text-primary">
            GitHub
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_14px_36px_rgba(0,0,0,0.22)]"
          >
            <span>Open Dashboard</span>
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <button
          type="button"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-default bg-surface-elevated text-primary transition-colors hover:bg-white/10 md:hidden"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-border-default py-4 md:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="#"
              onClick={() => setIsOpen(false)}
              className="rounded-2xl px-1 py-2 text-base font-medium text-secondary transition-colors hover:text-primary"
            >
              Documentation
            </Link>
            <Link
              href="#"
              onClick={() => setIsOpen(false)}
              className="rounded-2xl px-1 py-2 text-base font-medium text-secondary transition-colors hover:text-primary"
            >
              GitHub
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-5 py-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-all duration-200 hover:bg-brand-dark"
            >
              <span>Open Dashboard</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
