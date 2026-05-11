'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  CartesianGrid,
} from 'recharts';
import { formatUSD, truncateAddress } from '@/lib/utils';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Snapshot {
  slot: number;
  tvl: number;
  alert?: string;
}

export default function TVLChart({ protocol }: { protocol: string }) {
  const [data, setData] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    setError(null);

    try {
      const response = await fetch(`/api/tvl?protocol=${encodeURIComponent(protocol)}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const snapshots = Array.isArray(payload.snapshots) ? payload.snapshots : [];
      setData(snapshots);
      if (snapshots.length === 0) setError('no_data');
    } catch {
      setError('fetch_failed');
      setData([]);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [protocol]);

  useEffect(() => {
    if (!protocol) {
      setTimeout(() => {
        setData([]);
        setLoading(false);
        setError('no_protocol');
      }, 0);
      return;
    }

    setTimeout(() => setLoading(true), 0);
    const timer = setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 5000);
    return () => {
      clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [protocol, load]);

  if (loading) {
    return (
      <div className="bg-surface border border-border-default rounded-[12px] p-6 shadow-[var(--shadow-sm)] h-[360px]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="h-5 w-56 rounded bg-border-default/50 animate-pulse mb-2" />
            <div className="h-4 w-40 rounded bg-border-default/40 animate-pulse" />
          </div>
          <div className="h-8 w-28 rounded-full bg-border-default/40 animate-pulse" />
        </div>
        <div className="h-[240px] w-full rounded-lg bg-border-default/20 animate-pulse relative overflow-hidden">
          {/* Fake chart lines */}
          <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
            <polyline
              points="0,160 80,140 160,100 240,120 320,80 400,60 480,90 560,70 640,40"
              fill="none"
              stroke="var(--brand-primary)"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-default rounded-[12px] p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-200">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="font-display font-semibold text-[18px] text-primary">Protocol TVL — Real-Time Monitor</h2>
          <span className="text-[13px] text-tertiary">
            Watcher TVL history via <code className="font-mono text-[12px]">/api/tvl</code> · Updates every 5s
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-tertiary uppercase tracking-wider">Protocol</span>
          <div className="bg-subtle border border-border-default rounded-full px-3 py-1 font-mono text-[12px] text-primary">
            {truncateAddress(protocol, 6)}
          </div>
        </div>
      </div>

      {error === 'fetch_failed' ? (
        /* ── Hard fetch error ── */
        <div className="h-[280px] flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-3 text-status-paused">
            <AlertTriangle size={22} />
            <span className="text-[14px] font-semibold">Unable to reach watcher TVL endpoint</span>
          </div>
          <p className="text-[13px] text-secondary text-center max-w-xs">
            The watcher may be offline or the <code className="font-mono">/api/tvl</code> route returned an error.
            Check that the watcher process is running and the protocol address is correct.
          </p>
          <button
            onClick={() => void load(true)}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-default bg-surface text-[13px] font-medium text-secondary hover:bg-subtle transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : error === 'no_data' || data.length === 0 ? (
        /* ── No snapshots returned ── */
        <div className="h-[280px] flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-full bg-subtle border border-border-default flex items-center justify-center mb-1">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M4 22 Q10 10 14 14 Q18 18 24 6" stroke="var(--border-default)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="24" cy="6" r="3" fill="var(--border-default)" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-secondary mb-1">No TVL snapshots yet</p>
            <p className="text-[13px] text-tertiary max-w-xs">
              The watcher hasn&apos;t emitted any TVL data for this protocol. Snapshots appear as the watcher
              processes on-chain slots.
            </p>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-default bg-surface text-[13px] font-medium text-secondary hover:bg-subtle transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
            {retrying ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      ) : (
        /* ── Chart ── */
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(37,99,235,0.12)" stopOpacity={1} />
                  <stop offset="95%" stopColor="rgba(37,99,235,0)" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-default)" strokeDasharray="3 3" />
              <XAxis
                dataKey="slot"
                tickFormatter={(v) => `#${v}`}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                dy={10}
              />
              <YAxis
                tickFormatter={(v) => formatUSD(v)}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                dx={-10}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-md)' }}
                labelStyle={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', marginBottom: '8px', fontSize: '12px' }}
                labelFormatter={(v) => `Slot #${v}`}
                formatter={(value: any) => [<span key="val" className="font-medium text-primary text-[14px]">{formatUSD(Number(value))}</span>, 'TVL']}
              />

              {data.filter((point) => point.alert).map((point) => (
                <ReferenceLine
                  key={point.slot}
                  x={point.slot}
                  stroke="var(--status-paused)"
                  strokeDasharray="4 4"
                  label={{
                    position: 'top',
                    value: point.alert === 'FLASH_LOAN_DRAIN' ? 'FLASH ALERT' : point.alert === 'TVL_VELOCITY' ? 'TVL ALERT' : 'ALERT',
                    fill: 'var(--status-paused)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                  }}
                />
              ))}

              <Area type="monotone" dataKey="tvl" fill="url(#tvlGradient)" stroke="none" />
              <Line
                type="monotone"
                dataKey="tvl"
                stroke="var(--brand-primary)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: 'var(--brand-primary)', stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
