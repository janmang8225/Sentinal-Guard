// watcher/src/geyser.rs
//
// Temporary subscriber implementation for environments without Yellowstone
// gRPC access. Uses Solana/Helius WebSocket log subscriptions plus
// per-signature JSON-RPC transaction fetches to reconstruct ParsedTransaction.

use anyhow::{Context, Result};
use futures::StreamExt;
use redis::aio::ConnectionManager;
use solana_client::{
    nonblocking::{pubsub_client::PubsubClient, rpc_client::RpcClient},
    rpc_config::{RpcTransactionConfig, RpcTransactionLogsConfig, RpcTransactionLogsFilter},
    rpc_response::RpcLogsResponse,
};
use solana_sdk::{commitment_config::CommitmentConfig, signature::Signature};
use solana_transaction_status_client_types::{
    option_serializer::OptionSerializer, EncodedConfirmedTransactionWithStatusMeta,
    EncodedTransaction, UiInnerInstructions, UiInstruction, UiMessage, UiParsedInstruction,
    UiTransactionEncoding, UiTransactionStatusMeta,
};
use std::{
    collections::{HashMap, HashSet},
    str::FromStr,
    sync::Arc,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tokio::{
    sync::{broadcast, mpsc},
    task::JoinSet,
};
use tracing::{debug, error, info, warn};

use crate::config::Config;
use crate::types::{CpiMetrics, FlashLoanEvidence, ParsedTransaction, TokenDelta, TvlCache};

// ─── Constants ────────────────────────────────────────────────────────────────

/// Known flash loan program IDs on Solana mainnet.
const FLASH_LOAN_PROGRAMS: &[(&str, &str)] = &[
    ("So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo", "Solend"),
    ("MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD", "Marginfi"),
    (
        "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
        "Orca Whirlpool",
    ),
];

/// Jupiter is NOT a flash loan program — it's a DEX aggregator.
/// It appears in almost every swap, which was causing false positives.
/// Method 1 should only match true flash loan programs.
/// Jupiter flash swaps are caught by Method 2 (log keyword) if they emit logs.

pub const BRIDGE_PROGRAMS: &[&str] = &[
    "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth",
    "3u8hJUVTA4jH1wYAyUur7FFZVQ8H635K3tSHHF4ssjQ5",
];

/// Known AMM/DEX program IDs whose pool accounts should be excluded from
/// delta pattern flash loan detection. These programs always have balanced
/// in/out deltas per mint (that's how AMMs work) — not flash loans.
const AMM_PROGRAMS: &[&str] = &[
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM v4
    "5quBtoiQqxF9Jv6KYKctB59NT3gtFD2SqzeKKTHkaNja", // Raydium AMM v3
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // Raydium CAMM
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",  // Orca Whirlpool
    "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP", // Orca v1
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",  // Jupiter aggregator
    "routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS",  // Jupiter route
    "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",  // Pump.fun AMM
    "GKybPT5ZzV5NgkXy1Pa8Bnu14MS7euEtK8j9zWHzYJpx", // unknown AMM in your logs
];

/// Minimum borrow amount to count as flash loan in Method 3.
/// $50,000 USDC — raised from $500 to eliminate AMM swap false positives.
/// Real flash loan exploits borrow millions, not thousands.
const FLASH_LOAN_MIN_BORROW_RAW: u64 = 10_000_000_000; // $50k USDC

// ─── Subscriber event ─────────────────────────────────────────────────────────

#[derive(Debug)]
enum SubscriberEvent {
    Log(RpcLogsResponse),
    Error(anyhow::Error),
}

// ─── Main loop ────────────────────────────────────────────────────────────────

pub async fn run(
    cfg: Config,
    tx_sender: broadcast::Sender<ParsedTransaction>,
    redis: ConnectionManager,
) -> Result<()> {
    let ws_url = websocket_url(&cfg);
    let rpc_url = subscriber_rpc_url(&cfg);

    info!("Connecting to WebSocket at {}", ws_url);
    info!("Using RPC fetch endpoint {}", rpc_url);

    let pubsub = Arc::new(
        PubsubClient::new(&ws_url)
            .await
            .with_context(|| format!("Failed to connect to WebSocket at {}", ws_url))?,
    );
    let rpc = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    let (event_tx, mut event_rx) = mpsc::unbounded_channel::<SubscriberEvent>();
    let mut join_set = JoinSet::new();
    let watched_programs = cfg.watched_programs.clone();

    {
        let pubsub = Arc::clone(&pubsub);
        let event_tx = event_tx.clone();

        join_set.spawn(async move {
            let filter = RpcTransactionLogsFilter::Mentions(watched_programs.clone());
            let config = RpcTransactionLogsConfig {
                commitment: Some(CommitmentConfig::processed()),
            };

            let (mut stream, unsubscribe) = match pubsub.logs_subscribe(filter, config).await {
                Ok(parts) => parts,
                Err(e) => {
                    let _ = event_tx.send(SubscriberEvent::Error(anyhow::anyhow!(
                        "WebSocket subscribe failed: {}",
                        e
                    )));
                    return;
                }
            };

            info!(
                "WebSocket subscription active for {} watched programs",
                watched_programs.len()
            );

            while let Some(resp) = stream.next().await {
                if resp.value.err.is_none() {
                    let _ = event_tx.send(SubscriberEvent::Log(resp.value));
                }
            }

            unsubscribe().await;
            let _ = event_tx.send(SubscriberEvent::Error(anyhow::anyhow!(
                "WebSocket stream ended"
            )));
        });
    }

    drop(event_tx);

    let mut redis = redis;
    let mut processed: u64 = 0;
    let mut errors: u64 = 0;
    let mut seen_signatures: HashMap<String, Instant> = HashMap::new();

    loop {
        tokio::select! {
            maybe_event = event_rx.recv() => {
                let Some(event) = maybe_event else {
                    return Err(anyhow::anyhow!("All WebSocket subscriptions ended unexpectedly"));
                };

                match event {
                    SubscriberEvent::Log(logs) => {
                        prune_seen_signatures(&mut seen_signatures);
                        if seen_signatures.contains_key(&logs.signature) {
                            continue;
                        }
                        seen_signatures.insert(logs.signature.clone(), Instant::now());

                        match fetch_transaction_via_rpc(&rpc, &logs).await {
                            Ok(parsed) => {
                                processed += 1;
                                if processed % 100 == 0 {
                                    debug!("Processed {} txs ({} errors)", processed, errors);
                                }

                                // Only log flash loan detections — reduces noise
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

                                write_tvl_to_redis(&parsed, &cfg, &mut redis);

                                if tx_sender.receiver_count() == 0 {
                                    warn!("No receivers on tx channel — stopping subscriber");
                                    break;
                                }

                                if let Err(e) = tx_sender.send(parsed) {
                                    debug!("Tx channel lagged: {}", e);
                                }
                            }
                            Err(e) => {
                                errors += 1;
                                if errors % 25 == 0 {
                                    warn!("Parse/fetch errors: {} total — last: {}", errors, e);
                                }
                            }
                        }
                    }
                    SubscriberEvent::Error(e) => {
                        error!("WebSocket subscriber error: {}", e);
                        return Err(e);
                    }
                }
            }
            maybe_joined = join_set.join_next(), if !join_set.is_empty() => {
                if let Some(Err(e)) = maybe_joined {
                    return Err(anyhow::anyhow!("WebSocket task panicked: {}", e));
                }
            }
        }
    }

    warn!("WebSocket subscriber ended unexpectedly");
    Ok(())
}

// ─── TVL Redis writer ─────────────────────────────────────────────────────────

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

    // Mint-agnostic TVL proxy: prefer explicitly configured vault accounts, but
    // fall back to the largest positive token balance touched by the tx. A stale
    // VAULT_ACCOUNTS entry should degrade detection quality, not disable it.
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
        // Only overwrite if the new reading is larger OR if it's been more than 10s
        // (vault balance can shrink during an attack — we want to track that)
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

// ─── Transaction Parser ───────────────────────────────────────────────────────

async fn fetch_transaction_via_rpc(
    rpc: &RpcClient,
    logs: &RpcLogsResponse,
) -> Result<ParsedTransaction> {
    let signature = Signature::from_str(&logs.signature)
        .with_context(|| format!("Invalid signature: {}", logs.signature))?;

    let config = RpcTransactionConfig {
        encoding: Some(UiTransactionEncoding::JsonParsed),
        commitment: Some(CommitmentConfig::confirmed()),
        max_supported_transaction_version: Some(0),
    };

    let mut last_error = None;
    for attempt in 0..6 {
        match rpc.get_transaction_with_config(&signature, config).await {
            Ok(tx) => return parse_rpc_transaction(tx, logs),
            Err(e) => {
                last_error = Some(e);
                let base_ms = (250 * (2_u64.pow(attempt))).min(4_000);
                let jitter = retry_jitter_ms();
                tokio::time::sleep(Duration::from_millis(base_ms + jitter)).await;
            }
        }
    }

    Err(anyhow::anyhow!(
        "Failed to fetch tx {} after 6 attempts: {}",
        logs.signature,
        last_error.map(|e| e.to_string()).unwrap_or_default()
    ))
}

fn parse_rpc_transaction(
    tx: EncodedConfirmedTransactionWithStatusMeta,
    logs: &RpcLogsResponse,
) -> Result<ParsedTransaction> {
    let meta = tx
        .transaction
        .meta
        .as_ref()
        .context("Missing transaction meta")?;

    let ui_tx = match &tx.transaction.transaction {
        EncodedTransaction::Json(ui_tx) => ui_tx,
        _ => return Err(anyhow::anyhow!("RPC did not return JSON transaction")),
    };

    let account_keys = extract_account_keys(&ui_tx.message);
    let fee_payer = account_keys.first().cloned().unwrap_or_default();

    let mut program_ids = extract_program_ids(&ui_tx.message, &account_keys);
    program_ids.extend(extract_inner_program_ids(meta, &account_keys));
    let program_ids: Vec<String> = program_ids.into_iter().collect();

    let token_deltas = parse_token_deltas(meta, &account_keys);
    let log_messages = extract_log_messages(meta).unwrap_or_else(|| logs.logs.clone());
    let cpi = compute_cpi_metrics(extract_inner_instructions(meta));

    // Pass program_ids to flash loan detector so it can exclude AMM txs
    let flash_evidence = detect_flash_loan(&program_ids, &log_messages, &token_deltas);

    let signature = ui_tx
        .signatures
        .first()
        .cloned()
        .unwrap_or_else(|| logs.signature.clone());

    Ok(ParsedTransaction {
        slot: tx.slot,
        signature,
        program_ids,
        token_deltas,
        cpi,
        log_messages,
        flash_evidence,
        fee_payer,
        timestamp: tx
            .block_time
            .unwrap_or_else(|| chrono::Utc::now().timestamp()),
    })
}

// ─── Flash Loan Detection ─────────────────────────────────────────────────────

fn detect_flash_loan(
    program_ids: &[String],
    log_messages: &[String],
    token_deltas: &[TokenDelta],
) -> FlashLoanEvidence {
    let mut methods_fired: u8 = 0;
    let mut confidence: u8 = 0;
    let mut matched_program: Option<String> = None;

    // ── Method 1: Known flash loan program ID (confidence 95) ─────────────────
    for pid in program_ids {
        if let Some((_, name)) = FLASH_LOAN_PROGRAMS
            .iter()
            .find(|(id, _)| *id == pid.as_str())
        {
            methods_fired |= 0b001;
            confidence = confidence.max(95);
            matched_program = Some(format!("{} ({})", pid, name));
            break;
        }
    }

    // ── Method 2: Log keyword scan (confidence 70) ───────────────────────────
    let flash_keywords = [
        "flash_loan",
        "flashloan",
        "flash loan",
        "borrow_flash",
        "flash_borrow",
        "flash_swap",
    ];

    'log_scan: for log in log_messages {
        if log.starts_with("Program ")
            && (log.contains(" invoke ") || log.contains(" success") || log.contains(" failed"))
        {
            continue;
        }
        let lower = log.to_lowercase();
        for kw in &flash_keywords {
            if lower.contains(kw) {
                methods_fired |= 0b010;
                confidence = confidence.max(70);
                break 'log_scan;
            }
        }
    }

    // ── Method 3: Delta pattern — ONLY runs if Method 1 or 2 already fired ───
    //
    // KEY CHANGE: Method 3 is now a CORROBORATING signal, not a standalone one.
    // Balanced in/out deltas happen in EVERY AMM swap — it's how AMMs work.
    // Method 3 alone produces a false positive on every swap.
    // It is only useful when combined with a known flash loan program or log keyword.
    if methods_fired != 0 {
        let (m3_fired, _) = detect_by_delta_pattern(token_deltas);
        if m3_fired {
            methods_fired |= 0b100;
            confidence = confidence.max(55); // doesn't lower existing confidence
        }

        // Boost confidence when multiple methods agree
        let method_count = methods_fired.count_ones() as u8;
        if method_count >= 2 {
            confidence = (confidence + 10 * (method_count - 1)).min(98);
        }

        return FlashLoanEvidence {
            detected: true,
            confidence,
            methods_fired,
            program_id: matched_program,
            max_borrow_amount: if methods_fired & 0b100 != 0 {
                detect_by_delta_pattern(token_deltas).1
            } else {
                0
            },
        };
    }

    FlashLoanEvidence::none()
}

fn detect_by_delta_pattern(token_deltas: &[TokenDelta]) -> (bool, u64) {
    let mut by_mint: HashMap<&str, (i128, u64)> = HashMap::new();

    for d in token_deltas {
        let entry = by_mint.entry(d.mint.as_str()).or_default();
        entry.0 += d.delta as i128; // net delta across all accounts for this mint
        if d.delta < 0 {
            entry.1 = entry.1.max((-d.delta) as u64); // track largest single outflow
        }
    }

    let mut max_borrow: u64 = 0;

    for (_mint, (net_delta, max_outflow)) in &by_mint {
        // Must exceed minimum threshold ($50k)
        if *max_outflow < FLASH_LOAN_MIN_BORROW_RAW {
            continue;
        }

        // Net delta ≈ 0 means the borrow was repaid (flash loan)
        // 1% tolerance for protocol fees
        let net_abs = net_delta.unsigned_abs() as u64;
        let tolerance = max_outflow / 100;
        if net_abs <= tolerance {
            max_borrow = max_borrow.max(*max_outflow);
        }
    }

    (max_borrow > 0, max_borrow)
}

// ─── CPI Metrics ─────────────────────────────────────────────────────────────

fn compute_cpi_metrics(inner_instructions: &[UiInnerInstructions]) -> CpiMetrics {
    if inner_instructions.is_empty() {
        return CpiMetrics::zero();
    }

    let mut max_depth: u8 = 0;
    let mut max_width: u8 = 0;
    let mut total_cpi_count: u16 = 0;
    let mut stack_height_available = false;

    for group in inner_instructions {
        let width = group.instructions.len() as u8;
        max_width = max_width.max(width);
        total_cpi_count += group.instructions.len() as u16;

        for ix in &group.instructions {
            if let Some(sh) = ui_instruction_stack_height(ix) {
                stack_height_available = true;
                max_depth = max_depth.max(sh as u8);
            }
        }
    }

    if !stack_height_available {
        max_depth = max_width;
    }

    CpiMetrics {
        max_depth,
        max_width,
        total_cpi_count,
    }
}

fn ui_instruction_stack_height(ix: &UiInstruction) -> Option<u32> {
    match ix {
        UiInstruction::Compiled(ix) => ix.stack_height,
        UiInstruction::Parsed(UiParsedInstruction::Parsed(ix)) => ix.stack_height,
        UiInstruction::Parsed(UiParsedInstruction::PartiallyDecoded(ix)) => ix.stack_height,
    }
}

// ─── Token Delta Parser ───────────────────────────────────────────────────────

fn parse_token_deltas(meta: &UiTransactionStatusMeta, account_keys: &[String]) -> Vec<TokenDelta> {
    let empty = Vec::new();
    let pre_balances = match meta.pre_token_balances.as_ref() {
        OptionSerializer::Some(b) => b,
        _ => &empty,
    };
    let post_balances = match meta.post_token_balances.as_ref() {
        OptionSerializer::Some(b) => b,
        _ => &empty,
    };

    let pre_map: HashMap<u8, _> = pre_balances.iter().map(|b| (b.account_index, b)).collect();

    let mut deltas = Vec::new();
    for post in post_balances {
        let account = account_keys
            .get(post.account_index as usize)
            .cloned()
            .unwrap_or_default();

        let post_amount = post.ui_token_amount.amount.parse::<u64>().unwrap_or(0);
        let pre_amount = pre_map
            .get(&post.account_index)
            .and_then(|b| b.ui_token_amount.amount.parse::<u64>().ok())
            .unwrap_or(0);
        let delta = post_amount as i64 - pre_amount as i64;

        if delta != 0 {
            deltas.push(TokenDelta {
                account,
                mint: post.mint.clone(),
                before: pre_amount,
                after: post_amount,
                delta,
            });
        }
    }

    deltas
}

// ─── TVL Helpers ─────────────────────────────────────────────────────────────

/// Compute the largest positive token-account balance touched by this tx.
/// Used as a mint-agnostic TVL proxy when Redis is cold or tests use mock mints.
pub fn largest_token_balance_usd_from_tx(tx: &ParsedTransaction) -> f64 {
    tx.token_deltas
        .iter()
        .filter(|d| d.after > 0)
        .map(|d| d.after as f64 / 1_000_000.0)
        .fold(0f64, f64::max)
}

/// Compute net signed flow for the configured tracked mint.
///
/// FIX from previous version: old code returned the single largest delta
/// using .max_by(). This was wrong — if a tx has -$500k and +$300k USDC
/// deltas, the correct net is -$200k, not -$500k.
///
/// New: sum ALL signed USDC deltas. This gives the true net USDC movement.
pub fn net_usdc_delta_from_tx(tx: &ParsedTransaction, tracked_mint: &str) -> f64 {
    tx.token_deltas
        .iter()
        .filter(|d| d.mint == tracked_mint)
        .map(|d| d.delta as f64 / 1_000_000.0)
        .sum() // ← sum, not max_by
}

// ─── Account Key / Program ID Extraction ─────────────────────────────────────

fn extract_account_keys(message: &UiMessage) -> Vec<String> {
    match message {
        UiMessage::Raw(raw) => raw.account_keys.clone(),
        UiMessage::Parsed(parsed) => parsed
            .account_keys
            .iter()
            .map(|k| k.pubkey.clone())
            .collect(),
    }
}

fn extract_program_ids(message: &UiMessage, account_keys: &[String]) -> HashSet<String> {
    let mut ids = HashSet::new();
    match message {
        UiMessage::Raw(raw) => {
            for ix in &raw.instructions {
                if let Some(id) = account_keys.get(ix.program_id_index as usize) {
                    ids.insert(id.clone());
                }
            }
        }
        UiMessage::Parsed(parsed) => {
            for ix in &parsed.instructions {
                if let Some(id) = ui_instruction_program_id(ix, account_keys) {
                    ids.insert(id);
                }
            }
        }
    }
    ids
}

fn extract_inner_program_ids(
    meta: &UiTransactionStatusMeta,
    account_keys: &[String],
) -> HashSet<String> {
    let mut ids = HashSet::new();
    for group in extract_inner_instructions(meta) {
        for ix in &group.instructions {
            if let Some(id) = ui_instruction_program_id(ix, account_keys) {
                ids.insert(id);
            }
        }
    }
    ids
}

fn ui_instruction_program_id(ix: &UiInstruction, account_keys: &[String]) -> Option<String> {
    match ix {
        UiInstruction::Compiled(ix) => account_keys.get(ix.program_id_index as usize).cloned(),
        UiInstruction::Parsed(UiParsedInstruction::Parsed(ix)) => Some(ix.program_id.clone()),
        UiInstruction::Parsed(UiParsedInstruction::PartiallyDecoded(ix)) => {
            Some(ix.program_id.clone())
        }
    }
}

fn extract_inner_instructions(meta: &UiTransactionStatusMeta) -> &[UiInnerInstructions] {
    match meta.inner_instructions.as_ref() {
        OptionSerializer::Some(inner) => inner,
        _ => &[],
    }
}

fn extract_log_messages(meta: &UiTransactionStatusMeta) -> Option<Vec<String>> {
    match meta.log_messages.as_ref() {
        OptionSerializer::Some(logs) => Some(logs.clone()),
        _ => None,
    }
}

// ─── URL Helpers ──────────────────────────────────────────────────────────────

fn subscriber_rpc_url(cfg: &Config) -> String {
    if looks_like_helius_host(&cfg.solana_rpc_url) {
        return ensure_api_key_query(http_url(&cfg.solana_rpc_url), &cfg.helius_api_key);
    }
    if looks_like_helius_host(&cfg.geyser_endpoint) {
        return ensure_api_key_query(http_url(&cfg.geyser_endpoint), &cfg.helius_api_key);
    }
    cfg.solana_rpc_url.clone()
}

fn websocket_url(cfg: &Config) -> String {
    // ALWAYS use GEYSER_ENDPOINT if provided
    if !cfg.geyser_endpoint.is_empty() {
        return ws_url(&cfg.geyser_endpoint);
    }

    // fallback only if missing
    ws_url(&cfg.solana_rpc_url)
}

fn looks_like_helius_host(url: &str) -> bool {
    url.contains("helius-rpc.com")
}

fn http_url(url: &str) -> String {
    if url.starts_with("wss://") {
        url.replacen("wss://", "https://", 1)
    } else if url.starts_with("ws://") {
        url.replacen("ws://", "http://", 1)
    } else {
        url.to_string()
    }
}

fn ws_url(url: &str) -> String {
    if url.starts_with("https://") {
        url.replacen("https://", "wss://", 1)
    } else if url.starts_with("http://") {
        url.replacen("http://", "ws://", 1)
    } else {
        url.to_string()
    }
}

fn ensure_api_key_query(url: String, api_key: &str) -> String {
    if api_key.is_empty() || url.contains("api-key=") {
        return url;
    }
    if url.contains('?') {
        format!("{}&api-key={}", url, api_key)
    } else {
        format!("{}?api-key={}", url, api_key)
    }
}

fn retry_jitter_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| (d.subsec_nanos() as u64) % 100)
        .unwrap_or(0)
}

fn prune_seen_signatures(seen: &mut HashMap<String, Instant>) {
    const KEEP_FOR: Duration = Duration::from_secs(30);
    let now = Instant::now();
    seen.retain(|_, t| now.duration_since(*t) < KEEP_FOR);
}
