// watcher/src/main.rs
//
// SentinelGuard Watcher — production entry point.
//
// Task topology:
//
//   Geyser (gRPC) ──broadcast(10k)──► Detection Engine ──broadcast(1k)──► Responder
//                                                    │                         │
//                                                    └──────────────────► Feed API
//
// Channels:
//   tx_channel   : ParsedTransaction   capacity=10_000  (Geyser → Engine)
//   alert_channel: AlertEvent          capacity=1_000   (Engine → Responder + API)
//
// Redis usage:
//   - geyser.rs  WRITES tvl:{protocol} on every tx (30s TTL)
//   - engine.rs  READS  tvl:{protocol} for fast TVL lookup
//   - (future)   engine.rs WRITES alert_sent:{id} for dedup (TTL=5min)
//
// Kafka usage:
//   - webhooks.rs PUBLISHES to sentinel.alerts after a pause fires
//   - (future)    separate consumer service for customer alerting

mod api;
mod config;
pub mod db;
mod geyser;
mod responder;
mod rules;
mod types;
mod parser;
mod gyser_grpc;

use anyhow::Result;
use solana_sdk::signer::Signer;
use std::io::ErrorKind;
use tokio::sync::broadcast;
use tracing::{error, info};

use crate::types::{AlertEvent, ParsedTransaction};

#[tokio::main]
async fn main() -> Result<()> {
    // Load .env file
    dotenvy::dotenv().ok();

    // Structured logging — JSON in production, pretty in dev
    let log_format = std::env::var("LOG_FORMAT").unwrap_or_else(|_| "pretty".to_string());
    if log_format == "json" {
        tracing_subscriber::fmt()
            .json()
            .with_env_filter(
                tracing_subscriber::EnvFilter::from_default_env()
                    .add_directive("watcher=info".parse()?)
                    .add_directive("tower_http=warn".parse()?)
            )
            .init();
    } else {
        tracing_subscriber::fmt()
            .with_env_filter(
                tracing_subscriber::EnvFilter::from_default_env()
                    .add_directive("watcher=debug".parse()?)
                    .add_directive("tower_http=warn".parse()?)
            )
            .init();
    }

    print_banner();

    // ── Config ────────────────────────────────────────────────────────────────
    let cfg = config::load()?;
    info!("Config loaded ✓");

    // ── Load watcher keypair ──────────────────────────────────────────────────
    let keypair = solana_sdk::signature::read_keypair_file(&cfg.watcher_keypair_path)
        .map_err(|e| anyhow::anyhow!(
            "Failed to load keypair from '{}': {}\nRun: solana-keygen new --outfile {}",
            cfg.watcher_keypair_path, e, cfg.watcher_keypair_path
        ))?;
    let watcher_pubkey = keypair.pubkey().to_string();
    info!("Watcher pubkey: {}", watcher_pubkey);

    // ── PostgreSQL ────────────────────────────────────────────────────────────
    let db = db::connect(&cfg).await?;

    // ── Redis ─────────────────────────────────────────────────────────────────
    info!("Connecting to Redis at {}", cfg.redis_url);
    let redis_client = redis::Client::open(cfg.redis_url.clone())?;
    let redis_mgr = redis::aio::ConnectionManager::new(redis_client).await?;
    info!("Redis connected ✓");

    // ── Kafka (verify broker is reachable) ────────────────────────────────────
    info!("Kafka brokers: {}", cfg.kafka_brokers);
    // Note: rdkafka producer is created per-dispatch in webhooks.rs
    // No persistent connection needed — producer connects lazily

    // ── Channels ──────────────────────────────────────────────────────────────
    // Capacity tuning:
    //   tx_channel: 10_000 — at 5000 tx/s and 400ms processing budget,
    //               we can buffer 2 seconds of transactions before dropping.
    //   alert_channel: 1_000 — alerts are rare; this is essentially unbounded.
    let (tx_sender, _) = broadcast::channel::<ParsedTransaction>(10_000);
    let (alert_sender, _) = broadcast::channel::<AlertEvent>(1_000);

    // ── Spawn Tasks ───────────────────────────────────────────────────────────

    // Task 1: transaction subscriber
    // Restarts automatically on stream failure
    {
        let cfg2 = cfg.clone();
        let tx2 = tx_sender.clone();
        let redis2 = redis_mgr.clone();
        tokio::spawn(async move {
            loop {
                info!("Starting transaction subscriber...");
                if let Err(e) = geyser::run(cfg2.clone(), tx2.clone(), redis2.clone()).await {
                    error!("Transaction subscriber crashed: {} — restarting in 2s", e);
                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                }
            }
        });
    }

    // Task 2: Detection engine
    {
        let cfg2 = cfg.clone();
        let rx2 = tx_sender.subscribe();
        let alert_tx2 = alert_sender.clone();
        let db2 = db.clone();
        let redis2 = redis_mgr.clone();
        let pubkey2 = watcher_pubkey.clone();
        tokio::spawn(async move {
            loop {
                info!("Starting detection engine...");
                if let Err(e) = rules::engine::run(
                    cfg2.clone(),
                    rx2.resubscribe(),
                    alert_tx2.clone(),
                    db2.clone(),
                    redis2.clone(),
                    pubkey2.clone(),
                ).await {
                    error!("Detection engine crashed: {} — restarting in 1s", e);
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                }
            }
        });
    }

    // Task 3: Responder
    {
        let cfg2 = cfg.clone();
        let alert_rx2 = alert_sender.subscribe();
        let db2 = db.clone();
        tokio::spawn(async move {
            loop {
                info!("Starting responder...");
                if let Err(e) = responder::run(cfg2.clone(), alert_rx2.resubscribe(), db2.clone()).await {
                    error!("Responder crashed: {} — restarting in 1s", e);
                    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                }
            }
        });
    }

    // Task 4: Threat feed API (Axum)
    {
        let alert_tx4 = alert_sender.clone();
        let db4 = db.clone();
        let redis4 = redis_mgr.clone();
        let cfg4 = cfg.clone();
        tokio::spawn(async move {
            loop {
                info!("Starting threat feed API...");
                if let Err(e) = api::feed::run(
                    alert_tx4.clone(),
                    db4.clone(),
                    redis4.clone(),
                    cfg4.clone(),
                ).await {
                    if is_addr_in_use(&e) {
                        error!("API server startup failed: {}", e);
                        error!("Threat feed API task stopped until the port conflict is resolved.");
                        break;
                    }
                    error!("API server crashed: {} — restarting in 2s", e);
                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                }
            }
        });
    }

    info!("━━━ All tasks running. Watcher is live ━━━");

    // Block until ctrl-c
    tokio::signal::ctrl_c().await?;
    info!("Shutdown signal received. Goodbye.");

    Ok(())
}

fn print_banner() {
    info!("╔═══════════════════════════════════════════╗");
    info!("║    SentinelGuard Watcher  v{}           ║", env!("CARGO_PKG_VERSION"));
    info!("║    Real-time Solana exploit detector      ║");
    info!("╚═══════════════════════════════════════════╝");
}

fn is_addr_in_use(err: &anyhow::Error) -> bool {
    err.chain().any(|cause| {
        cause
            .downcast_ref::<std::io::Error>()
            .is_some_and(|io_err| io_err.kind() == ErrorKind::AddrInUse)
    })
}
