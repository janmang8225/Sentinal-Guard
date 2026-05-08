'use client';

import { useEffect, useState, useCallback } from 'react';
import RuleBadge from '@/components/shared/RuleBadge';
import ExplorerLink from '@/components/shared/ExplorerLink';
import SeverityBadge from '@/components/shared/SeverityBadge';
import { formatUSD, timeAgo } from '@/lib/utils';
import type { UiAlert } from '@/lib/watcher';
import { Copy, Check } from 'lucide-react';

interface AlertTableProps {
  onSelect?: (alert: UiAlert) => void;
  rule?: string;
  minSeverity?: number;
  searchTerm?: string;
  pageSize?: number;
}

/** Inline copy-to-clipboard button that shows a checkmark tick briefly */
function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="flex items-center gap-1.5 group/id">
      <span className="font-mono text-tertiary">{id.slice(0, 8)}</span>
      <button
        onClick={(e) => void handleCopy(e)}
        title="Copy full alert ID"
        className="opacity-0 group-hover/id:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--bg-base)] text-tertiary hover:text-secondary"
      >
        {copied ? <Check size={12} className="text-status-active" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

/** Status badge — clear distinction between paused vs alert-only */
function StatusBadge({ status }: { status: string }) {
  if (status === 'PAUSED') {
    return (
      <span className="font-bold text-[10px] tracking-widest px-2 py-0.5 rounded shadow-sm whitespace-nowrap text-[var(--severity-critical-dot)] bg-[var(--severity-critical-bg)] border border-[var(--severity-critical-border)] uppercase">
        PAUSED
      </span>
    );
  }
  // ALERT ONLY = green
  return (
    <span className="font-bold text-[10px] tracking-widest px-2 py-0.5 rounded shadow-sm whitespace-nowrap text-status-active bg-[var(--severity-safe-bg)] border border-[var(--severity-safe-border)] uppercase">
      ALERT ONLY
    </span>
  );
}

export default function AlertTable({ onSelect, rule, minSeverity = 0, searchTerm = '', pageSize = 25 }: AlertTableProps) {
  const [alerts, setAlerts] = useState<UiAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(page * pageSize),
        min_severity: String(minSeverity),
      });

      if (rule) params.set('rule_triggered', rule);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const response = await fetch(`/api/alerts?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();

      setAlerts(Array.isArray(payload.alerts) ? payload.alerts as UiAlert[] : []);
      setTotal(typeof payload.total === 'number' ? payload.total : 0);
    } catch {
      setAlerts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [minSeverity, page, pageSize, rule, searchTerm]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => { setPage(0); }, [rule, minSeverity, pageSize, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="bg-surface border border-[var(--border-default)] rounded-[12px] shadow-[var(--shadow-sm)] flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border-strong [&::-webkit-scrollbar-thumb]:rounded-full">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead className="sticky top-0 z-10 bg-surface shadow-[0_1px_0_var(--border-default)]">
            <tr className="text-[11px] text-tertiary font-bold tracking-wider uppercase">
              <th className="py-3 px-5 whitespace-nowrap">ALERT ID</th>
              <th className="py-3 px-5 whitespace-nowrap">RULE</th>
              <th className="py-3 px-5 whitespace-nowrap">SEVERITY</th>
              <th className="py-3 px-5 whitespace-nowrap">AT RISK</th>
              <th className="py-3 px-5 whitespace-nowrap">SLOT</th>
              <th className="py-3 px-5 whitespace-nowrap">TIME</th>
              <th className="py-3 px-5 whitespace-nowrap">ON-CHAIN TX</th>
              <th className="py-3 px-5 whitespace-nowrap">STATUS</th>
            </tr>
          </thead>
          <tbody className="text-[13px] divide-y divide-[var(--border-default)]">
            {loading ? (
              [...Array(Math.min(pageSize, 8))].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="py-4 px-5">
                    <div className="h-6 rounded bg-[var(--bg-base)] w-full" />
                  </td>
                </tr>
              ))
            ) : alerts.length > 0 ? alerts.map((alert, index) => (
              <tr
                key={alert.id}
                className={`group cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-[var(--bg-base)]' : 'bg-surface'} hover:bg-subtle`}
                onClick={() => onSelect?.(alert)}
              >
                <td className="py-3.5 px-5">
                  <CopyId id={alert.id} />
                </td>
                <td className="py-3.5 px-5"><RuleBadge rule={alert.rule_triggered} /></td>
                <td className="py-3.5 px-5"><SeverityBadge severity={alert.severity} /></td>
                <td className="py-3.5 px-5 font-bold text-primary">{formatUSD(alert.at_risk_amount)}</td>
                <td className="py-3.5 px-5 font-mono text-tertiary">#{alert.slot}</td>
                <td className="py-3.5 px-5 text-secondary">{timeAgo(alert.created_at)}</td>
                <td className="py-3.5 px-5" onClick={(e) => e.stopPropagation()}>
                  {alert.pause_tx ? <ExplorerLink signature={alert.pause_tx} /> : <span className="text-tertiary text-[12px]">Pending</span>}
                </td>
                <td className="py-3.5 px-5">
                  <StatusBadge status={alert.status} />
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-secondary">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-base)] border border-border-default flex items-center justify-center mb-3">
                      <span className="text-tertiary">No alerts</span>
                    </div>
                    <p className="text-[14px] font-medium">No alerts match filters</p>
                    <p className="text-[13px] text-tertiary">Try adjusting your search or severity filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-[var(--border-default)] bg-[var(--bg-base)] flex items-center justify-between shrink-0">
        <span className="text-[12px] text-tertiary font-medium">
          Showing <span className="text-secondary font-bold">{alerts.length}</span> of <span className="text-secondary font-bold">{total}</span> alerts
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((c) => Math.max(0, c - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg border border-border-default bg-surface text-[12px] font-medium disabled:opacity-50 hover:bg-subtle transition-colors shadow-sm"
          >
            Prev
          </button>
          <span className="text-[12px] text-secondary font-medium px-2">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((c) => Math.min(totalPages - 1, c + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-lg border border-border-default bg-surface text-[12px] font-medium disabled:opacity-50 hover:bg-subtle transition-colors shadow-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
