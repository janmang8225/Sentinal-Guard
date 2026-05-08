use anyhow::Result;
use chrono::{DateTime, Utc};
use sqlx::{PgPool, postgres::PgPoolOptions, QueryBuilder};
use std::collections::HashMap;
use tracing::info;
use uuid::Uuid;
use serde::Serialize;
use crate::config::Config;

pub type DbPool = PgPool;

// ─── Row types ─────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow, Serialize)]
pub struct AlertRow {
    pub id: Uuid,
    pub alert_id_hex: String,
    pub protocol: String,
    pub severity: i16,
    pub rule_triggered: String,
    pub estimated_at_risk_usd: f64,
    pub trigger_signatures: serde_json::Value,
    pub slot: i64,
    pub watcher_pubkey: String,
    pub on_chain_tx: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct TvlSnapshotRow {
    pub id: Uuid,
    pub protocol: String,
    pub tvl_usd: f64,
    pub slot: i64,
    pub captured_at: DateTime<Utc>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct BridgeOutflowRow {
    pub id: Uuid,
    pub protocol: String,
    pub outflow_usd: f64,
    pub slot: i64,
    pub source_wallet: String,
    pub captured_at: DateTime<Utc>,
}

// ─── Connection ────────────────────────────────────────────

pub async fn connect(cfg: &Config) -> Result<DbPool> {
    let pool = PgPoolOptions::new()
        .max_connections(cfg.db_pool_size)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .idle_timeout(std::time::Duration::from_secs(30))
        .max_lifetime(std::time::Duration::from_secs(300))
        .connect(&cfg.database_url)
        .await?;

    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await?;

    info!("PostgreSQL pool ready ({} max connections)", cfg.db_pool_size);
    Ok(pool)
}

// ─── Writes ────────────────────────────────────────────────

pub async fn insert_alert(
    pool: &DbPool,
    alert: &crate::types::AlertEvent,
) -> Result<Uuid> {
    let id = Uuid::new_v4();
    let trigger_signatures = serde_json::to_value(&alert.trigger_tx_signatures)?;
    let rule_triggered = alert.rule_triggered.to_string();

   sqlx::query(
    r#"
    INSERT INTO alerts (
        id, alert_id_hex, protocol, severity, rule_triggered,
        estimated_at_risk_usd, trigger_signatures, slot, watcher_pubkey
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT DO NOTHING
    "#,
)
    .bind(id)
    .bind(&alert.alert_id_hex)
    .bind(&alert.protocol)
    .bind(alert.severity as i16)
    .bind(rule_triggered.as_str())
    .bind(alert.estimated_at_risk_usd)
    .bind(trigger_signatures)
    .bind(alert.slot as i64)
    .bind(&alert.watcher_pubkey)
    .execute(pool)
    .await?;

    Ok(id)
}

pub async fn update_alert_on_chain_tx(
    pool: &DbPool,
    alert_id_hex: &str,
    tx_signature: &str,
) -> Result<()> {
    sqlx::query!(
        "UPDATE alerts SET on_chain_tx = $1 WHERE alert_id_hex = $2",
        tx_signature,
        alert_id_hex,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_tvl_snapshot(
    pool: &DbPool,
    protocol: &str,
    tvl_usd: f64,
    slot: u64,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO tvl_snapshots (id, protocol, tvl_usd, slot)
        VALUES ($1,$2,$3,$4)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(protocol)
    .bind(tvl_usd)
    .bind(slot as i64)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_bridge_outflow(
    pool: &DbPool,
    protocol: &str,
    outflow_usd: f64,
    slot: u64,
    source_wallet: &str,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO bridge_outflows (id, protocol, outflow_usd, slot, source_wallet)
        VALUES ($1,$2,$3,$4,$5)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(protocol)
    .bind(outflow_usd)
    .bind(slot as i64)
    .bind(source_wallet)
    .execute(pool)
    .await?;

    Ok(())
}

// ─── Reads ────────────────────────────────────────────────

pub async fn get_recent_alerts(
    pool: &DbPool,
    limit: i64,
) -> Result<Vec<AlertRow>> {
    let rows = sqlx::query_as!(
        AlertRow,
        "SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1",
        limit,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

pub async fn get_alerts_for_protocol(
    pool: &DbPool,
    protocol: &str,
    limit: i64,
) -> Result<Vec<AlertRow>> {
    let rows = sqlx::query_as!(
        AlertRow,
        "SELECT * FROM alerts WHERE protocol = $1 ORDER BY created_at DESC LIMIT $2",
        protocol,
        limit,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// ✅ FIXED: proper scalar query
pub async fn get_bridge_outflow_avg(
    pool: &DbPool,
    source_wallet: &str,
    window_minutes: i64,
) -> Result<f64> {
    let avg = sqlx::query_scalar::<_, Option<f64>>(
        r#"
        SELECT AVG(outflow_usd)
        FROM bridge_outflows
        WHERE source_wallet = $1
          AND captured_at > NOW() - make_interval(mins => $2)
        "#
    )
    .bind(source_wallet)
    .bind(window_minutes as i32)
    .fetch_one(pool)
    .await?;

    Ok(avg.unwrap_or(0.0))
}

pub async fn get_tvl_history(
    pool: &DbPool,
    protocol: &str,
    limit: i64,
) -> Result<Vec<TvlSnapshotRow>> {
    let rows = sqlx::query_as!(
        TvlSnapshotRow,
        r#"
        SELECT id, protocol, tvl_usd, slot, captured_at
        FROM tvl_snapshots
        WHERE protocol = $1
        ORDER BY captured_at DESC
        LIMIT $2
        "#,
        protocol,
        limit
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

// ─── Filtered alerts (Problem 1) ──────────────────────────────────────────────

/// Returns (rows, total_count) with all filtering pushed to Postgres.
pub async fn get_alerts_filtered(
    pool: &DbPool,
    limit: i64,
    offset: i64,
    min_severity: i16,
    rule_triggered: Option<&str>,
    search: Option<&str>,
) -> Result<(Vec<AlertRow>, i64)> {
    // ── count ──
    let mut cqb: QueryBuilder<sqlx::Postgres> =
        QueryBuilder::new("SELECT COUNT(*) FROM alerts WHERE severity >= ");
    cqb.push_bind(min_severity);
    if let Some(r) = rule_triggered {
        cqb.push(" AND rule_triggered = ").push_bind(r);
    }
    if let Some(s) = search {
        let pat = format!("%{}%", s);
        cqb.push(" AND (alert_id_hex ILIKE ")
            .push_bind(pat.clone())
            .push(" OR on_chain_tx ILIKE ")
            .push_bind(pat)
            .push(")");
    }
    let total: i64 = cqb.build_query_scalar().fetch_one(pool).await?;

    // ── data ──
    let mut dqb: QueryBuilder<sqlx::Postgres> = QueryBuilder::new(
        "SELECT id, alert_id_hex, protocol, severity, rule_triggered, \
         estimated_at_risk_usd, trigger_signatures, slot, watcher_pubkey, \
         on_chain_tx, created_at FROM alerts WHERE severity >= ",
    );
    dqb.push_bind(min_severity);
    if let Some(r) = rule_triggered {
        dqb.push(" AND rule_triggered = ").push_bind(r);
    }
    if let Some(s) = search {
        let pat = format!("%{}%", s);
        dqb.push(" AND (alert_id_hex ILIKE ")
            .push_bind(pat.clone())
            .push(" OR on_chain_tx ILIKE ")
            .push_bind(pat)
            .push(")");
    }
    dqb.push(" ORDER BY created_at DESC LIMIT ")
        .push_bind(limit)
        .push(" OFFSET ")
        .push_bind(offset);

    let rows: Vec<AlertRow> = dqb.build_query_as().fetch_all(pool).await?;
    Ok((rows, total))
}

// ─── Stats aggregates (Problem 2) ─────────────────────────────────────────────

#[derive(Debug)]
pub struct AlertStatsBasic {
    pub total_alerts: i64,
    pub alerts_24h: i64,
    pub total_at_risk_usd: f64,
    pub avg_severity: f64,
    pub total_pauses: i64,
}

#[derive(Debug, sqlx::FromRow)]
pub struct RuleCount {
    pub rule_triggered: String,
    pub cnt: i64,
}

#[derive(Debug, sqlx::FromRow)]
pub struct SeverityBucketRow {
    pub low: i64,
    pub medium: i64,
    pub high: i64,
    pub critical: i64,
    pub extreme: i64,
}

#[derive(Debug, sqlx::FromRow, Serialize)]
pub struct AlertTimePoint {
    pub created_at: DateTime<Utc>,
    pub severity: i16,
    pub rule_triggered: String,
    pub alert_id_hex: String,
}

pub async fn get_alert_stats_basic(pool: &DbPool) -> Result<AlertStatsBasic> {
    let row = sqlx::query!(
        r#"
        SELECT
            COUNT(*)::bigint                                                            AS "total_alerts!",
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::bigint   AS "alerts_24h!",
            COALESCE(SUM(estimated_at_risk_usd), 0)                                    AS "total_at_risk_usd!: f64",
            COALESCE(AVG(severity::float8), 0)                                         AS "avg_severity!: f64",
            COUNT(*) FILTER (WHERE on_chain_tx IS NOT NULL)::bigint                    AS "total_pauses!"
        FROM alerts
        "#
    )
    .fetch_one(pool)
    .await?;

    Ok(AlertStatsBasic {
        total_alerts: row.total_alerts,
        alerts_24h: row.alerts_24h,
        total_at_risk_usd: row.total_at_risk_usd,
        avg_severity: row.avg_severity,
        total_pauses: row.total_pauses,
    })
}

pub async fn get_alert_stats_by_rule(pool: &DbPool) -> Result<HashMap<String, i64>> {
    let rows = sqlx::query_as!(
        RuleCount,
        r#"SELECT rule_triggered, COUNT(*)::bigint AS "cnt!" FROM alerts GROUP BY rule_triggered"#
    )
    .fetch_all(pool)
    .await?;

    Ok(rows.into_iter().map(|r| (r.rule_triggered, r.cnt)).collect())
}

pub async fn get_alert_stats_buckets(pool: &DbPool) -> Result<SeverityBucketRow> {
    let row = sqlx::query_as!(
        SeverityBucketRow,
        r#"
        SELECT
            COUNT(*) FILTER (WHERE severity < 30)::bigint                         AS "low!",
            COUNT(*) FILTER (WHERE severity >= 30 AND severity < 60)::bigint      AS "medium!",
            COUNT(*) FILTER (WHERE severity >= 60 AND severity < 75)::bigint      AS "high!",
            COUNT(*) FILTER (WHERE severity >= 75 AND severity < 90)::bigint      AS "critical!",
            COUNT(*) FILTER (WHERE severity >= 90)::bigint                        AS "extreme!"
        FROM alerts
        "#
    )
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn get_alert_stats_over_time(pool: &DbPool, limit: i64) -> Result<Vec<AlertTimePoint>> {
    let rows = sqlx::query_as!(
        AlertTimePoint,
        r#"
        SELECT created_at, severity, rule_triggered, alert_id_hex
        FROM alerts
        ORDER BY created_at DESC
        LIMIT $1
        "#,
        limit
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}