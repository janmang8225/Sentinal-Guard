'use client';

import { usePathname } from 'next/navigation';
import { Moon, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

function useLiveCounter(intervalMs = 5000) {
  const [secondsSince, setSecondsSince] = useState(0);

  useEffect(() => {
    // Reset every time a polling cycle fires
    const reset = () => setSecondsSince(0);
    const tick = setInterval(() => setSecondsSince((s) => s + 1), 1000);
    const poll = setInterval(reset, intervalMs);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [intervalMs]);

  if (secondsSince < 5) return 'Just now';
  if (secondsSince < 60) return `Updated ${secondsSince}s ago`;
  return `Updated ${Math.floor(secondsSince / 60)}m ago`;
}

export default function TopBar() {
  const pathname = usePathname();
  let title = 'Dashboard';
  if (pathname.includes('/controls')) title = 'Controls';
  if (pathname.includes('/analytics')) title = 'Analytics';
  if (pathname.includes('/alerts')) title = 'Alert History';

  const liveLabel = useLiveCounter(5000);

  return (
    <div className="h-[72px] border-b border-border-default bg-[var(--bg-base)] flex items-center justify-between px-8 sticky top-0 z-30">
      <h1 className="font-display font-bold text-[22px] text-primary tracking-tight">{title}</h1>

      <div className="flex items-center gap-5">
        {/* Live update counter */}
        <span className="text-[12px] text-tertiary font-medium tabular-nums">{liveLabel}</span>

        {/* Live dot */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-status-active animate-pulse" />
          <span className="text-[12px] font-semibold text-status-active tracking-wide">Live</span>
        </div>

        {/* Dark mode toggle */}
        <button className="w-8 h-8 rounded-lg border border-border-default bg-surface flex items-center justify-center hover:bg-black/5 text-secondary transition-colors shadow-sm">
          <Moon size={16} />
        </button>

        {/* Manual refresh */}
        <button
          className="h-8 px-3 border border-border-default rounded-lg flex items-center gap-2 text-[13px] font-medium text-secondary hover:bg-black/5 transition-colors bg-surface shadow-sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>
    </div>
  );
}
