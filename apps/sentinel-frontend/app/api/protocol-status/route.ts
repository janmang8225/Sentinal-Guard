import { NextRequest, NextResponse } from 'next/server';
import { getWatcherHttpUrl } from '@/lib/watcher';

interface WatcherProtocol {
  protocol: string;
  tvl_usd: number;
  paused: boolean;
  pause_count: number;
  last_pause_at: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedProtocol = searchParams.get('protocol');

  try {
    const upstream = await fetch(`${getWatcherHttpUrl()}/protocols`, { cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Watcher protocols request failed' }, { status: upstream.status });
    }

    const protocols = (await upstream.json()) as WatcherProtocol[];
    const selected = requestedProtocol
      ? protocols.find((entry) => entry.protocol === requestedProtocol)
      : protocols[0];

    if (!selected) {
      return NextResponse.json({ error: 'No monitored protocol found' }, { status: 404 });
    }

    return NextResponse.json({
      protocol_address: selected.protocol,
      paused: selected.paused,
      pause_count: selected.pause_count,
      last_pause_ts: selected.last_pause_at ? Math.floor(Date.parse(selected.last_pause_at) / 1000) : 0,
      current_tvl: selected.tvl_usd,
      escrow_balance: 0,
    });
  } catch {
    return NextResponse.json({ error: 'Watcher unavailable' }, { status: 503 });
  }
}
