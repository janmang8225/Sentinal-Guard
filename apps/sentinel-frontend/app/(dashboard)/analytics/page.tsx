'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { normalizeUiAlert, type UiAlert, type WatcherStats } from '@/lib/watcher';

const AnalyticsContent = dynamic(() => import('@/components/dashboard/AnalyticsContent'), {
  loading: () => (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-6 gap-[16px]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-surface border border-border-default rounded-[12px] h-[120px] animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="bg-surface border border-border-default rounded-[12px] h-[360px] animate-pulse" />
        <div className="bg-surface border border-border-default rounded-[12px] h-[360px] animate-pulse" />
      </div>
      <div className="bg-surface border border-border-default rounded-[12px] h-[280px] animate-pulse" />
      <div className="bg-surface border border-border-default rounded-[12px] h-[320px] animate-pulse" />
    </div>
  ),
});

export default function AnalyticsPage() {
  const [alerts, setAlerts] = useState<UiAlert[]>([]);
  const [stats, setStats] = useState<WatcherStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/alerts?limit=100').then((r) => r.json()),
      fetch('/api/stats').then((r) => r.json()),
    ])
      .then(([alertsPayload, statsPayload]) => {
        setAlerts(Array.isArray(alertsPayload.alerts) ? alertsPayload.alerts.map(normalizeUiAlert) : []);
        setStats(statsPayload);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="p-10 text-center text-secondary">Loading analytics...</div>;
  }

  return <AnalyticsContent alerts={alerts} stats={stats} />;
}
