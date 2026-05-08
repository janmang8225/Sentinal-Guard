import { NextResponse } from 'next/server';
import { getWatcherHttpUrl } from '@/lib/watcher';

export async function GET() {
  try {
    const upstream = await fetch(`${getWatcherHttpUrl()}/config`, { cache: 'no-store' });
    if (!upstream.ok) {
      return NextResponse.json({ error: 'Watcher config request failed' }, { status: upstream.status });
    }

    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json({ error: 'Watcher unavailable' }, { status: 503 });
  }
}
