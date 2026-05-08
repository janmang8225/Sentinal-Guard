'use client';

import { useState, useEffect, useCallback } from 'react';
import { SENTINEL_STATE_PDA } from '@/lib/constants';
import { Copy, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { timeAgo, truncateAddress } from '@/lib/utils';
import type { ProtocolStatus, WatcherConfig } from '@/lib/watcher';

const CopyableRow = ({ label, value, fullValue }: { label: string; value: string; fullValue: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-b border-border-default pb-4">
      <div className="text-[12px] font-medium text-secondary mb-1.5">{label}</div>
      <div className="flex justify-between items-center group">
        <span className="text-[13px] font-mono text-primary">{value}</span>
        <button onClick={handleCopy} className="flex items-center gap-2">
          {copied ? (
            <span className="text-[11px] font-bold text-[var(--status-active)]">COPIED</span>
          ) : (
            <Copy className="text-tertiary cursor-pointer group-hover:text-primary transition-colors" size={14} />
          )}
        </button>
      </div>
    </div>
  );
};

export default function ControlsPage() {
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  const [config, setConfig] = useState<WatcherConfig | null>(null);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  
  const [unpausing, setUnpausing] = useState(false);
  const [unpaused, setUnpaused] = useState<string | null>(null);
  const [unpauseError, setUnpauseError] = useState<string | null>(null);

  const loadStatus = useCallback(() => {
    Promise.all([
      fetch('/api/protocol-status').then((r) => r.json()),
      fetch('/api/config').then((r) => r.json()),
    ])
      .then(([statusPayload, configPayload]) => {
        if (!statusPayload.error) setStatus(statusPayload);
        if (!configPayload.error) setConfig(configPayload);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadStatus();
    const t = setInterval(loadStatus, 5000);
    return () => clearInterval(t);
  }, [loadStatus]);

  const handleUnpause = async () => {
    setUnpausing(true);
    setUnpauseError(null);
    try {
      const res = await fetch('/api/unpause', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setUnpaused(data.signature);
        loadStatus();
      } else {
        setUnpauseError('Transaction failed. Check RPC connection.');
      }
    } catch {
      setUnpauseError('Network error — is the RPC running?');
    } finally {
      setUnpausing(false);
    }
  };

  const handlePause = () => {
    // Demo manual pause logic placeholder if actually needed
    setShowPauseModal(false);
    setConfirmText('');
  };

  const isPaused = status?.paused ?? false;

  return (
    <>
      <div className="flex gap-[24px] items-start pt-2">
        {/* Left Column: Actions */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="bg-surface border border-border-default rounded-[12px] p-[24px] shadow-[var(--shadow-sm)]">
            <h3 className="font-display font-bold text-[18px] text-primary mb-1">Protocol Controls</h3>
            <p className="text-[13px] text-secondary mb-6">
              Manage the on-chain state of the monitored protocol.
            </p>
            
            <div className="bg-[var(--bg-base)] border border-border-default rounded-xl p-[20px] mb-5 flex gap-12 items-center">
              <div>
                <div className="text-[12px] font-medium text-tertiary mb-1">Current Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-status-paused' : 'bg-status-active'}`} />
                  <span className={`font-bold text-[14px] ${isPaused ? 'text-status-paused' : 'text-status-active'}`}>
                    {isPaused ? 'PAUSED' : 'ACTIVE'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[12px] font-medium text-tertiary mb-1">Pause Count</div>
                <div className="font-bold text-[15px] text-primary">{status?.pause_count ?? 0}</div>
              </div>
              <div>
                <div className="text-[12px] font-medium text-tertiary mb-1">Last Paused</div>
                <div className="text-[14px] text-secondary">
                  {status?.last_pause_ts ? timeAgo(new Date(status.last_pause_ts * 1000).toISOString()) : 'N/A'}
                </div>
              </div>
            </div>

            {unpaused && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-lg text-sm bg-[var(--severity-safe-bg)] border border-[var(--severity-safe-border)] text-[var(--severity-safe-text)]">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold mb-0.5">Protocol unpaused</div>
                  <div className="font-mono text-xs">{unpaused.slice(0, 32)}...</div>
                </div>
              </div>
            )}

            {unpauseError && (
              <div className="mb-4 flex items-start gap-2 p-3 rounded-lg text-sm bg-[var(--severity-critical-bg)] border border-[var(--severity-critical-border)] text-[var(--severity-critical-text)]">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{unpauseError}</span>
              </div>
            )}
            
            {isPaused ? (
              <button 
                onClick={handleUnpause}
                disabled={unpausing}
                className="w-full bg-[var(--severity-safe-dot)] text-white font-bold text-[14px] py-[12px] rounded-[8px] hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2 shadow-sm"
              >
                {unpausing ? 'Sending unpause_withdrawals...' : '⚡ Unpause Protocol — Resume Withdrawals'}
              </button>
            ) : (
              <button 
                onClick={() => setShowPauseModal(true)}
                className="w-full bg-[var(--severity-critical-dot)] text-white font-bold text-[14px] py-[12px] rounded-[8px] hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
              >
                <AlertTriangle size={16} />
                Emergency Pause
              </button>
            )}
          </div>

          <div className="bg-surface border border-border-default rounded-[12px] p-[24px] shadow-[var(--shadow-sm)]">
            <h3 className="font-display font-bold text-[18px] text-primary mb-1">Register New Protocol</h3>
            <p className="text-[13px] text-secondary mb-6">
              Add a new protocol for SentinelGuard to monitor
            </p>
            <form className="space-y-[16px]">
              <div>
                <label className="block text-[13px] font-medium text-primary mb-2">Protocol Authority Pubkey</label>
                <input type="text" className="w-full bg-[var(--bg-base)] border border-border-default rounded-[8px] p-[12px] text-[14px] focus:outline-none focus:ring-[2px] focus:ring-brand-primary transition-shadow font-mono text-tertiary" placeholder="Solana pubkey..." />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-primary mb-2">Watcher Pubkey (pre-filled)</label>
                <input type="text" className="w-full bg-[var(--bg-base)] border border-border-default rounded-[8px] p-[12px] text-[14px] focus:outline-none font-mono text-tertiary" readOnly value={config?.watcher_pubkey ?? "keys/watcher-keypair.json"} />
              </div>
              <button type="button" disabled className="w-full bg-brand-primary text-white font-bold text-[14px] py-[12px] rounded-[8px] mt-[16px] opacity-50 cursor-not-allowed">
                Register Protocol (requires mainnet keypair)
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Config */}
        <div className="w-[340px] shrink-0 bg-surface border border-border-default rounded-[12px] p-[24px] shadow-[var(--shadow-sm)]">
          <h3 className="font-display font-bold text-[16px] text-primary mb-6">Current Config</h3>
          
          <div className="space-y-4">
            <CopyableRow label="Sentinel Program" value={truncateAddress(config?.sentinel_program_id || 'Unavailable', 8)} fullValue={config?.sentinel_program_id || 'Unavailable'} />
            <CopyableRow label="SentinelState PDA" value={truncateAddress(SENTINEL_STATE_PDA, 8)} fullValue={SENTINEL_STATE_PDA} />
            <CopyableRow label="Watcher Pubkey" value={truncateAddress(config?.watcher_pubkey || 'Unavailable', 8)} fullValue={config?.watcher_pubkey || 'Unavailable'} />
            
            <div className="border-b border-border-default pb-4">
              <div className="text-[12px] font-medium text-secondary mb-1.5">Detection Window</div>
              <div className="text-[14px] font-bold text-primary">{config ? `${config.window_size} slots` : 'Unavailable'}</div>
            </div>
            
            <div className="border-b border-border-default pb-4">
              <div className="text-[12px] font-medium text-secondary mb-1.5">TVL Drop Threshold</div>
              <div className="text-[14px] font-bold text-primary">{config ? `${config.tvl_drop_threshold_pct}%` : 'Unavailable'}</div>
            </div>
            
            <div className="border-b border-border-default pb-4">
              <div className="text-[12px] font-medium text-secondary mb-1.5">Min Severity to Pause</div>
              <div className="text-[14px] font-bold text-primary">{config ? config.min_severity_to_pause : 'Unavailable'}</div>
            </div>
            
            <div className="border-b border-border-default pb-4">
              <div className="text-[12px] font-medium text-secondary mb-1.5">Alert Cooldown</div>
              <div className="text-[14px] font-bold text-primary">{config ? `${config.alert_cooldown_secs} seconds` : 'Unavailable'}</div>
            </div>
            
            <div className="pb-2">
              <div className="text-[12px] font-medium text-secondary mb-1.5">Network</div>
              <div className="text-[14px] font-medium text-primary">{config?.network || 'Unavailable'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pause Confirmation Modal */}
      <AnimatePresence>
        {showPauseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
              onClick={() => { setShowPauseModal(false); setConfirmText(''); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-[440px] bg-[var(--bg-surface)] rounded-[16px] shadow-[var(--shadow-lg)] border border-border-default overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border-default flex items-center gap-3 text-[var(--severity-critical-dot)]">
                <AlertTriangle size={20} />
                <h2 className="font-display font-bold text-[18px] text-primary">Emergency Pause</h2>
                <button 
                  onClick={() => { setShowPauseModal(false); setConfirmText(''); }}
                  className="ml-auto text-tertiary hover:text-primary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-[var(--severity-critical-bg)] border border-[var(--severity-critical-border)] p-4 rounded-lg">
                  <p className="text-[14px] text-[var(--severity-critical-text)] font-medium leading-relaxed">
                    This action will immediately halt all protocol operations on-chain. Withdrawals will be blocked until the protocol is manually unpaused.
                  </p>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-primary mb-2">
                    Type <span className="font-mono text-[var(--severity-critical-dot)] bg-[var(--bg-base)] px-1 rounded">pause</span> to confirm
                  </label>
                  <input 
                    type="text" 
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full bg-[var(--bg-base)] border border-border-default rounded-[8px] p-[12px] text-[14px] focus:outline-none focus:ring-[2px] focus:ring-[var(--severity-critical-dot)] transition-shadow font-mono text-primary"
                    placeholder="pause" 
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => { setShowPauseModal(false); setConfirmText(''); }}
                    className="flex-1 bg-surface border border-border-default text-primary font-bold text-[14px] py-[10px] rounded-[8px] hover:bg-subtle transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={confirmText !== 'pause'}
                    onClick={handlePause}
                    className="flex-1 bg-[var(--severity-critical-dot)] text-white font-bold text-[14px] py-[10px] rounded-[8px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-sm"
                  >
                    Execute Pause
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
