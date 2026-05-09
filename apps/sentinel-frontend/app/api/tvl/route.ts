import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const protocol =
    searchParams.get('protocol');

  if (!protocol) {
    return NextResponse.json(
      { error: 'protocol is required' },
      { status: 400 }
    );
  }

  try {
    const rows = await sql`
      SELECT
        slot,
        tvl_usd,
        captured_at
      FROM public.tvl_snapshots
      WHERE protocol = ${protocol}
      ORDER BY captured_at ASC
      LIMIT 100
    `;

    const snapshots = rows.map((r) => ({
      slot: r.slot,
      tvl: Number(r.tvl_usd),
    }));

    return NextResponse.json({
      snapshots,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        snapshots: [],
        error: 'DB unavailable',
      },
      { status: 503 }
    );
  }
}