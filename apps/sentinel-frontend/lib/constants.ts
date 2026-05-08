export const SENTINEL_PROGRAM_ID = '2Fi9UPVbD77Cr2SerjKkpPtbejYXdaa6D4R3Pjor4kQs';
export const SENTINEL_STATE_PDA  = '2oQ8Z6ua6jCyXxEzGMz4gaENSauY75EY46XUbvyzmt8q';
export const MOCK_PROTOCOL_ID    = 'HyUb8Ffara4byitYExmbjbA37Ja7By8fECpG6dFyg8Ln';
export const VAULT_ADDRESS       = 'GV7CSLJfnj9pTaUkRUAwR3FmUnQRgCpXnqTc9nMk89KV';
export const WATCHER_PUBKEY      = 'EbVbJDyHdwoFZLxK7Ak8M4ta7hvJQthmBaGehd2VYa7m';
export const PROTOCOL_AUTHORITY  = '7NsBpf7U3qQ6mm8gL8VBQ17ybGwnppr3sk96oVaHh3Tc';

export const CONFIRMED_PAUSE_TXS = [
  '3sX4PLsGqo9rhVCZ1vRWRoK9kx7VNkkYfrDmrDnjgNHHawpeK7MqccZxVJesYp8N9XDUyeNYxvoZuCU5rYyet3F8',
  '28wPiUdajetVddnuKq7NHqMVfgRcrYxKccq1E1vAjRuwCsH2LRQDbBRvTi9sz5XuFtPZm7Vk1SYUDARFMAHZMsou',
];

export const RULE_LABELS: Record<string, string> = {
  FLASH_LOAN_DRAIN:     'Flash Loan + Drain',
  TVL_VELOCITY:         'TVL Velocity Drop',
  BRIDGE_OUTFLOW_SPIKE: 'Bridge Outflow Spike',
};

export const SEVERITY_LEVELS = {
  CRITICAL: { min: 90, max: 100, color: 'var(--severity-critical-text)', bg: 'var(--severity-critical-bg)' },
  HIGH:     { min: 75, max: 89,  color: 'var(--severity-high-text)',     bg: 'var(--severity-high-bg)'     },
  MEDIUM:   { min: 60, max: 74,  color: 'var(--severity-medium-text)',   bg: 'var(--severity-medium-bg)'   },
  LOW:      { min:  0, max: 59,  color: 'var(--severity-safe-text)',     bg: 'var(--severity-safe-bg)'     },
};

export const getSeverityLevel = (s: number) => {
  if (s >= 90) return 'CRITICAL';
  if (s >= 75) return 'HIGH';
  if (s >= 60) return 'MEDIUM';
  return 'LOW';
};

export const CONNECTOR_LABELS: Record<number, string> = {
  0: 'WebSocket stream',
  1: 'ParsedTransaction',
  2: 'broadcast channel (10k)',
  3: 'AlertEvent (score >= 60)',
  4: 'webhook / Kafka / WS feed',
};

export const ARCHITECTURE_LAYERS = [
  {
    id: 'solana',
    label: 'SOLANA BLOCKCHAIN',
    sublabel: '~400ms slots · Geyser events',
    color: '#1e3a8a',
    textColor: '#bfdbfe',
    nodeType: 'blockchain' as const,
    stepIndex: 0,
  },
  {
    id: 'grpc',
    label: 'gRPC / WebSocket STREAMS',
    sublabel: 'Yellowstone · Geyser plugin',
    color: '#2563eb',
    textColor: '#dbeafe',
    nodeType: 'stream' as const,
    stepIndex: 1,
  },
  {
    id: 'parser',
    label: 'TRANSACTION PARSER',
    sublabel: 'geyser.rs · Flash detection · 3 methods',
    color: '#3b82f6',
    textColor: '#eff6ff',
    nodeType: 'parser' as const,
    stepIndex: 2,
  },
  {
    id: 'engine',
    label: 'DETECTION ENGINE',
    sublabel: 'engine.rs · R1 · R2 · R3 · Score >= 60',
    color: '#60a5fa',
    textColor: '#1e3a8a',
    nodeType: 'engine' as const,
    stepIndex: 3,
  },
  {
    id: 'responder',
    label: 'RESPONDER SERVICE',
    sublabel: 'pause.rs · webhooks.rs · DB insert',
    color: '#93c5fd',
    textColor: '#1e3a8a',
    nodeType: 'responder' as const,
    stepIndex: 4,
  },
  {
    id: 'dashboard',
    label: 'DASHBOARD & OUTPUTS',
    sublabel: 'Next.js · WS feed · Kafka · REST',
    color: '#bfdbfe',
    textColor: '#1e3a8a',
    nodeType: 'dashboard' as const,
    stepIndex: 5,
  },
];
