export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Alert {
  id: string;
  rule_triggered: 'FLASH_LOAN_DRAIN' | 'TVL_VELOCITY' | 'BRIDGE_OUTFLOW_SPIKE';
  severity: number;
  protocol: string;
  slot: number;
  at_risk_usd: number;
  pause_tx_sig: string;
  status: 'PAUSED' | 'ACTIVE';
  created_at: string;
  time_ago: string;
}

export interface TVLSnapshot {
  slot: number;
  tvl_usd: number;
  timestamp: string;
  alert_rule?: string;
}

export interface ProtocolStatus {
  protocol_address: string;
  paused: boolean;
  pause_count: number;
  last_pause_ts: number;
  escrow_balance: number;
  authority: string;
}
