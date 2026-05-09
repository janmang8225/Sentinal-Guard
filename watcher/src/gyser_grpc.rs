// watcher/src/geyser_grpc.rs
//
// Production Yellowstone gRPC subscriber for SentinelGuard.
// Replaces the WebSocket fallback (geyser.rs) for mainnet use.
//
// Differences from geyser.rs:
//   - No separate RPC fetch per signature — Yellowstone pushes the full tx
//   - No seen_signatures dedup via Instant (handled differently, see below)
//   - No PubsubClient / RpcClient — replaced by GeyserGrpcClient
//   - All detection logic (detect_flash_loan, parse_token_deltas, etc.)
//     is shared from parser.rs — this file only handles transport + mapping
//
// Provider compatibility:
//   - Helius     : set GEYSER_ENDPOINT=https://mainnet.helius-rpc.com
//                  set GEYSER_TOKEN=<your-api-key>
//   - Triton     : set GEYSER_ENDPOINT=<your-triton-endpoint>
//                  set GEYSER_TOKEN=<your-token>
//   - Self-hosted: set GEYSER_ENDPOINT=http://localhost:10000
//                  leave GEYSER_TOKEN empty
//
// Cargo.toml additions required:
//   yellowstone-grpc-client = "5"
//   yellowstone-grpc-proto  = "5"
//   prost                   = "0.13"
//   prost-types             = "0.13"
//   tonic                   = { version = "0.12", features = ["tls", "tls-roots"] }

use anyhow::{Context, Result};
use futures::StreamExt;
use redis::aio::ConnectionManager;
use std::{
    collections::{HashMap, HashSet},
    time::{Duration, Instant},
};
use tokio::sync::broadcast;
use tracing::{debug, error, info, warn};
use yellowstone_grpc_client::GeyserGrpcClient;
use yellowstone_grpc_proto::prelude::{
    subscribe_update::UpdateOneof, CommitmentLevel, SubscribeRequest,
    SubscribeRequestFilterTransactions, SubscribeUpdateTransactionInfo,
};

use crate::config::Config;
use crate::parser::{
    compute_cpi_metrics_from_grpc, detect_flash_loan, parse_token_deltas_from_grpc,
};
use crate::types::{CpiMetrics, FlashLoanEvidence, ParsedTransaction, TokenDelta, TvlCache};

// ─── Reconnect policy ─────────────────────────────────────────────────────────

/// How long to wait before reconnecting after a stream error.
/// Yellowstone streams can drop on slot boundary reorgs — reconnect fast.
const RECONNECT_BASE_MS: u64 = 500;
const RECONNECT_MAX_MS: u64 = 30_000;

/// Dedup window: ignore signatures we've already processed within this window.
/// Yellowstone can send the same tx twice near slot boundaries.
const DEDUP_WINDOW: Duration = Duration::from_secs(30);

// ─── Main run loop ────────────────────────────────────────────────────────────

pub async fn run(
    cfg: Config,
    tx_sender: broadcast::Sender<ParsedTransaction>,
    redis: ConnectionManager,
) -> Result<()> {
    info!(
        "Starting Yellowstone gRPC subscriber → {}",
        cfg.geyser_endpoint
    );

    let mut backoff_ms = RECONNECT_BASE_MS;
    let mut reconnect_count: u32 = 0;

    loop {
        match run_stream(&cfg, &tx_sender, redis.clone()).await {
            Ok(()) => {
                // Stream ended cleanly (receiver side dropped) — shut down
                info!("gRPC stream ended cleanly — shutting down");
                return Ok(());
            }
            Err(e) => {
                reconnect_count += 1;
                error!(
                    "gRPC stream error (reconnect #{}): {} — retrying in {}ms",
                    reconnect_count, e, backoff_ms
                );

                // Stop retrying if there are no downstream receivers
                if tx_sender.receiver_count() == 0 {
                    warn!("No receivers on tx channel — stopping gRPC subscriber");
                    return Ok(());
                }

                tokio::time::sleep(Duration::from_millis(backoff_ms)).await;
                backoff_ms = (backoff_ms * 2).min(RECONNECT_MAX_MS);
            }
        }
    }
}

// ─── Single stream session ────────────────────────────────────────────────────

async fn run_stream(
    cfg: &Config,
    tx_sender: &broadcast::Sender<ParsedTransaction>,
    mut redis: ConnectionManager,
) -> Result<()> {
    // ── Connect ───────────────────────────────────────────────────────────────
    let mut client_builder =
        GeyserGrpcClient::build_from_shared(cfg.geyser_endpoint.clone())
            .context("Failed to build gRPC client")?;

    // Attach API token if provided (Helius / Triton require this)
    if !cfg.geyser_endpoint.is_empty() {
        client_builder = client_builder
            .x_token(Some(cfg.geyser_endpoint.clone()))
            .context("Failed to set gRPC x-token")?;
    }

    let mut client = client_builder
        .connect()
        .await
        .with_context(|| format!("gRPC connect failed to {}", cfg.geyser_endpoint))?;

    info!("gRPC connected to {}", cfg.geyser_endpoint);

    // ── Build subscription request ────────────────────────────────────────────
    //
    // account_include = watched_programs means: deliver any transaction that
    // touches (invokes or references) one of these program IDs.
    // This mirrors RpcTransactionLogsFilter::Mentions from the WebSocket path.
    let mut tx_filters = HashMap::new();
    tx_filters.insert(
        "sentinel_watch".to_string(),
        SubscribeRequestFilterTransactions {
            vote: Some(false),   // skip vote txs — never relevant
            failed: Some(false), // skip failed txs — same as WebSocket path
            account_include: cfg.watched_programs.clone(),
            account_exclude: vec![],
            account_required: vec![],
            ..Default::default()
        },
    );

    let request = SubscribeRequest {
        transactions: tx_filters,
        commitment: Some(CommitmentLevel::Confirmed as i32),
        ..Default::default()
    };

    let (_sink, mut stream) = client
        .subscribe_with_request(Some(request))
        .await
        .context("gRPC subscribe failed")?;

    info!(
        "gRPC subscription active — watching {} programs",
        cfg.watched_programs.len()
    );

    // ── Event loop ────────────────────────────────────────────────────────────
    let mut seen: HashMap<String, Instant> = HashMap::new();
    let mut processed: u64 = 0;
    let mut errors: u64 = 0;

    while let Some(msg) = stream.next().await {
        let msg = msg.context("gRPC stream error")?;

        match msg.update_oneof {
            // ── Transaction update (the main event) ───────────────────────
            Some(UpdateOneof::Transaction(tx_update)) => {
                let Some(tx_info) = tx_update.transaction else {
                    continue;
                };

                // Signature bytes → base58 string
                let signature = bs58::encode(&tx_info.signature).into_string();

                // Dedup
                prune_seen(&mut seen);
                if seen.contains_key(&signature) {
                    continue;
                }
                seen.insert(signature.clone(), Instant::now());

                match parse_grpc_transaction(tx_info, signature, tx_update.slot) {
                    Ok(parsed) => {
                        processed += 1;
                        if processed % 100 == 0 {
                            debug!("gRPC: processed {} txs ({} errors)", processed, errors);
                        }

                        if parsed.flash_evidence.detected {
                            info!(
                                "Flash detected | sig={} | confidence={} | methods={:#05b} | program={} | borrow=${:.0}",
                                &parsed.signature[..8],
                                parsed.flash_evidence.confidence,
                                parsed.flash_evidence.methods_fired,
                                parsed.flash_evidence.program_id.as_deref().unwrap_or("delta_pattern"),
                                parsed.flash_evidence.max_borrow_amount as f64 / 1_000_000.0,
                            );
                        }

                        write_tvl_to_redis(&parsed, cfg, &mut redis);

                        if tx_sender.receiver_count() == 0 {
                            warn!("No receivers — stopping gRPC subscriber");
                            return Ok(());
                        }

                        if let Err(e) = tx_sender.send(parsed) {
                            debug!("Tx channel lagged: {}", e);
                        }
                    }
                    Err(e) => {
                        errors += 1;
                        if errors % 25 == 0 {
                            warn!("gRPC parse errors: {} total — last: {}", errors, e);
                        }
                    }
                }
            }

            // ── Ping — keepalive from server, no action needed ────────────
            Some(UpdateOneof::Ping(_)) => {
                debug!("gRPC ping received");
            }

            // ── Pong — response to a ping we sent ─────────────────────────
            Some(UpdateOneof::Pong(_)) => {}

            // ── Slot update — we don't need it but log at trace ───────────
            Some(UpdateOneof::Slot(slot_update)) => {
                debug!("Slot update: {:?}", slot_update.slot);
            }

            // ── Block meta / account / entry — not subscribed, skip ───────
            _ => {}
        }
    }

    // Stream ended without error (server closed gracefully)
    Err(anyhow::anyhow!("gRPC stream ended by server"))
}

// ─── Transaction Parser ───────────────────────────────────────────────────────
//
// Maps SubscribeUpdateTransactionInfo → ParsedTransaction.
// The Yellowstone protobuf gives us the compiled (raw) transaction — not the
// JSON-parsed form the RPC returns. So we work with raw account key indices
// and base58-encoded program IDs directly.

fn parse_grpc_transaction(
    tx_info: SubscribeUpdateTransactionInfo,
    signature: String,
    slot: u64,
) -> Result<ParsedTransaction> {
    // tx_info.transaction holds the SanitizedTransaction (compiled)
    let sanitized = tx_info
        .transaction
        .as_ref()
        .context("Missing transaction in gRPC update")?;

    let message = sanitized
        .message
        .as_ref()
        .context("Missing message in gRPC transaction")?;

    // ── Account keys ──────────────────────────────────────────────────────────
    // Yellowstone encodes account keys as raw bytes (32-byte pubkeys).
    // Convert to base58 strings — same format the rest of the code uses.
    let account_keys: Vec<String> = message
        .account_keys
        .iter()
        .map(|key_bytes| bs58::encode(key_bytes).into_string())
        .collect();

    let fee_payer = account_keys.first().cloned().unwrap_or_default();

    // ── Program IDs from top-level instructions ───────────────────────────────
    let mut program_ids: HashSet<String> = message
        .instructions
        .iter()
        .filter_map(|ix| account_keys.get(ix.program_id_index as usize))
        .cloned()
        .collect();

    // ── Meta (pre/post balances, logs, inner instructions) ───────────────────
    let meta = tx_info
        .meta
        .as_ref()
        .context("Missing transaction meta in gRPC update")?;

    // Inner instruction program IDs
    for inner_group in &meta.inner_instructions {
        for ix in &inner_group.instructions {
            if let Some(id) = account_keys.get(ix.program_id_index as usize) {
                program_ids.insert(id.clone());
            }
        }
    }

    let program_ids: Vec<String> = program_ids.into_iter().collect();

    // ── Token deltas ──────────────────────────────────────────────────────────
    let token_deltas = parse_token_deltas_from_grpc(
        &meta.pre_token_balances,
        &meta.post_token_balances,
        &account_keys,
    );

    // ── Log messages ──────────────────────────────────────────────────────────
    let log_messages = meta.log_messages.clone();

    // ── CPI metrics ───────────────────────────────────────────────────────────
    let cpi = compute_cpi_metrics_from_grpc(&meta.inner_instructions);

    // ── Flash loan detection ──────────────────────────────────────────────────
    let flash_evidence = detect_flash_loan(&program_ids, &log_messages, &token_deltas);

    // ── Timestamp ─────────────────────────────────────────────────────────────
    // Yellowstone does NOT include block_time in transaction updates.
    // Use current wall time — acceptable for monitoring purposes.
    // If you need exact block_time, subscribe to block_meta updates too.
    let timestamp = chrono::Utc::now().timestamp();

    Ok(ParsedTransaction {
        slot,
        signature,
        program_ids,
        token_deltas,
        cpi,
        log_messages,
        flash_evidence,
        fee_payer,
        timestamp,
    })
}

// ─── TVL Redis writer (identical to geyser.rs) ────────────────────────────────

fn write_tvl_to_redis(parsed: &ParsedTransaction, cfg: &Config, redis: &mut ConnectionManager) {
    let protocol = parsed
        .program_ids
        .iter()
        .find(|id| cfg.watched_programs.contains(id))
        .cloned();
    let Some(protocol) = protocol else { return };

    let configured_vault_balance_usd = parsed
        .token_deltas
        .iter()
        .filter(|d| cfg.vault_accounts.contains(&d.account) && d.after > 0)
        .map(|d| d.after as f64 / 1_000_000.0)
        .fold(0f64, f64::max);

    let fallback_balance_usd = largest_token_balance_usd_from_tx(parsed);
    let vault_balance_usd = if !cfg.vault_accounts.is_empty() {
        if configured_vault_balance_usd > 0.0 {
            configured_vault_balance_usd
        } else {
            debug!(
                "No configured vault delta matched in tx {}. Falling back to largest token balance. configured_vaults={:?} touched_accounts={:?}",
                &parsed.signature[..8],
                cfg.vault_accounts,
                parsed
                    .token_deltas
                    .iter()
                    .map(|d| d.account.as_str())
                    .collect::<Vec<_>>(),
            );
            fallback_balance_usd
        }
    } else {
        fallback_balance_usd
    };

    if vault_balance_usd < 100.0 {
        return;
    }

    let slot = parsed.slot;
    let timestamp = parsed.timestamp;
    let key = format!("tvl:{}", protocol);
    let mut r = redis.clone();

    tokio::spawn(async move {
        let prev_tvl: f64 = match redis::cmd("GET")
            .arg(&key)
            .query_async::<String>(&mut r)
            .await
        {
            Ok(val) => serde_json::from_str::<TvlCache>(&val)
                .map(|t| t.tvl_usd)
                .unwrap_or(0.0),
            Err(_) => 0.0,
        };

        let cache = TvlCache {
            protocol: protocol.clone(),
            tvl_usd: vault_balance_usd.max(prev_tvl * 0.5),
            slot,
            updated_at: timestamp,
        };

        let val = serde_json::to_string(&cache).unwrap_or_default();
        if let Err(e) = redis::cmd("SET")
            .arg(&key)
            .arg(&val)
            .arg("EX")
            .arg(60u64)
            .query_async::<()>(&mut r)
            .await
        {
            tracing::error!("Redis TVL write failed: {}", e);
        }
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

pub fn largest_token_balance_usd_from_tx(tx: &ParsedTransaction) -> f64 {
    tx.token_deltas
        .iter()
        .filter(|d| d.after > 0)
        .map(|d| d.after as f64 / 1_000_000.0)
        .fold(0f64, f64::max)
}

fn prune_seen(seen: &mut HashMap<String, Instant>) {
    let now = Instant::now();
    seen.retain(|_, t| now.duration_since(*t) < DEDUP_WINDOW);
}
