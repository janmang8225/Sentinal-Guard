// src/index.ts

export interface Alert {
  id: string;
  protocol: string;
  rule_triggered: string;
  severity: number;
  estimated_at_risk_usd: number;
  on_chain_tx: string | null;
  slot: number;
  created_at: string;
}

export interface SentinelConfig {
  apiUrl?: string;
  wsUrl?: string;
}

const DEFAULT_API = "https://sentinel-guard-three.vercel.app";

export class SentinelClient {
  private apiUrl: string;
  private wsUrl: string;

  constructor(config: SentinelConfig = {}) {
    this.apiUrl = config.apiUrl ?? DEFAULT_API;
    this.wsUrl  = config.wsUrl  ?? DEFAULT_API.replace("https", "wss");
  }

  // Subscribe to live alerts via WebSocket
  subscribe(
    protocolAddress: string,
    onAlert: (alert: Alert) => void
  ): () => void {
    const ws = new WebSocket(`${this.wsUrl}/feed`);

    ws.onmessage = (event) => {
      const alert: Alert = JSON.parse(event.data);
      if (alert.protocol === protocolAddress) {
        onAlert(alert);
      }
    };

    // Return unsubscribe function
    return () => ws.close();
  }

  // Get historical alerts for a protocol
  async getAlerts(protocolAddress: string): Promise<Alert[]> {
    const res = await fetch(
      `${this.apiUrl}/api/alerts?protocol=${protocolAddress}`
    );
    return res.json();
  }

  // Public threat feed — no API key required
  async getThreats(): Promise<Alert[]> {
    const res = await fetch(`${this.apiUrl}/api/alerts`);
    return res.json();
  }

  // Check if a protocol is currently paused
  async isPaused(protocolAddress: string): Promise<boolean> {
    const res = await fetch(
      `${this.apiUrl}/api/protocols/${protocolAddress}`
    );
    const data = await res.json();
    return data.paused ?? false;
  }
}

export default SentinelClient;