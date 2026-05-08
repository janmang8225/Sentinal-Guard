'use client';

import { useEffect, useState } from 'react';
import RuleBadge from '@/components/shared/RuleBadge';
import SeverityBadge from '@/components/shared/SeverityBadge';
import ExplorerLink from '@/components/shared/ExplorerLink';
import { getRuleTitle, timeAgo } from '@/lib/utils';
import { getWatcherWsUrl, mapWatcherAlert, type UiAlert, type WatcherAlertRow } from '@/lib/watcher';

export default function AlertFeed({ onSelect }: { onSelect?: (alert: UiAlert) => void }) {
  const [alerts, setAlerts] = useState<UiAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;

    const loadInitial = async () => {
      try {
        const response = await fetch('/api/alerts?limit=10', { cache: 'no-store' });
        const payload = await response.json();
        if (!closed && Array.isArray(payload.alerts)) {
          setAlerts(payload.alerts);
        }
      } catch {
        if (!closed) {
          setAlerts([]);
        }
      } finally {
        if (!closed) {
          setLoading(false);
        }
      }
    };

    void loadInitial();

    try {
      ws = new WebSocket(`${getWatcherWsUrl()}/feed`);
      ws.onmessage = (event) => {
        try {
          const next = mapWatcherAlert(JSON.parse(event.data) as WatcherAlertRow);
          setAlerts((prev) => {
            const deduped = prev.filter((item) => item.alert_id_hex !== next.alert_id_hex);
            return [next, ...deduped].sort((a, b) => b.slot - a.slot).slice(0, 10);
          });
        } catch {
          // ignore malformed feed events
        }
      };
      ws.onerror = () => {
        setLoading(false);
      };
    } catch {
      setLoading(false);
    }

    return () => {
      closed = true;
      ws?.close();
    };
  }, []);

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--severity-critical-dot)] animate-pulse" />
          <h2 className="font-display font-semibold text-[18px] text-primary">Live Alert Feed</h2>
        </div>
        <span className="text-[13px] text-tertiary">Watcher WebSocket feed with REST bootstrap</span>
      </div>

      <div className="flex-1 space-y-3 max-h-[480px] overflow-y-auto pr-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-surface rounded-xl border border-border-default p-[16px] h-[130px] animate-pulse" />
          ))
        ) : alerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            className="w-full text-left bg-surface rounded-xl border border-border-default shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:bg-[var(--bg-subtle)] transition-all duration-200 p-[16px] flex flex-col gap-3"
            style={{ borderLeft: `4px solid ${alert.severity >= 90 ? 'var(--severity-critical-border)' : alert.severity >= 75 ? 'var(--severity-high-border)' : 'var(--severity-medium-border)'}` }}
            onClick={() => onSelect?.(alert)}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <RuleBadge rule={alert.rule_triggered} />
                <SeverityBadge severity={alert.severity} />
              </div>
              <span className="text-[12px] text-tertiary whitespace-nowrap">{timeAgo(alert.created_at)}</span>
            </div>

            <div>
              <h3 className="font-bold text-[15px] text-primary mb-1">
                {getRuleTitle(alert.rule_triggered)}
              </h3>
              <div className="font-mono text-[13px] text-secondary">
                Slot #{alert.slot} · At risk: ${Math.round(alert.at_risk_amount / 1000)}K USDC
              </div>
              <div className="font-mono text-[13px] text-secondary mt-1">
                On-chain tx: {alert.pause_tx ? <ExplorerLink signature={alert.pause_tx} /> : 'Pending'}
              </div>
            </div>
          </button>
        ))}

        {!loading && alerts.length === 0 && (
          <div className="h-[200px] rounded-[10px] border-2 border-dashed border-border-default bg-surface flex flex-col items-center justify-center text-tertiary">
            <span className="text-[14px]">Watching for threats...</span>
          </div>
        )}
      </div>
    </div>
  );
}
