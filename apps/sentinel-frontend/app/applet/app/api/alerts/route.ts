import { NextResponse } from 'next/server';
import { Alert } from '@/lib/types';

const ALERTS: Alert[] = [
  {
    id: 'a-1',
    rule_triggered: 'FLASH_LOAN_DRAIN',
    severity: 79,
    protocol: 'HyUb8Ffara4byitYExmbjbA37Ja7By8fECpG6dFyg8Ln',
    slot: 12951,
    at_risk_usd: 514500,
    pause_tx_sig: '28wPiUdajetVddnuKq7NHqMVfgRcrYxKccq1E1vAjRuwCsH2LRQDbBRvTi9sz5XuFtPZm7Vk1SYUDARFMAHZMsou',
    status: 'PAUSED',
    created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 mins ago
    time_ago: '3m ago'
  },
  {
    id: 'a-2',
    rule_triggered: 'TVL_VELOCITY',
    severity: 99,
    protocol: 'HyUb8Ffara4byitYExmbjbA37Ja7By8fECpG6dFyg8Ln',
    slot: 12930,
    at_risk_usd: 200000,
    pause_tx_sig: '3sX4PLsGqo9rhVCZ1vRWRoK9kx7VNkkYfrDmrDnjgNHHawpeK7MqccZxVJesYp8N9XDUyeNYxvoZuCU5rYyet3F8',
    status: 'PAUSED',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    time_ago: '1d ago'
  }
];

export async function GET() {
  // Return the alerts
  return NextResponse.json(ALERTS);
}
