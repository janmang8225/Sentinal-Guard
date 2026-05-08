import { NextRequest, NextResponse } from 'next/server';
import { getWatcherHttpUrl, mapWatcherAlert, type WatcherAlertRow } from '@/lib/watcher';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const rule = searchParams.get('rule_triggered');
  const minSeverity = parseInt(searchParams.get('min_severity') ?? '0');

  try {
    const upstream = await fetch(`${getWatcherHttpUrl()}/alerts?limit=500`, { cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Watcher alerts request failed' }, { status: upstream.status });
    }

    const rows = (await upstream.json()) as WatcherAlertRow[];
    const filtered = rows
      .map(mapWatcherAlert)
      .filter((alert) => alert.severity >= minSeverity)
      .filter((alert) => !rule || alert.rule_triggered === rule);

    return NextResponse.json({
      alerts: filtered.slice(offset, offset + limit),
      total: filtered.length,
    });
  } catch {
    return NextResponse.json({ alerts: [], total: 0, error: 'Watcher unavailable' }, { status: 503 });
  }
}
