// watcher/src/api/feed.rs
//
// Complete threat feed API — all endpoints the frontend needs.
//
// Endpoints added vs previous version:
//   GET /protocols/:id         ← single protocol full detail
//   GET /stats                 ← aggregate stats for Analytics page
//   GET /tvl-history/:protocol ← TVL history for the dashboard chart
//   GET /config                ← watcher config for Controls page
//
// WebSocket now sends last 10 historical alerts on connect
// so the feed isn't empty when the page first loads.

use axum::{
    extract::{Path, Query, State, WebSocketUpgrade, ws::{Message, WebSocket}},
    http::{HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use anyhow::Context;
use redis::aio::ConnectionManager;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc};
use tokio::sync::broadcast;
use tower_http::cors::{Any, CorsLayer};
use tracing::{debug, info, warn};

use crate::config::Config;
use crate::db::DbPool;
use crate::types::{AlertEvent, TvlCache};

// ─── App State ────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
    pub alert_tx: broadcast::Sender<AlertEvent>,
    pub db: DbPool,
    pub redis: ConnectionManager,
    pub cfg: Config,
}

// ─── Query params ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct PaginationQuery {
    limit: Option<i64>,
}

// ─── Response types ───────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct ProtocolInfo {
    pub protocol: String,
    pub tvl_usd: f64,
    pub last_updated_slot: Option<u64>,
    pub paused: bool,
    pub pause_count: i64,
    pub last_pause_at: Option<String>,
    pub last_alert_severity: Option<i16>,
    pub last_alert_rule: Option<String>,
    pub last_alert_at: Option<String>,
}

#[derive(Serialize)]
pub struct StatsResponse {
    pub total_alerts: i64,
    pub total_at_risk_usd: f64,
    pub avg_severity: f64,
    pub avg_response_ms: f64,
    pub pause_rate_pct: f64,
    pub total_pauses_executed: i64,
    pub protocols_monitored: i64,
    pub alerts_24h: i64,
    pub by_rule: HashMap<String, i64>,
    pub severity_buckets: SeverityBuckets,
    pub severity_over_time: Vec<SeverityPoint>,
}

#[derive(Serialize)]
pub struct SeverityBuckets {
    pub low: i64,
    pub medium: i64,
    pub high: i64,
    pub critical: i64,
    pub extreme: i64,
}

#[derive(Serialize)]
pub struct SeverityPoint {
    pub timestamp: String,
    pub severity: i16,
    pub rule: String,
    pub alert_id_hex: String,
}

#[derive(Serialize)]
pub struct TvlPoint {
    pub slot: i64,
    pub tvl_usd: f64,
    pub captured_at: String,
}

#[derive(Serialize)]
pub struct ConfigResponse {
    pub watcher_pubkey: String,
    pub sentinel_program_id: String,
    pub watched_programs: Vec<String>,
    pub window_size: usize,
    pub tvl_drop_threshold_pct: f64,
    pub bridge_spike_multiplier: f64,
    pub min_severity_to_pause: u8,
    pub min_severity_to_publish: u8,
    pub alert_cooldown_secs: u64,
    pub solana_rpc_url: String,
    pub network: String,
    pub kafka_brokers: String,
}

// ─── Server startup ───────────────────────────────────────────────────────────

pub async fn run(
    alert_tx: broadcast::Sender<AlertEvent>,
    db: DbPool,
    redis: ConnectionManager,
    cfg: Config,
) -> anyhow::Result<()> {
    let state = Arc::new(AppState { alert_tx, db, redis, cfg: cfg.clone() });

    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:3000".parse::<HeaderValue>().unwrap(),
            "http://127.0.0.1:3000".parse::<HeaderValue>().unwrap(),
        ])
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/feed",                    get(ws_handler))
        .route("/alerts",                  get(get_alerts))
        .route("/alerts/:protocol",        get(get_alerts_for_protocol))
        .route("/protocols",               get(get_protocols))
        .route("/protocols/:id",           get(get_protocol_detail))
        .route("/stats",                   get(get_stats))
        .route("/tvl-history/:protocol",   get(get_tvl_history))
        .route("/config",                  get(get_config))
        .route("/health",                  get(health))
        .layer(cors)
        .with_state(state);

    let addr = format!("0.0.0.0:{}", cfg.api_port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .with_context(|| {
            format!(
                "Threat feed API failed to bind {}. Another process may already be using this port. Set API_PORT to a free port or stop the conflicting process.",
                addr
            )
        })?;
    info!("Threat feed API listening on {}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    let mut rx = state.alert_tx.subscribe();
    info!("WS client connected");

    // Send last 10 alerts on connect so the feed isn't empty immediately
    if let Ok(recent) = crate::db::get_recent_alerts(&state.db, 10).await {
        for row in recent.iter().rev() {
            let json = serde_json::json!({
                "alert_id_hex": row.alert_id_hex,
                "protocol": row.protocol,
                "severity": row.severity,
                "rule_triggered": row.rule_triggered,
                "estimated_at_risk_usd": row.estimated_at_risk_usd,
                "trigger_tx_signatures": row.trigger_signatures,
                "slot": row.slot,
                "timestamp": row.created_at.timestamp(),
                "watcher_pubkey": row.watcher_pubkey,
                "on_chain_tx": row.on_chain_tx,
                "_historical": true,
            });
            if socket.send(Message::Text(json.to_string())).await.is_err() {
                return;
            }
        }
    }

    loop {
        match rx.recv().await {
            Ok(alert) => {
                if alert.severity < state.cfg.min_severity_to_publish {
                    continue;
                }
                let json = match serde_json::to_string(&alert) {
                    Ok(s) => s,
                    Err(e) => { warn!("Serialize error: {}", e); continue; }
                };
                if socket.send(Message::Text(json)).await.is_err() {
                    debug!("WS client disconnected");
                    break;
                }
            }
            Err(broadcast::error::RecvError::Lagged(n)) => {
                warn!("WS feed lagged {} alerts", n);
            }
            Err(broadcast::error::RecvError::Closed) => break,
        }
    }
}

// ─── Alert endpoints ──────────────────────────────────────────────────────────

async fn get_alerts(
    Query(params): Query<PaginationQuery>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(100).min(500);
    match crate::db::get_recent_alerts(&state.db, limit).await {
        Ok(rows) => Json(rows).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_alerts_for_protocol(
    Path(protocol): Path<String>,
    Query(params): Query<PaginationQuery>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50).min(200);
    match crate::db::get_alerts_for_protocol(&state.db, &protocol, limit).await {
        Ok(rows) => Json(rows).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ─── Protocol endpoints ───────────────────────────────────────────────────────

async fn get_protocols(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let mut result = Vec::new();
    let mut redis = state.redis.clone();
    for protocol in &state.cfg.watched_programs {
        result.push(build_protocol_info(protocol, &mut redis, &state.db).await);
    }
    Json(result)
}

async fn get_protocol_detail(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    if !state.cfg.watched_programs.contains(&id) {
        return (StatusCode::NOT_FOUND, "Protocol not found").into_response();
    }
    let mut redis = state.redis.clone();
    Json(build_protocol_info(&id, &mut redis, &state.db).await).into_response()
}

async fn build_protocol_info(
    protocol: &str,
    redis: &mut ConnectionManager,
    db: &DbPool,
) -> ProtocolInfo {
    let key = format!("tvl:{}", protocol);
    let (tvl_usd, last_updated_slot) = match redis::cmd("GET")
        .arg(&key)
        .query_async::<String>(redis)
        .await
    {
        Ok(val) => match serde_json::from_str::<TvlCache>(&val) {
            Ok(c) => (c.tvl_usd, Some(c.slot)),
            Err(_) => (0.0, None),
        },
        Err(_) => (0.0, None),
    };

    let (paused, pause_count, last_pause_at,
         last_alert_severity, last_alert_rule, last_alert_at) =
        match crate::db::get_alerts_for_protocol(db, protocol, 100).await {
            Ok(rows) => {
                let pause_count = rows.iter()
                    .filter(|r| r.on_chain_tx.is_some())
                    .count() as i64;

                let most_recent = rows.first();
                let last_pause = rows.iter()
                    .find(|r| r.on_chain_tx.is_some());

                // Consider paused if most recent alert had a pause tx
                // AND it was within the last 60 seconds
                let paused = most_recent.map_or(false, |r| {
                    let age = (chrono::Utc::now() - r.created_at).num_seconds();
                    r.on_chain_tx.is_some() && age < 60
                });

                (
                    paused,
                    pause_count,
                    last_pause.map(|r| r.created_at.to_rfc3339()),
                    most_recent.map(|r| r.severity),
                    most_recent.map(|r| r.rule_triggered.clone()),
                    most_recent.map(|r| r.created_at.to_rfc3339()),
                )
            }
            Err(_) => (false, 0, None, None, None, None),
        };

    ProtocolInfo {
        protocol: protocol.to_string(),
        tvl_usd,
        last_updated_slot,
        paused,
        pause_count,
        last_pause_at,
        last_alert_severity,
        last_alert_rule,
        last_alert_at,
    }
}

// ─── Stats endpoint (Analytics page) ─────────────────────────────────────────

async fn get_stats(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let rows = match crate::db::get_recent_alerts(&state.db, 10_000).await {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let total_alerts = rows.len() as i64;
    let cutoff_24h = chrono::Utc::now() - chrono::Duration::hours(24);
    let alerts_24h = rows.iter().filter(|r| r.created_at > cutoff_24h).count() as i64;
    let total_at_risk_usd: f64 = rows.iter().map(|r| r.estimated_at_risk_usd).sum();
    let avg_severity = if total_alerts > 0 {
        rows.iter().map(|r| r.severity as f64).sum::<f64>() / total_alerts as f64
    } else { 0.0 };
    let total_pauses = rows.iter().filter(|r| r.on_chain_tx.is_some()).count() as i64;
    let pause_rate_pct = if total_alerts > 0 {
        total_pauses as f64 / total_alerts as f64 * 100.0
    } else { 0.0 };

    let mut by_rule: HashMap<String, i64> = HashMap::new();
    for row in &rows {
        *by_rule.entry(row.rule_triggered.clone()).or_insert(0) += 1;
    }

    let severity_buckets = SeverityBuckets {
        low:      rows.iter().filter(|r| r.severity < 30).count() as i64,
        medium:   rows.iter().filter(|r| r.severity >= 30 && r.severity < 60).count() as i64,
        high:     rows.iter().filter(|r| r.severity >= 60 && r.severity < 75).count() as i64,
        critical: rows.iter().filter(|r| r.severity >= 75 && r.severity < 90).count() as i64,
        extreme:  rows.iter().filter(|r| r.severity >= 90).count() as i64,
    };

    let severity_over_time: Vec<SeverityPoint> = rows.iter().rev().map(|r| SeverityPoint {
        timestamp: r.created_at.to_rfc3339(),
        severity: r.severity,
        rule: r.rule_triggered.clone(),
        alert_id_hex: r.alert_id_hex.clone(),
    }).collect();

    Json(StatsResponse {
        total_alerts,
        total_at_risk_usd,
        avg_severity,
        avg_response_ms: 2800.0, // placeholder — store pause confirmation time in DB for real value
        pause_rate_pct,
        total_pauses_executed: total_pauses,
        protocols_monitored: state.cfg.watched_programs.len() as i64,
        alerts_24h,
        by_rule,
        severity_buckets,
        severity_over_time,
    }).into_response()
}

// ─── TVL history endpoint (Dashboard chart) ───────────────────────────────────

async fn get_tvl_history(
    Path(protocol): Path<String>,
    Query(params): Query<PaginationQuery>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(100).min(500);
    match crate::db::get_tvl_history(&state.db, &protocol, limit).await {
        Ok(rows) => {
            let points: Vec<TvlPoint> = rows.iter().map(|r| TvlPoint {
                slot: r.slot,
                tvl_usd: r.tvl_usd,
                captured_at: r.captured_at.to_rfc3339(),
            }).collect();
            Json(points).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ─── Config endpoint (Controls page) ─────────────────────────────────────────

async fn get_config(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let network = if state.cfg.solana_rpc_url.contains("127.0.0.1")
        || state.cfg.solana_rpc_url.contains("localhost")
    {
        format!("Localnet ({})", state.cfg.solana_rpc_url)
    } else if state.cfg.solana_rpc_url.contains("devnet") {
        "Devnet".to_string()
    } else {
        "Mainnet".to_string()
    };

    Json(ConfigResponse {
        watcher_pubkey: state.cfg.watcher_keypair_path.clone(),
        sentinel_program_id: state.cfg.sentinel_program_id.clone(),
        watched_programs: state.cfg.watched_programs.clone(),
        window_size: state.cfg.window_size,
        tvl_drop_threshold_pct: state.cfg.tvl_drop_threshold * 100.0,
        bridge_spike_multiplier: state.cfg.bridge_spike_multiplier,
        min_severity_to_pause: state.cfg.min_severity_to_pause,
        min_severity_to_publish: state.cfg.min_severity_to_publish,
        alert_cooldown_secs: 30,
        solana_rpc_url: state.cfg.solana_rpc_url.clone(),
        network,
        kafka_brokers: state.cfg.kafka_brokers.clone(),
    })
}

// ─── Health ───────────────────────────────────────────────────────────────────

async fn health(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "watched_programs": state.cfg.watched_programs.len(),
        "ws_subscribers": state.alert_tx.receiver_count(),
    }))
}
