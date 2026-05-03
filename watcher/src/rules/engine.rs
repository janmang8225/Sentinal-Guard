// watcher/src/rules/engine.rs
//
// Detection engine — reads ParsedTransactions from the broadcast channel,
// maintains per-protocol rolling windows, and runs all three rules every slot.
//
// Changes from previous version:
//   - Uses tx.flash_evidence.detected instead of tx.is_flash_loan
//   - Uses tx.cpi.suspicion_score() as a supplemental signal
//   - Rule 1 score now uses flash confidence weighting (see flash_loan.rs)
//   - Alert dedup via Redis before broadcasting (prevents double-fire on restart)
//   - Logs CPI metrics on high-severity alerts for forensics

use std::collections::HashMap;
use std::collections::VecDeque;

use anyhow::Result;
use redis::aio::ConnectionManager;
use sha2::{Digest, Sha256};
use tokio::sync::broadcast;
use tracing::{debug, info, warn};

use crate::config::Config;
use crate::db::DbPool;
use crate::types::{
    AlertEvent, ParsedTransaction, ProtocolWindow, RuleType, SlotSnapshot, TvlCache,
};

struct WatchedProtocol {
    window: ProtocolWindow,
    peak_tvl: f64,
}

pub async fn run(
    cfg: Config,
    mut rx: broadcast::Receiver<ParsedTransaction>,
    alert_tx: broadcast::Sender<AlertEvent>,
    db: DbPool,
    mut redis: ConnectionManager,
    watcher_pubkey: String,
) -> Result<()> {
    // Per-protocol rolling window + persisted peak TVL baseline.
    let mut windows: HashMap<String, WatchedProtocol> = HashMap::new();

    for program in &cfg.watched_programs {
        windows.insert(
            program.clone(),
            WatchedProtocol {
                window: VecDeque::with_capacity(cfg.window_size + 1),
                peak_tvl: 0.0,
            },
        );
    }

    info!(
        "Detection engine live — window={} slots, TVL threshold={:.0}%, min_severity={}",
        cfg.window_size,
        cfg.tvl_drop_threshold * 100.0,
        cfg.min_severity_to_pause,
    );

    loop {
        match rx.recv().await {
            Ok(tx) => {
                // Determine which watched protocol this tx belongs to.
                // A tx can touch multiple watched programs — we attribute it to
                // the first match. This is fine because each program has its own window.
                let Some(protocol) = tx
                    .program_ids
                    .iter()
                    .find(|id| cfg.watched_programs.contains(id))
                    .cloned()
                else {
                    continue;
                };

                debug!(
                    "Slot {} — tx {} → {}... flash={} confidence={} cpi_depth={} cpi_total={}",
                    tx.slot,
                    &tx.signature[..8],
                    &protocol[..8],
                    tx.flash_evidence.detected,
                    tx.flash_evidence.confidence,
                    tx.cpi.max_depth,
                    tx.cpi.total_cpi_count,
                );

                // ── Update rolling window ──────────────────────────────────────

                let entry = windows
                    .entry(protocol.clone())
                    .or_insert_with(|| WatchedProtocol {
                        window: VecDeque::with_capacity(cfg.window_size + 1),
                        peak_tvl: 0.0,
                    });

                // Read current TVL from Redis — written by geyser.rs on every tx.
                // If Redis is cold or missing, treat TVL as 0 and rely on the
                // peak/noise guards below instead of inventing a baseline.
                let tvl_raw = read_tvl_from_redis(&mut redis, &protocol)
                    .await
                    .unwrap_or(0.0);

                // Sanitize cold-start spikes from empty or stale cache reads.
                const MAX_PLAUSIBLE_TVL: f64 = 500_000_000.0;
                let tvl = if tvl_raw > MAX_PLAUSIBLE_TVL {
                    0.0
                } else {
                    tvl_raw
                };

                // Persist the strongest pre-drain baseline across the rolling window.
                if tvl > 10_000.0 {
                    entry.peak_tvl = entry.peak_tvl.max(tvl);
                }

                debug!(
                    "Slot {} TVL read: ${:.0} peak=${:.0} (protocol={}...)",
                    tx.slot,
                    tvl,
                    entry.peak_tvl,
                    &protocol[..8]
                );

                let peak_tvl = entry.peak_tvl;
                let window = &mut entry.window;
                let bridge_outflow = compute_bridge_outflow(&tx);

                // Same slot → merge into existing snapshot (multiple txs per slot is normal)
                // New slot → append snapshot and evict the oldest if window is full
                let snapshot_exists = window.back().map_or(false, |s| s.slot == tx.slot);

                if snapshot_exists {
                    if let Some(snap) = window.back_mut() {
                        snap.transactions.push(tx.clone());
                        // Update TVL to the latest reading — more recent = more accurate
                        snap.tvl_usd = tvl;
                        snap.bridge_outflow_usd += bridge_outflow;
                    }
                } else {
                    if window.len() >= cfg.window_size {
                        window.pop_front(); // evict oldest slot
                    }
                    window.push_back(SlotSnapshot {
                        slot: tx.slot,
                        protocol: protocol.clone(),
                        tvl_usd: tvl,
                        transactions: vec![tx.clone()],
                        bridge_outflow_usd: bridge_outflow,
                        timestamp: tx.timestamp,
                    });
                }

                // ── Run detection rules ────────────────────────────────────────

                let window_slice: Vec<&SlotSnapshot> = window.iter().collect();

                // Rule 1: Flash loan + TVL drain (confidence-weighted)
                let score1 = crate::rules::flash_loan::score(&window_slice, peak_tvl);

                // Rule 2: TVL velocity (rapid drain without detected flash loan)
                let score2 =
                    crate::rules::tvl_velocity::score(&window_slice, cfg.tvl_drop_threshold);

                // Rule 3: Bridge outflow spike (funds leaving Solana via bridge)
                let score3 =
                    crate::rules::bridge_spike::score(&window_slice, cfg.bridge_spike_multiplier);
                // After computing scores, log them

                // Take the highest-scoring rule — one alert per slot per protocol
                let (max_score, fired_rule) = [
                    (score1, RuleType::FlashLoanDrain),
                    (score2, RuleType::TvlVelocity),
                    (score3, RuleType::BridgeOutflowSpike),
                ]
                .into_iter()
                .max_by_key(|(s, _)| *s)
                .unwrap();
                debug!(
                    "Scores: R1={} R2={} R3={} max={} threshold={}",
                    score1,
                    score2,
                    score3,
                    max_score,
                    cfg.min_severity_to_pause.min(cfg.min_severity_to_publish)
                );
                // Below both alert thresholds — nothing to do
                let min_threshold = cfg.min_severity_to_pause.min(cfg.min_severity_to_publish);

                if max_score < min_threshold {
                    continue;
                }

                // ── Log CPI metrics for forensic analysis ──────────────────────

                if max_score >= 70 && tx.cpi.total_cpi_count > 5 {
                    info!(
                        "High-severity tx CPI metrics | sig={} | depth={} width={} total={} | cpi_suspicion={}",
                        &tx.signature[..16],
                        tx.cpi.max_depth,
                        tx.cpi.max_width,
                        tx.cpi.total_cpi_count,
                        tx.cpi.suspicion_score(),
                    );
                }

                // ── Log flash loan details ─────────────────────────────────────

                if tx.flash_evidence.detected {
                    info!(
                        "Flash loan evidence | sig={} | confidence={} | methods={:#05b} | program={} | borrow=${:.0}",
                        &tx.signature[..16],
                        tx.flash_evidence.confidence,
                        tx.flash_evidence.methods_fired,
                        tx.flash_evidence.program_id.as_deref().unwrap_or("unknown"),
                        tx.flash_evidence.max_borrow_amount as f64 / 1_000_000.0,
                    );
                }

                // ── Build alert ────────────────────────────────────────────────

                let alert = build_alert(
                    &tx,
                    &protocol,
                    &cfg.protocol_authority,
                    max_score,
                    fired_rule,
                    &watcher_pubkey,
                );

                // ── Per-protocol cooldown ──────────────────────────────────────
                // Prevents alert storms when TVL oscillates across threshold.
                // After one alert fires for a protocol, suppress for 30s.
                // ── Per-protocol cooldown ──────────────────────────────────────
                let pause_key = format!("protocol_paused:{}", protocol);
                let _: Result<(), _> = redis::cmd("SET")
                    .arg(&pause_key)
                    .arg(1u8)
                    .arg("EX")
                    .arg(300u64)  // 5 minute optimistic pause window
                    .query_async(&mut redis)
                    .await;
                
                debug!(
                    "Optimistic pause set for protocol {} — on-chain confirmation in flight",
                    &protocol[..8]
                );
                let cooldown_key = format!("alert_cooldown:{}", protocol);

                let on_cooldown: bool = redis::cmd("EXISTS")
                    .arg(&cooldown_key)
                    .query_async(&mut redis)
                    .await
                    .unwrap_or(false);

                if on_cooldown {
                    debug!("Protocol {} on alert cooldown — skipping", &protocol[..8]);
                    continue;
                }

                // ✅ ONLY set cooldown for strong alerts
                if max_score >= 70 {
                    let _: Result<(), _> = redis::cmd("SET")
                        .arg(&cooldown_key)
                        .arg(1u8)
                        .arg("EX")
                        .arg(30u64)
                        .query_async(&mut redis)
                        .await;
                }
                // ── Dedup via Redis ────────────────────────────────────────────
                // Prevents re-firing the same alert if the engine restarts mid-attack.
                // Key: alert_sent:{alert_id_hex} — TTL 5 minutes.
                let dedup_key = format!("alert_sent:{}", alert.alert_id_hex);
                let already_sent: bool = redis::cmd("EXISTS")
                    .arg(&dedup_key)
                    .query_async(&mut redis)
                    .await
                    .unwrap_or(false);

                if already_sent {
                    debug!(
                        "Alert {} already sent — skipping",
                        &alert.alert_id_hex[..16]
                    );
                    continue;
                }

                // Mark as sent (TTL 5min) before dispatching — crash safety
                let _: Result<(), _> = redis::cmd("SET")
                    .arg(&dedup_key)
                    .arg(1u8)
                    .arg("EX")
                    .arg(300u64)
                    .query_async(&mut redis)
                    .await;

                // ── Emit alert ─────────────────────────────────────────────────

                info!(
                    "ALERT | protocol={}... | rule={} | severity={} | at_risk=${:.0} | slot={} | flash_confidence={}",
                    &protocol[..8],
                    alert.rule_triggered,
                    alert.severity,
                    alert.estimated_at_risk_usd,
                    alert.slot,
                    tx.flash_evidence.confidence,
                );

                // Explain Rule 1 scoring if it fired
                if matches!(alert.rule_triggered, RuleType::FlashLoanDrain) {
                    info!(
                        "Rule 1 detail: {}",
                        crate::rules::flash_loan::explain(&window_slice, peak_tvl),
                    );
                }

                // Persist to DB for crash-safe audit trail
                if let Err(e) = crate::db::insert_alert(&db, &alert).await {
                    warn!("Failed to persist alert to DB: {} — still dispatching", e);
                }

                // Broadcast to responder (pause tx) and feed API (webhook)
                if alert_tx.receiver_count() > 0 {
                    if let Err(e) = alert_tx.send(alert) {
                        warn!("Alert channel send error: {}", e);
                    }
                }
            }

            Err(broadcast::error::RecvError::Lagged(n)) => {
                // The detection engine couldn't keep up with the gRPC stream.
                // Broadcast channel dropped n messages. This means we may have
                // missed transactions — log prominently but keep running.
                warn!(
                    "Detection engine lagged — dropped {} transactions. \
                     Increase tx_channel capacity (currently 10_000) if this persists.",
                    n
                );
            }

            Err(broadcast::error::RecvError::Closed) => {
                warn!("Transaction channel closed — detection engine shutting down");
                break;
            }
        }
    }

    Ok(())
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async fn read_tvl_from_redis(redis: &mut ConnectionManager, protocol: &str) -> Result<f64> {
    let key = format!("tvl:{}", protocol);
    let val: String = redis::cmd("GET").arg(&key).query_async(redis).await?;
    let cache: TvlCache = serde_json::from_str(&val)?;
    Ok(cache.tvl_usd)
}

fn compute_bridge_outflow(tx: &ParsedTransaction) -> f64 {
    use crate::geyser::BRIDGE_PROGRAMS;

    let is_bridge_tx = tx
        .program_ids
        .iter()
        .any(|id| BRIDGE_PROGRAMS.contains(&id.as_str()));

    if !is_bridge_tx {
        return 0.0;
    }

    // Sum all negative token deltas as outflow proxy.
    // Negative delta = tokens left these accounts = funds exiting to bridge.
    tx.token_deltas
        .iter()
        .filter(|d| d.delta < 0)
        .map(|d| (-d.delta) as f64 / 1_000_000.0)
        .sum()
}

fn build_alert(
    tx: &ParsedTransaction,
    protocol: &str,
    protocol_authority: &str,
    severity: u8,
    rule: RuleType,
    watcher_pubkey: &str,
) -> AlertEvent {
    // Alert ID = sha256(signature_bytes ++ slot_bytes)
    // Deterministic: same tx + slot always produces same ID.
    // Used as PDA seed on-chain for the pause instruction.
    let mut hasher = Sha256::new();
    hasher.update(protocol.as_bytes());
    hasher.update(tx.slot.to_le_bytes());
    let hash = hasher.finalize();

    let mut alert_id = [0u8; 32];
    alert_id.copy_from_slice(&hash);
    let alert_id_hex = hex::encode(alert_id);

    // Estimated at-risk = sum of all outflows in this tx.
    // Rough proxy — the engine doesn't have full protocol state.
    let estimated_at_risk: f64 = tx
        .token_deltas
        .iter()
        .filter(|d| d.delta < 0)
        .map(|d| (-d.delta) as f64 / 1_000_000.0)
        .sum();

    AlertEvent {
        alert_id,
        alert_id_hex,
        protocol: protocol.to_string(),
        protocol_authority: protocol_authority.to_string(), // ← ADD
        severity,
        rule_triggered: rule,
        estimated_at_risk_usd: estimated_at_risk,
        trigger_tx_signatures: vec![tx.signature.clone()],
        slot: tx.slot,
        timestamp: tx.timestamp,
        watcher_pubkey: watcher_pubkey.to_string(),
    }
}
