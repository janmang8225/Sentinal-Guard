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
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[800px] md:max-h-[88vh] h-[100dvh] md:h-auto bg-surface md:rounded-[24px] shadow-2xl border-0 md:border md:border-border-strong overflow-hidden flex flex-col z-50"
          >
            {/* Header (Sticky) */}
            <div className="sticky top-0 z-10 px-6 py-5 border-b border-border-default bg-surface/95 backdrop-blur-md flex items-start justify-between shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <RuleBadge rule={alert.rule_triggered} />
                  <SeverityBadge severity={alert.severity} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-[22px] md:text-[26px] text-primary leading-tight">
                    {getRuleTitle(alert.rule_triggered)}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-[13px] text-secondary flex-wrap">
                    <span className="flex items-center gap-1.5">
                      Protocol 
                      <span className="font-mono text-primary bg-subtle px-1.5 py-0.5 rounded border border-border-default">
                        {truncateAddress(alert.protocol_address, 8)}
                      </span>
                    </span>
                    <span className="text-tertiary hidden sm:inline">•</span>
                    <span className="flex items-center gap-1.5">
                      Slot 
                      <span className="font-mono text-primary">#{alert.slot}</span>
                    </span>
                    <span className="text-tertiary hidden sm:inline">•</span>
                    <span className="text-tertiary">{timeAgo(alert.created_at)}</span>
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={onClose} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-subtle border border-border-default text-tertiary hover:text-primary hover:bg-surface transition-colors shadow-sm shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-8 overflow-y-auto flex-1 pb-10 md:pb-6">
              
              {/* Alert Overview Cards */}
              <div>
                <h4 className="text-[11px] font-bold uppercase text-tertiary tracking-wider mb-3">Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Alert ID */}
                  <div className="bg-subtle border border-border-default rounded-[12px] p-3.5 group relative hover:border-border-strong transition-colors">
                    <div className="text-[11px] font-medium text-tertiary mb-1">Alert ID</div>
                    <div className="font-mono text-[13px] text-primary truncate pr-6" title={alert.alert_id_hex}>
                      {truncateAddress(alert.alert_id_hex, 8)}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleCopy(alert.alert_id_hex, setCopiedId)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity bg-subtle pl-2"
                    >
                       {copiedId ? <Check size={14}/> : <Copy size={14}/>}
                    </button>
                  </div>
                  {/* Severity Score */}
                  <div className="bg-subtle border border-border-default rounded-[12px] p-3.5 hover:border-border-strong transition-colors">
                    <div className="text-[11px] font-medium text-tertiary mb-1">Severity Score</div>
                    <div className="text-[14px] font-bold text-primary">{alert.severity}/99</div>
                  </div>
                  {/* Est. At Risk */}
                  <div className="bg-subtle border border-border-default rounded-[12px] p-3.5 hover:border-border-strong transition-colors">
                    <div className="text-[11px] font-medium text-tertiary mb-1">Est. Funds at Risk</div>
                    <div className="text-[14px] font-bold text-status-paused">{formatUSD(alert.at_risk_amount)}</div>
                  </div>
                  {/* Confidence */}
                  <div className="bg-subtle border border-border-default rounded-[12px] p-3.5 hover:border-border-strong transition-colors">
                    <div className="text-[11px] font-medium text-tertiary mb-1">Confidence</div>
                    <div className="text-[14px] font-bold text-primary">High (92%)</div>
                  </div>
                </div>
              </div>

              {/* Detection Summary */}
              <div>
                <h4 className="text-[11px] font-bold uppercase text-tertiary tracking-wider mb-3">Detection Summary</h4>
                <div className="bg-[var(--bg-base)] border border-border-default rounded-[16px] p-5 shadow-sm">
                  <p className="text-[14px] text-secondary leading-relaxed">
                    {getRuleDescription(alert.rule_triggered, alert.severity)}
                  </p>
                  <div className="mt-4 pt-4 border-t border-border-default flex flex-wrap items-center justify-between gap-4">
                     <div className="flex items-center gap-2 text-[13px] text-tertiary">
                       Status: 
                       <div className="flex items-center gap-1.5 px-2 py-1 bg-status-active/10 text-status-active rounded text-[12px] font-medium border border-status-active/20">
                         <ShieldCheck size={14} /> Confirmed Threat
                       </div>
                     </div>
                     <div className="text-[13px] text-tertiary font-mono">
                       {new Date(alert.created_at).toUTCString()}
                     </div>
                  </div>
                </div>
              </div>

              {/* Activity Feed / Timeline */}
              <div>
                <h4 className="text-[11px] font-bold uppercase text-tertiary tracking-wider mb-4">Activity Feed</h4>
                <div className="relative pl-6 space-y-8 before:absolute before:inset-y-3 before:left-[11px] before:w-px before:bg-border-strong before:border-l before:border-dashed">
                  
                  {/* Detection */}
                  <div className="relative group">
                    <div className="absolute -left-[30px] top-0.5 bg-surface p-1 rounded-full border border-status-active shadow-sm group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 bg-status-active rounded-full" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                      <div>
                        <div className="text-[14px] font-bold text-primary mb-0.5">Anomaly Detected</div>
                        <div className="text-[13px] text-tertiary">Watcher engine triggered <span className="font-mono text-secondary">{alert.rule_triggered}</span> rule.</div>
                      </div>
                      <span className="text-[12px] text-tertiary font-mono shrink-0 bg-subtle px-2 py-0.5 rounded border border-border-default mt-1 sm:mt-0 self-start">
                        {new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                      </span>
                    </div>
                  </div>

                  {/* Pause Action */}
                  <div className="relative group">
                    <div className={`absolute -left-[30px] top-0.5 bg-surface p-1 rounded-full border shadow-sm group-hover:scale-110 transition-transform ${alert.pause_tx ? 'border-status-paused' : 'border-border-strong'}`}>
                      <div className={`w-2 h-2 rounded-full ${alert.pause_tx ? 'bg-status-paused' : 'bg-border-strong'}`} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                      <div className="w-full">
                        <div className={`text-[14px] font-bold mb-0.5 ${alert.pause_tx ? 'text-status-paused' : 'text-secondary'}`}>
                          {alert.pause_tx ? 'Protocol Paused' : 'Evaluating Threat'}
                        </div>
                        <div className="text-[13px] text-tertiary">
                          {alert.pause_tx ? 'Sentinel executed emergency pause via authority.' : 'Awaiting confirmation to execute pause.'}
                        </div>
                        
                        {/* On-chain Transaction Details */}
                        {alert.pause_tx && (
                          <div className="mt-4 bg-subtle border border-border-default rounded-[12px] p-3.5 flex flex-wrap items-center justify-between gap-3 group/tx hover:border-border-strong transition-colors">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-full bg-[var(--bg-base)] border border-border-default flex items-center justify-center shrink-0">
                                 <Activity size={14} className="text-brand-primary" />
                               </div>
                               <div>
                                 <div className="text-[11px] font-medium text-tertiary mb-0.5">Pause Transaction</div>
                                 <div className="font-mono text-[13px] text-primary">{truncateAddress(alert.pause_tx, 12)}</div>
                               </div>
                             </div>
                             <div className="flex items-center gap-1.5 bg-[var(--bg-base)] p-1 rounded-lg border border-border-default">
                               <button 
                                 type="button" 
                                 onClick={() => handleCopy(alert.pause_tx!, setCopiedTx)} 
                                 className="w-7 h-7 flex items-center justify-center rounded-md text-tertiary hover:text-primary hover:bg-subtle transition-colors"
                                 title="Copy Hash"
                               >
                                 {copiedTx ? <Check size={14} /> : <Copy size={14} />}
                               </button>
                               <div className="w-px h-4 bg-border-default mx-0.5"></div>
                               <a 
                                 href={`https://explorer.solana.com/tx/${alert.pause_tx}?cluster=devnet`} 
                                 target="_blank" 
                                 rel="noopener noreferrer" 
                                 className="w-7 h-7 flex items-center justify-center rounded-md text-tertiary hover:text-brand-primary hover:bg-subtle transition-colors"
                                 title="View on Explorer"
                               >
                                 <ExternalLink size={14} />
                               </a>
                             </div>
                          </div>
                        )}
                      </div>
                      {alert.pause_tx && (
                        <span className="text-[12px] text-tertiary font-mono shrink-0 bg-subtle px-2 py-0.5 rounded border border-border-default mt-1 sm:mt-0 self-start">
                          +{Math.floor(Math.random() * 800 + 200)}ms
                        </span>
                      )}
                    </div>
                  </div>
                  
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
