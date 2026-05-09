import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

function mapAlert(alert: any) {
  const tx =
    alert.on_chain_tx &&
    alert.on_chain_tx.trim() !== ''
      ? alert.on_chain_tx
      : null;

  const hasPauseTx = !!tx;

  const severityLabel =
    alert.severity >= 80
      ? 'HIGH'
      : alert.severity >= 60
      ? 'MEDIUM'
      : 'LOW';

  const explorerUrl = tx
    ? `https://explorer.solana.com/tx/${tx}?cluster=devnet`
    : null;

  const ruleLabel =
    alert.rule_triggered ===
    'FLASH_LOAN_DRAIN'
      ? 'Flash Loan + Drain'
      : 'TVL Velocity Drop';

  return {
    id: alert.id,

    alert_id_hex:
      alert.alert_id_hex,

    protocol:
      alert.protocol,

    severity:
      alert.severity,

    severity_label:
      severityLabel,

    rule_triggered:
      alert.rule_triggered,

    rule_label:
      ruleLabel,

    slot:
      alert.slot,

    at_risk_amount:
      Number(
        alert.estimated_at_risk_usd ?? 0
      ),

    estimated_at_risk_usd:
      Number(
        alert.estimated_at_risk_usd ?? 0
      ),

    created_at:
      alert.created_at,

    status:
      hasPauseTx
        ? 'PAUSED'
        : 'ALERT_ONLY',

    on_chain_tx: tx,

    pause_tx_signature: tx,

    explorer_url:
      explorerUrl,

    tx_url:
      explorerUrl,

    confidence_pct: 92,

    detection_summary:
      alert.rule_triggered ===
      'FLASH_LOAN_DRAIN'
        ? `Flash loan detected followed by rapid TVL drain at slot #${alert.slot}.`
        : `TVL dropped rapidly within a rolling detection window.`,

    timeline: hasPauseTx
      ? [
          {
            label:
              'Detection triggered',
            status: 'done',
          },
          {
            label:
              'Alert emitted',
            status: 'done',
          },
          {
            label:
              'Pause tx sent to Solana',
            status: 'done',
          },
          {
            label:
              'Pause tx confirmed',
            status: 'done',
          },
        ]
      : [
          {
            label:
              'Detection triggered',
            status: 'done',
          },
          {
            label:
              'Alert emitted',
            status: 'done',
          },
          {
            label:
              'Awaiting pause execution',
            status: 'pending',
          },
        ],
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const limit = Math.min(
    parseInt(searchParams.get('limit') ?? '25'),
    500
  );

  const offset = Math.max(
    parseInt(searchParams.get('offset') ?? '0'),
    0
  );

  const minSeverity = parseInt(
    searchParams.get('min_severity') ?? '0'
  );

  const rule =
    searchParams.get('rule_triggered');

  const search =
    searchParams.get('search');

  try {
    let rows;

    if (rule && search) {
      const like = `%${search}%`;

      rows = await sql`
        SELECT *
        FROM public.alerts
        WHERE severity >= ${minSeverity}
          AND rule_triggered = ${rule}
          AND (
            protocol ILIKE ${like}
            OR alert_id_hex ILIKE ${like}
          )
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    } else if (rule) {
      rows = await sql`
        SELECT *
        FROM public.alerts
        WHERE severity >= ${minSeverity}
          AND rule_triggered = ${rule}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    } else if (search) {
      const like = `%${search}%`;

      rows = await sql`
        SELECT *
        FROM public.alerts
        WHERE severity >= ${minSeverity}
          AND (
            protocol ILIKE ${like}
            OR alert_id_hex ILIKE ${like}
          )
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    } else {
      rows = await sql`
        SELECT *
        FROM public.alerts
        WHERE severity >= ${minSeverity}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
    }

    const totalRes = await sql`
      SELECT COUNT(*)::int AS count
      FROM public.alerts
    `;

    return NextResponse.json({
      alerts: rows.map(mapAlert),
      total: totalRes[0]?.count ?? 0,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        alerts: [],
        total: 0,
        error: 'DB unavailable',
      },
      { status: 503 }
    );
  }
}

