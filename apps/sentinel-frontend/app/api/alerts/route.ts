import { NextRequest, NextResponse } from 'next/server';
import { getWatcherHttpUrl, mapWatcherAlert, type WatcherAlertRow } from '@/lib/watcher';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const params = new URLSearchParams({
    limit: String(Math.min(parseInt(searchParams.get('limit') ?? '25'), 500)),
    offset: String(Math.max(parseInt(searchParams.get('offset') ?? '0'), 0)),
    min_severity: searchParams.get('min_severity') ?? '0',
  });

  const rule = searchParams.get('rule_triggered');
  if (rule) params.set('rule_triggered', rule);

  const search = searchParams.get('search');
  if (search) params.set('search', search);

  try {
    const upstream = await fetch(`${getWatcherHttpUrl()}/alerts?${params}`, { cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Watcher alerts request failed' }, { status: upstream.status });
    }

    const data = (await upstream.json()) as { alerts: WatcherAlertRow[]; total: number };
    return NextResponse.json({
      alerts: data.alerts.map(mapWatcherAlert),
      total: data.total,
    });
  } catch {
    return NextResponse.json({ alerts: [], total: 0, error: 'Watcher unavailable' }, { status: 503 });
  }
}
