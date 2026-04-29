// watcher/src/rules/flash_loan.rs
//
// Rule 1: Flash Loan + TVL Drain
//
// Detects the classic exploit pattern:
//   1. Attacker takes a flash loan (borrow large amount, must repay in same tx)
//   2. Uses borrowed funds to manipulate price or drain a protocol vault
//   3. Repays the flash loan — but protocol has been drained
//
// The flash loan tx and drain tx are often SEPARATE transactions in the same
// or adjacent slots. This rule uses a 5-slot window to correlate them.
//
// Scoring:
//   Old: binary 90 if (has_flash_loan AND tvl_drop > 15%) else 0
//   New: graduated score = base_score(tvl_drop) * flash_confidence / 100
//
// This means:
//   - A Solend flash loan (confidence=95) + 50% TVL drop → score ~90
//   - A log-keyword-only detection (confidence=70) + 16% TVL drop → score ~52
//   - A delta-pattern-only detection (confidence=55) + 16% TVL drop → score ~41
//
// The engine only fires an alert if score >= cfg.min_severity_to_pause (default 70).
// So low-confidence detections need a larger TVL drop to trigger.

use crate::types::SlotSnapshot;

/// Evaluate the flash loan drain rule against a rolling window of slot snapshots.
/// Returns a severity score 0–95 (0 = no alert).
///
/// # Arguments
/// * `window` — ordered slice of SlotSnapshots, oldest first, newest last.
///              Typically 5 slots from the engine's VecDeque.
/// * `peak_tvl` — persisted per-protocol peak TVL used as the pre-drain baseline.
pub fn score(window: &[&SlotSnapshot], peak_tvl: f64) -> u8 {
    // Need at least 2 slots to compute a TVL drop
    if window.len() < 2 {
        return 0;
    }

    // Use up to last 5 slots
    let recent_start = window.len().saturating_sub(5);
    let recent = &window[recent_start..];

    // ── Step 1: Find the highest flash loan confidence in the window ──────────
    //
    // We look across ALL txs in ALL recent slots, not just the current slot.
    // This is crucial: the flash loan borrow and the drain are often in different
    // slots. The borrow tx ends with TVL unchanged (loan repaid atomically),
    // the drain is a separate tx that follows.
    let max_confidence: u8 = recent
        .iter()
        .map(|snap| snap.max_flash_confidence())
        .max()
        .unwrap_or(0);

    // No flash loan detected in this window — Rule 1 cannot fire
    if max_confidence == 0 {
        return 0;
    }

    // ── Step 2: Compute TVL drop across the window ────────────────────────────
    //
    // Use the persisted peak as baseline so a post-drain window does not
    // forget the real pre-attack TVL.
    let baseline_tvl = if peak_tvl > 10_000.0 {
        peak_tvl
    } else {
        recent.first().map(|s| s.tvl_usd).unwrap_or(0.0)
    };
    let newest_tvl = recent.last().map(|s| s.tvl_usd).unwrap_or(0.0);

    // Skip protocols with very low TVL — likely noise, not a real protocol.
    // $10k minimum to avoid false positives on test deployments.
    if baseline_tvl < 10_000.0 {
        return 0;
    }

    // TVL went UP or stayed flat — no drain happened
    if newest_tvl >= baseline_tvl {
        return 0;
    }

    let drop_fraction = (baseline_tvl - newest_tvl) / baseline_tvl;

    // ── Step 3: Compute base score from TVL drop severity ─────────────────────
    //
    // Graduated thresholds — a 90% drain and a 16% drain are very different.
    // Max base score is 95, not 100, to preserve headroom for future
    // multi-rule correlation in the engine.
    if drop_fraction < 0.20 {
        return 0;
    }
    
    let base_score: u8 = match () {
    _ if drop_fraction >= 0.80 => 95,
    _ if drop_fraction >= 0.50 => 88,
    _ if drop_fraction >= 0.30 => 80,
    _ if drop_fraction >= 0.20 => 72,  // new bracket replacing the 0.15 one
    _                          => 0,
    };

    if base_score == 0 {
        return 0;
    }

    // ── Step 4: Weight by flash loan confidence ───────────────────────────────
    //
    // final_score = base_score × (confidence / 100)
    //
    // Examples:
    //   Solend program ID matched (95) + 50% drain (88) → 88 * 95/100 = 83 ✓ fires
    //   Log keyword only (70) + 20% drain (70)          → 70 * 70/100 = 49 ✗ no fire (< 70 threshold)
    //   Log keyword only (70) + 50% drain (88)          → 88 * 70/100 = 61 ✗ borderline
    //   Two methods agree (85) + 30% drain (80)         → 80 * 85/100 = 68 ✗ just under
    //   Two methods agree (85) + 50% drain (88)         → 88 * 85/100 = 74 ✓ fires
    //
    // This means a low-confidence detection NEEDS a large TVL drop to fire.
    // A high-confidence detection (known program ID) fires even on smaller drops.
    let corroborated = recent.iter().any(|snap| {
        snap.transactions
            .iter()
            .any(|tx| tx.flash_evidence.methods_fired.count_ones() >= 2)
    });
    let effective_confidence = if max_confidence >= 70 && corroborated {
        (max_confidence + 10).min(95)
    } else {
        max_confidence
    };

    let weighted = (base_score as u16 * effective_confidence as u16) / 100;
    weighted.min(95) as u8
}

/// Diagnostic info for logging — returns human-readable breakdown of why
/// the rule scored what it did. Called only when score > 0.
pub fn explain(window: &[&SlotSnapshot], peak_tvl: f64) -> String {
    if window.len() < 2 {
        return "insufficient window".to_string();
    }

    let recent_start = window.len().saturating_sub(5);
    let recent = &window[recent_start..];

    let max_confidence = recent
        .iter()
        .map(|s| s.max_flash_confidence())
        .max()
        .unwrap_or(0);

    // Find which slot had the flash loan and which method fired
    let flash_detail = recent
        .iter()
        .flat_map(|snap| {
            snap.transactions
                .iter()
                .filter(|tx| tx.flash_evidence.detected)
                .map(|tx| {
                    let methods = format!(
                        "{}{}{}",
                        if tx.flash_evidence.by_program_id() {
                            "program_id "
                        } else {
                            ""
                        },
                        if tx.flash_evidence.by_log_keyword() {
                            "log_keyword "
                        } else {
                            ""
                        },
                        if tx.flash_evidence.by_delta_pattern() {
                            "delta_pattern"
                        } else {
                            ""
                        },
                    );
                    format!(
                        "slot={} sig={} confidence={} methods=[{}] borrow=${:.0}",
                        snap.slot,
                        &tx.signature[..8],
                        tx.flash_evidence.confidence,
                        methods.trim(),
                        tx.flash_evidence.max_borrow_amount as f64 / 1_000_000.0,
                    )
                })
        })
        .next()
        .unwrap_or_else(|| "unknown".to_string());

    let baseline_tvl = if peak_tvl > 10_000.0 {
        peak_tvl
    } else {
        recent.first().map(|s| s.tvl_usd).unwrap_or(0.0)
    };
    let newest_tvl = recent.last().map(|s| s.tvl_usd).unwrap_or(0.0);
    let drop_pct = if baseline_tvl > 0.0 {
        (baseline_tvl - newest_tvl) / baseline_tvl * 100.0
    } else {
        0.0
    };

    format!(
        "flash_loan=[{}] tvl_drop={:.1}% (${:.0}→${:.0}) window={} slots confidence={}",
        flash_detail,
        drop_pct,
        baseline_tvl,
        newest_tvl,
        recent.len(),
        max_confidence,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{CpiMetrics, FlashLoanEvidence, ParsedTransaction, SlotSnapshot};

    fn score_with_peak(snaps: &[SlotSnapshot], peak_tvl: f64) -> u8 {
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        score(&refs, peak_tvl)
    }

    fn make_tx(is_flash: bool, confidence: u8) -> ParsedTransaction {
        ParsedTransaction {
            slot: 1,
            signature: "test".repeat(8),
            program_ids: vec![],
            token_deltas: vec![],
            cpi: CpiMetrics::zero(),
            log_messages: vec![],
            flash_evidence: if is_flash {
                FlashLoanEvidence {
                    detected: true,
                    confidence,
                    methods_fired: 0b001,
                    program_id: Some("Solend".to_string()),
                    max_borrow_amount: 1_000_000_000_000,
                }
            } else {
                FlashLoanEvidence::none()
            },
            fee_payer: "feepayer".to_string(),
            timestamp: 0,
        }
    }

    fn make_snap(slot: u64, tvl: f64, has_flash: bool, confidence: u8) -> SlotSnapshot {
        SlotSnapshot {
            slot,
            protocol: "test_protocol".to_string(),
            tvl_usd: tvl,
            transactions: if has_flash {
                vec![make_tx(true, confidence)]
            } else {
                vec![]
            },
            bridge_outflow_usd: 0.0,
            timestamp: 0,
        }
    }

    #[test]
    fn no_flash_loan_no_score() {
        let snaps = vec![
            make_snap(1, 1_000_000.0, false, 0),
            make_snap(2, 500_000.0, false, 0),
        ];
        assert_eq!(score_with_peak(&snaps, 1_000_000.0), 0);
    }

    #[test]
    fn flash_loan_no_tvl_drop_no_score() {
        let snaps = vec![
            make_snap(1, 1_000_000.0, true, 95),
            make_snap(2, 1_000_000.0, false, 0),
        ];
        assert_eq!(score_with_peak(&snaps, 1_000_000.0), 0);
    }

    #[test]
    fn high_confidence_large_drop_fires() {
        let snaps = vec![
            make_snap(1, 1_000_000.0, true, 95),
            make_snap(2, 100_000.0, false, 0), // 90% drop
        ];
        let s = score_with_peak(&snaps, 1_000_000.0);
        assert!(s >= 80, "expected score >= 80, got {}", s);
    }

    #[test]
    fn low_confidence_small_drop_does_not_fire() {
        let snaps = vec![
            make_snap(1, 1_000_000.0, true, 55), // delta pattern only
            make_snap(2, 840_000.0, false, 0),   // 16% drop
        ];
        let s = score_with_peak(&snaps, 1_000_000.0);
        // 70 * 55/100 = 38 — well below the 70 alert threshold
        assert!(s < 50, "expected low score, got {}", s);
    }

    #[test]
    fn low_tvl_protocol_skipped() {
        let snaps = vec![
            make_snap(1, 5_000.0, true, 95), // $5k TVL — below $10k floor
            make_snap(2, 100.0, false, 0),
        ];
        assert_eq!(score_with_peak(&snaps, 5_000.0), 0);
    }

    #[test]
    fn flash_loan_in_earlier_slot_drain_in_later_slot() {
        // Flash loan borrow in slot 1, drain in slot 2 — common real pattern
        let snaps = vec![
            make_snap(1, 1_000_000.0, true, 95), // flash loan here
            make_snap(2, 1_000_000.0, false, 0), // TVL still high (loan repaid)
            make_snap(3, 200_000.0, false, 0),   // drain happens here (80% drop)
        ];
        let s = score_with_peak(&snaps, 1_000_000.0);
        // Should detect: flash in window, 80% drop across window
        assert!(s >= 75, "expected score >= 75, got {}", s);
    }

    #[test]
    fn persisted_peak_beats_post_drain_window_baseline() {
        let snaps = vec![
            make_snap(10, 1_100_051.0, true, 80),
            make_snap(11, 980_000.0, false, 0),
            make_snap(12, 820_000.0, false, 0),
            make_snap(13, 700_000.0, false, 0),
            make_snap(14, 643_157.0, false, 0),
        ];

        let s = score_with_peak(&snaps, 1_556_920.0);
        assert!(s >= 70, "persisted peak baseline should fire, got {}", s);
    }
}
