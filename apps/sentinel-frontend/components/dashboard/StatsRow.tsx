'use client';

import { useEffect, useState } from 'react';
import { Shield, Zap, Lock, Clock } from 'lucide-react';
import type { WatcherStats } from '@/lib/watcher';
import {
  Sparklines,
  SparklinesLine,
  SparklinesSpots,
} from 'react-sparklines';

/* ─── tiny seeded random for stable SSR → CSR sparklines ─── */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeSparkData(base: number, points = 14, seed = 42): number[] {
  const rng = seededRng(seed);
  return Array.from({ length: points }, (_, i) =>
    Math.max(0, base + (rng() - 0.45) * base * 0.4 * (i / points + 0.5))
  );
}

/* ─── Sparkline wrapper ─── */
interface SparkProps {
  data: number[];
  color: string;
}

function TrendSpark({ data, color }: SparkProps) {
  return (
    <Sparklines data={data} limit={14} width={80} height={28} margin={2}>
      <SparklinesLine
        style={{ stroke: color, strokeWidth: 1.8, fill: 'none' }}
      />
      <SparklinesSpots
        size={2.5}
        style={{ stroke: color, strokeWidth: 1, fill: 'white' }}
      />
    </Sparklines>
  );
}

export default function StatsRow() {
  const [stats, setStats] = useState<WatcherStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/stats', { cache: 'no-store' });
        const payload = await response.json();
        if (!cancelled && !payload.error) setStats(payload);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(load, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  const pauseRate = Number(stats?.pause_rate_pct ?? 0).toFixed(1);
  const avgResponseTimeMs = Number(stats?.avg_response_time_ms ?? 0).toFixed(0);
  const avgResponseTimeSparkBase = Number(stats?.avg_response_time_ms ?? 0);

  const cards = stats
    ? [
        {
          title: 'PROTOCOLS MONITORED',
          value: String(stats.protocols_monitored),
          subtitle: 'Live protocols',
          icon: Shield,
          accentColor: 'var(--brand-primary)',
          borderColor: 'transparent',
          sparkData: makeSparkData(stats.protocols_monitored, 14, 1),
          sparkColor: 'var(--brand-primary)',
        },
        {
          title: 'ALERTS (24H)',
          value: String(stats.alerts_24h),
          subtitle: `${Object.keys(stats.by_rule ?? {}).length} active rule types`,
          icon: Zap,
          accentColor: 'var(--severity-critical-dot)',
          borderColor: 'var(--severity-critical-dot)',
          sparkData: makeSparkData(stats.alerts_24h, 14, 7),
          sparkColor: 'var(--severity-critical-dot, #ef4444)',
        },
        {
          title: 'PAUSES EXECUTED',
          value: String(stats.total_pauses_executed),
          subtitle: `${pauseRate}% pause rate`,
          icon: Lock,
          accentColor: 'var(--brand-primary)',
          borderColor: 'var(--brand-primary)',
          sparkData: makeSparkData(stats.total_pauses_executed, 14, 3),
          sparkColor: 'var(--brand-primary)',
        },
        {
          title: 'AVG RESPONSE TIME',
          value: `${avgResponseTimeMs}ms`,
          subtitle: 'Detection to pause',
          icon: Clock,
          accentColor: 'var(--text-tertiary)',
          borderColor: 'transparent',
          sparkData: makeSparkData(avgResponseTimeSparkBase, 14, 11),
          sparkColor: 'var(--text-secondary)',
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-surface border border-border-default rounded-[12px] p-[20px_24px] shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[40px] h-[40px] rounded-[10px] bg-border-default/50" />
              <div className="h-4 w-28 rounded bg-border-default/50" />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="h-9 w-16 rounded bg-border-default/50 mb-2" />
                <div className="h-4 w-24 rounded bg-border-default/50" />
              </div>
              <div className="h-7 w-20 rounded bg-border-default/30" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-surface border border-border-default rounded-[12px] p-6 text-sm text-secondary mb-8">
        Watcher stats are unavailable.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {cards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className="bg-surface border border-border-default rounded-[12px] p-[20px_24px] shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden"
            style={{
              borderTop:
                stat.borderColor !== 'transparent'
                  ? `3px solid ${stat.borderColor}`
                  : undefined,
            }}
          >
            {/* Header row */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-[40px] h-[40px] rounded-[10px] bg-brand-light flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-brand-primary" />
              </div>
              <span className="font-display font-semibold text-[12px] uppercase text-secondary tracking-wide leading-tight">
                {stat.title}
              </span>
            </div>

            {/* Value + sparkline row */}
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="font-display font-bold text-[36px] text-primary leading-none mb-1">
                  {stat.value}
                </div>
                <div className="text-[13px] text-tertiary">{stat.subtitle}</div>
              </div>

              {/* Sparkline — 24 h trend */}
              <div className="flex-shrink-0 opacity-80">
                <TrendSpark data={stat.sparkData} color={stat.sparkColor} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
