import { NextResponse } from 'next/server';

// In-memory ring buffer for real-time webhook events from Rust watcher
const recentAlerts: unknown[] = [];

export async function POST(req: Request) {
  try {
    const alert = await req.json();
    recentAlerts.unshift(alert);
    if (recentAlerts.length > 100) recentAlerts.pop();
    console.log('[Webhook] Alert received:', (alert as { alert_id_hex?: string }).alert_id_hex?.slice(0, 16));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ alerts: recentAlerts });
}
