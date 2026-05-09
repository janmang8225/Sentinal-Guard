const DEFAULT_WATCHER_HTTP_URL = 'http://127.0.0.1:8080';

export function getWatcherHttpUrl(): string {
  return process.env.NEXT_PUBLIC_WATCHER_HTTP_URL ?? DEFAULT_WATCHER_HTTP_URL;
}

export function getWatcherWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WATCHER_WS_URL;
  if (explicit) return explicit;

  const httpUrl = getWatcherHttpUrl();
  if (httpUrl.startsWith('https://')) return httpUrl.replace('https://', 'wss://');
  if (httpUrl.startsWith('http://')) return httpUrl.replace('http://', 'ws://');
  return httpUrl;
}

export interface WatcherAlertRow {
  id?: string;
  alert_id_hex: string;
  protocol?: string;
  protocol_address?: string;
  severity: number;
  rule_triggered: string;
  estimated_at_risk_usd?: number;
  at_risk_amount?: number;
  slot: number;
  on_chain_tx?: string | null;
  pause_tx_signature?: string | null;
  explorer_url?: string | null;
  tx_url?: string | null;
  timeline?: Array<{
    label: string;
    status: string;
  }>;
  status?: string;
  created_at?: string;
  timestamp?: number;
}

export interface AlertTimelineEntry {
  label: string;
  status: string;
}

export interface UiAlert {
  id: string;
  alert_id_hex: string;
  rule_triggered: string;
  severity: number;
  protocol_address: string;
  slot: number;
  at_risk_amount: number;
  on_chain_tx?: string | null;
  pause_tx_signature?: string | null;
  explorer_url?: string | null;
  tx_url?: string | null;
  timeline?: AlertTimelineEntry[];
  status: string;
  created_at: string;
}

export interface ProtocolStatus {
  protocol_address: string;
  paused: boolean;
  pause_count: number;
  last_pause_ts: number;
  current_tvl: number;
  escrow_balance: number;
}

export interface WatcherStats {
  total_alerts: number;
  total_at_risk_usd: number;
  avg_severity: number;
  avg_response_time_ms?: number;
  pause_rate_pct: number;
  total_pauses_executed: number;
  protocols_monitored: number;
  alerts_24h: number;
  by_rule: Record<string, number>;
  severity_buckets: Record<string, number>;
  severity_over_time: Array<{
    timestamp: string;
    severity: number;
    rule: string;
    alert_id_hex: string;
  }>;
}

export interface WatcherConfig {
  watcher_pubkey: string;
  sentinel_program_id: string;
  watched_programs: string[];
  window_size: number;
  tvl_drop_threshold_pct: number;
  bridge_spike_multiplier: number;
  min_severity_to_pause: number;
  min_severity_to_publish: number;
  alert_cooldown_secs: number;
  solana_rpc_url: string;
  network: string;
  kafka_brokers: string;
}

export function normalizeUiAlert(alert: Partial<WatcherAlertRow> & {
  id?: string;
  status?: string;
  protocol?: string;
  protocol_address?: string;
  at_risk_amount?: number;
  estimated_at_risk_usd?: number;
  created_at?: string;
  on_chain_tx?: string | null;
  pause_tx_signature?: string | null;
  explorer_url?: string | null;
  tx_url?: string | null;
  timeline?: Array<{ label: string; status: string }>;
}): UiAlert {
  const createdAt = alert.created_at
    ?? (alert.timestamp ? new Date(alert.timestamp * 1000).toISOString() : new Date().toISOString());
  const pauseTx = alert.pause_tx_signature ?? alert.on_chain_tx ?? null;
  const onChainTx = alert.on_chain_tx ?? pauseTx;

  return {
    id: alert.id ?? alert.alert_id_hex ?? '',
    alert_id_hex: alert.alert_id_hex ?? '',
    rule_triggered: alert.rule_triggered ?? '',
    severity: alert.severity ?? 0,
    protocol_address: alert.protocol_address ?? alert.protocol ?? '',
    slot: alert.slot ?? 0,
    at_risk_amount: alert.at_risk_amount ?? alert.estimated_at_risk_usd ?? 0,
    on_chain_tx: onChainTx,
    pause_tx_signature: pauseTx,
    explorer_url: alert.explorer_url ?? alert.tx_url ?? null,
    tx_url: alert.tx_url ?? alert.explorer_url ?? null,
    timeline: alert.timeline,
    status: alert.status ?? (pauseTx ? 'PAUSED' : 'DETECTED'),
    created_at: createdAt,
  };
}

export function mapWatcherAlert(alert: WatcherAlertRow): UiAlert {
  return normalizeUiAlert(alert);
}
