'use client';

import { useEffect, useState } from 'react';
import { Copy, X, Check, Activity, ShieldCheck, ExternalLink } from 'lucide-react';
import RuleBadge from '@/components/shared/RuleBadge';
import SeverityBadge from '@/components/shared/SeverityBadge';
import { formatUSD, getRuleDescription, getRuleTitle, timeAgo, truncateAddress } from '@/lib/utils';
import type { UiAlert } from '@/lib/watcher';
import { motion, AnimatePresence } from 'framer-motion';

export default function AlertModal({ alert, onClose }: { alert: UiAlert | null; onClose: () => void }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const timeline = alert?.timeline?.length
    ? alert.timeline
    : [
        { label: 'Detection triggered', status: 'done' },
        { label: alert?.pause_tx_signature ? 'Pause tx confirmed' : 'Awaiting pause execution', status: alert?.pause_tx_signature ? 'done' : 'pending' },
      ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (alert) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [alert, onClose]);

  const handleCopy = async (text: string, setCopiedState: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {alert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-6" onClick={onClose}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-[#0f172a]/32 backdrop-blur-[3px]"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: '#ffffff' }}
            className="relative w-full max-w-[800px] md:max-h-[88vh] h-[100dvh] md:h-auto md:rounded-[24px] shadow-2xl border-0 md:border md:border-[var(--border-default)] overflow-hidden flex flex-col z-50"
          >
            {/* Header (Sticky) */}
            <div style={{ backgroundColor: '#ffffff' }} className="sticky top-0 z-10 px-6 py-5 border-b border-[var(--border-default)] flex items-start justify-between shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <RuleBadge rule={alert.rule_triggered} />
                  <SeverityBadge severity={alert.severity} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-[22px] md:text-[26px] text-[var(--text-primary)] leading-tight">
                    {getRuleTitle(alert.rule_triggered)}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-[13px] text-[var(--text-secondary)] flex-wrap">
                    <span className="flex items-center gap-1.5">
                      Protocol 
                      <span className="font-mono text-[var(--text-primary)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                        {truncateAddress(alert.protocol_address, 8)}
                      </span>
                    </span>
                    <span className="text-[var(--text-tertiary)] hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5">
                      Slot 
                      <span className="font-mono text-[var(--text-primary)]">#{alert.slot}</span>
                    </span>
                    <span className="text-[var(--text-tertiary)] hidden sm:inline">•</span>
                    <span className="text-[var(--text-tertiary)]">{timeAgo(alert.created_at)}</span>
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors shadow-sm shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-8 overflow-y-auto flex-1 pb-10 md:pb-6">
              
              {/* Alert Overview Cards */}
              <div>
                <h4 className="text-[11px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider mb-3">Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Alert ID */}
                  <div style={{ backgroundColor: '#f0f4ff' }} className="border border-[var(--border-default)] rounded-[12px] p-3.5 group relative hover:border-[var(--border-strong)] transition-colors">
                    <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Alert ID</div>
                    <div className="font-mono text-[13px] text-[var(--text-primary)] truncate pr-6" title={alert.alert_id_hex}>
                      {truncateAddress(alert.alert_id_hex, 8)}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleCopy(alert.alert_id_hex, setCopiedId)} 
                      style={{ backgroundColor: '#f0f4ff' }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity pl-2"
                    >
                       {copiedId ? <Check size={14}/> : <Copy size={14}/>}
                    </button>
                  </div>
                  {/* Severity Score */}
                  <div style={{ backgroundColor: '#f0f4ff' }} className="border border-[var(--border-default)] rounded-[12px] p-3.5 hover:border-[var(--border-strong)] transition-colors">
                    <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Severity Score</div>
                    <div className="text-[14px] font-bold text-[var(--text-primary)]">{alert.severity}/99</div>
                  </div>
                  {/* Est. At Risk */}
                  <div style={{ backgroundColor: '#f0f4ff' }} className="border border-[var(--border-default)] rounded-[12px] p-3.5 hover:border-[var(--border-strong)] transition-colors">
                    <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Est. Funds at Risk</div>
                    <div className="text-[14px] font-bold text-status-paused">{formatUSD(alert.at_risk_amount)}</div>
                  </div>
                  {/* Confidence */}
                  <div style={{ backgroundColor: '#f0f4ff' }} className="border border-[var(--border-default)] rounded-[12px] p-3.5 hover:border-[var(--border-strong)] transition-colors">
                    <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-1">Confidence</div>
                    <div className="text-[14px] font-bold text-[var(--text-primary)]">High (92%)</div>
                  </div>
                </div>
              </div>

              {/* Detection Summary */}
              <div>
                <h4 className="text-[11px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider mb-3">Detection Summary</h4>
                <div style={{ backgroundColor: '#eef1f8' }} className="border border-[var(--border-default)] rounded-[16px] p-5 shadow-sm">
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                    {getRuleDescription(alert.rule_triggered, alert.severity)}
                  </p>
                  <div className="mt-4 pt-4 border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-4">
                     <div className="flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
                       Status: 
                       <div className="flex items-center gap-1.5 px-2 py-1 bg-status-active/10 text-status-active rounded text-[12px] font-medium border border-status-active/20">
                         <ShieldCheck size={14} /> Confirmed Threat
                       </div>
                     </div>
                     <div className="text-[13px] text-[var(--text-tertiary)] font-mono">
                       {new Date(alert.created_at).toUTCString()}
                     </div>
                  </div>
                </div>
              </div>

              {/* Activity Feed / Timeline */}
              <div>
                <h4 className="text-[11px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider mb-4">Activity Feed</h4>
                <div className="relative pl-6 space-y-8 before:absolute before:inset-y-3 before:left-[11px] before:w-px before:bg-[var(--border-strong)] before:border-l before:border-dashed">
                  {timeline.map((entry, index) => {
                    const isDone = entry.status === 'done';
                    const isPauseStep = /pause/i.test(entry.label);

                    return (
                      <div key={`${entry.label}-${index}`} className="relative group">
                        <div style={{ backgroundColor: '#ffffff' }} className={`absolute -left-[30px] top-0.5 p-1 rounded-full border shadow-sm group-hover:scale-110 transition-transform ${isDone ? 'border-status-paused' : 'border-[var(--border-strong)]'}`}>
                          <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-status-paused' : 'bg-[var(--border-strong)]'}`} />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                          <div className="w-full">
                            <div className={`text-[14px] font-bold mb-0.5 ${isDone ? 'text-status-paused' : 'text-[var(--text-secondary)]'}`}>
                              {entry.label}
                            </div>
                            <div className="text-[13px] text-[var(--text-tertiary)]">
                              {index === 0
                                ? <>Watcher engine triggered <span className="font-mono text-[var(--text-secondary)]">{alert.rule_triggered}</span> rule.</>
                                : isPauseStep && alert.pause_tx_signature
                                ? 'Sentinel executed emergency pause via authority.'
                                : isPauseStep
                                ? 'Awaiting confirmation to execute pause.'
                                : `Step status: ${entry.status}.`}
                            </div>
                          </div>
                          <span style={{ backgroundColor: '#f0f4ff' }} className="text-[12px] text-[var(--text-tertiary)] font-mono shrink-0 px-2 py-0.5 rounded border border-[var(--border-default)] mt-1 sm:mt-0 self-start">
                            {index === 0 ? new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : entry.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {alert.pause_tx_signature && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase text-[var(--text-tertiary)] tracking-wider mb-3">On-Chain Pause Transaction</h4>
                  <div style={{ backgroundColor: '#eef1f8' }} className="border border-[var(--border-default)] rounded-[16px] p-5 shadow-sm">
                    <div style={{ backgroundColor: '#f0f4ff' }} className="border border-[var(--border-default)] rounded-[12px] p-3.5 flex flex-wrap items-center justify-between gap-3 group/tx hover:border-[var(--border-strong)] transition-colors">
                      <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: '#eef1f8' }} className="w-8 h-8 rounded-full border border-[var(--border-default)] flex items-center justify-center shrink-0">
                          <Activity size={14} className="text-brand-primary" />
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-[var(--text-tertiary)] mb-0.5">Pause Transaction Signature</div>
                          <div className="font-mono text-[13px] text-[var(--text-primary)] break-all">{alert.pause_tx_signature}</div>
                        </div>
                      </div>
                      <div style={{ backgroundColor: '#eef1f8' }} className="flex items-center gap-1.5 p-1 rounded-lg border border-[var(--border-default)]">
                        <button
                          type="button"
                          onClick={() => handleCopy(alert.pause_tx_signature!, setCopiedTx)}
                          style={{ backgroundColor: copiedTx ? '#eef1f8' : 'transparent' }}
                          className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[#f0f4ff] transition-colors"
                          title="Copy signature"
                        >
                          {copiedTx ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        {(alert.explorer_url || alert.tx_url) && (
                          <>
                            <div className="w-px h-4 bg-[var(--border-default)] mx-0.5"></div>
                            <a
                              href={alert.explorer_url ?? alert.tx_url ?? undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-brand-primary hover:bg-[#f0f4ff] transition-colors"
                              title="View on Explorer"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    {(alert.explorer_url || alert.tx_url) && (
                      <div className="mt-3 text-[13px]">
                        <a
                          href={alert.explorer_url ?? alert.tx_url ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-brand-primary underline hover:text-brand-dark transition-colors break-all"
                        >
                          {alert.explorer_url ?? alert.tx_url}
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
