// import { NextRequest, NextResponse } from 'next/server';
// import { getWatcherHttpUrl } from '@/lib/watcher';

// interface WatcherProtocol {
//   protocol: string;
//   tvl_usd: number;
//   paused: boolean;
//   pause_count: number;
//   last_pause_at: string | null;
// }

// export async function GET(req: NextRequest) {
//   const { searchParams } = new URL(req.url);
//   const requestedProtocol = searchParams.get('protocol');

//   try {
//     const upstream = await fetch(`${getWatcherHttpUrl()}/protocols`, { cache: 'no-store' });
//     if (!upstream.ok) {
//       return NextResponse.json({ error: 'Watcher protocols request failed' }, { status: upstream.status });
//     }

//     const protocols = (await upstream.json()) as WatcherProtocol[];
//     const selected = requestedProtocol
//       ? protocols.find((entry) => entry.protocol === requestedProtocol)
//       : protocols[0];

//     if (!selected) {
//       return NextResponse.json({ error: 'No monitored protocol found' }, { status: 404 });
//     }

//     return NextResponse.json({
//       protocol_address: selected.protocol,
//       paused: selected.paused,
//       pause_count: selected.pause_count,
//       last_pause_ts: selected.last_pause_at ? Math.floor(Date.parse(selected.last_pause_at) / 1000) : 0,
//       current_tvl: selected.tvl_usd,
//       escrow_balance: 0,
//     });
//   } catch {
//     return NextResponse.json({ error: 'Watcher unavailable' }, { status: 503 });
//   }
// }

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const requestedProtocol =
    searchParams.get('protocol');

  try {
    const latest =
      requestedProtocol
        ? await sql`
            SELECT *
            FROM public.tvl_snapshots
            WHERE protocol = ${requestedProtocol}
            ORDER BY captured_at DESC
            LIMIT 1
          `
        : await sql`
            SELECT *
            FROM public.tvl_snapshots
            ORDER BY captured_at DESC
            LIMIT 1
          `;

    const protocol = latest[0];

    if (!protocol) {
      return NextResponse.json(
        {
          error:
            'No monitored protocol found',
        },
        { status: 404 }
      );
    }

    const pauses = await sql`
      SELECT
        COUNT(*)::int AS pause_count,
        MAX(created_at) AS last_pause
      FROM public.alerts
      WHERE protocol = ${protocol.protocol}
        AND on_chain_tx IS NOT NULL
        AND on_chain_tx != ''
    `;

    return NextResponse.json({
      protocol_address:
        protocol.protocol,

      paused:
        pauses[0]?.pause_count > 0,

      pause_count:
        pauses[0]?.pause_count ?? 0,

      last_pause_ts:
        pauses[0]?.last_pause
          ? Math.floor(
              new Date(
                pauses[0].last_pause
              ).getTime() / 1000
            )
          : 0,

      current_tvl:
        Number(protocol.tvl_usd),

      escrow_balance: 0,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        error: 'DB unavailable',
      },
      { status: 503 }
    );
  }
}