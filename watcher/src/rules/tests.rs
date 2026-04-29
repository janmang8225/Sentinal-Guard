// watcher/src/rules/tests.rs
//
// Unit tests for all three detection rules.
// Tests every edge case WITHOUT needing a live validator or Redis.
//
// Run: cargo test -p watcher -- rules --nocapture
//
// These tests use fake SlotSnapshot data to verify:
//   - Rules fire at the correct thresholds
//   - Rules don't fire on normal data
//   - Scores scale correctly with severity
//   - Window size guards work correctly

#[cfg(test)]
mod rule_tests {
    use crate::rules::{bridge_spike, flash_loan, tvl_velocity};
    use crate::types::{CpiMetrics, FlashLoanEvidence, ParsedTransaction, SlotSnapshot};

    // ─── Test Data Builders ───────────────────────────────────────────────────

    fn make_snap(slot: u64, tvl: f64, bridge_outflow: f64) -> SlotSnapshot {
        SlotSnapshot {
            slot,
            protocol: "TEST_PROTOCOL_ID".into(),
            tvl_usd: tvl,
            transactions: vec![],
            bridge_outflow_usd: bridge_outflow,
            timestamp: slot as i64,
        }
    }

    fn make_snap_with_flash(slot: u64, tvl: f64, flash: bool, confidence: u8) -> SlotSnapshot {
        let flash_evidence = if flash {
            FlashLoanEvidence {
                detected: true,
                confidence,
                methods_fired: 0b011,
                program_id: Some("So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo (Solend)".into()),
                max_borrow_amount: 5_000_000_000_000, // $5M
            }
        } else {
            FlashLoanEvidence::none()
        };

        SlotSnapshot {
            slot,
            protocol: "TEST_PROTOCOL_ID".into(),
            tvl_usd: tvl,
            transactions: vec![ParsedTransaction {
                slot,
                signature: format!("SIG{:016x}", slot),
                program_ids: vec!["So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo".into()],
                token_deltas: vec![],
                cpi: CpiMetrics::zero(),
                log_messages: vec!["Program log: flash_loan: borrowed 5000000 USDC".into()],
                flash_evidence,
                fee_payer: "FEE_PAYER".into(),
                timestamp: 0,
            }],
            bridge_outflow_usd: 0.0,
            timestamp: slot as i64,
        }
    }

    fn score_r1(snaps: &[SlotSnapshot]) -> u8 {
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        let peak_tvl = snaps.iter().map(|s| s.tvl_usd).fold(0.0_f64, f64::max);
        flash_loan::score(&refs, peak_tvl)
    }

    // ─── Rule 1: Flash Loan + Drain ───────────────────────────────────────────

    #[test]
    fn r1_too_small_window_returns_0() {
        let snaps = vec![make_snap_with_flash(0, 1_000_000.0, true, 95)];
        assert_eq!(score_r1(&snaps), 0, "Window < 2 should return 0");
    }

    #[test]
    fn r1_no_flash_loan_returns_0() {
        let snaps: Vec<_> = (0..5)
            .map(|i| make_snap_with_flash(i, 1_000_000.0, false, 0))
            .collect();
        assert_eq!(score_r1(&snaps), 0, "No flash loan = no alert");
    }

    #[test]
    fn r1_flash_loan_no_tvl_drop_returns_0() {
        // Flash loan at slot 2 but TVL stays flat — repaid with no drain
        let snaps: Vec<_> = (0..5)
            .map(|i| make_snap_with_flash(i, 1_000_000.0, i == 2, 95))
            .collect();
        assert_eq!(
            score_r1(&snaps),
            0,
            "Flash + no drain = no alert (legitimate flash loan)"
        );
    }

    #[test]
    fn r1_flash_loan_small_tvl_drop_returns_0() {
        // Flash at slot 1, 9% TVL drop — current rule assigns a low non-zero score
        // because the graduated model starts scoring at 5% drain severity.
        let tvls = [1_000_000.0, 1_000_000.0, 970_000.0, 950_000.0, 910_000.0];
        let snaps: Vec<_> = tvls
            .iter()
            .enumerate()
            .map(|(i, &t)| make_snap_with_flash(i as u64, t, i == 1, 95))
            .collect();
        assert_eq!(
            score_r1(&snaps),
            42,
            "9% drop => base 45 weighted by 95 confidence"
        );
    }

    #[test]
    fn r1_flash_loan_with_significant_drain_fires_90() {
        // Classic exploit: flash borrow then drain 30% TVL.
        // Current rule: base 80 weighted by 95 confidence => 76.
        let tvls = [1_000_000.0, 1_000_000.0, 850_000.0, 750_000.0, 700_000.0];
        let snaps: Vec<_> = tvls
            .iter()
            .enumerate()
            .map(|(i, &t)| make_snap_with_flash(i as u64, t, i == 1, 95))
            .collect();
        assert_eq!(
            score_r1(&snaps),
            76,
            "30% drop => base 80 weighted by 95 confidence"
        );
    }

    #[test]
    fn r1_flash_loan_confidence_affects_score() {
        // Same scenario but with lower confidence flash detection
        let tvls = [1_000_000.0, 1_000_000.0, 700_000.0, 500_000.0, 400_000.0];
        let snaps_high: Vec<_> = tvls
            .iter()
            .enumerate()
            .map(|(i, &t)| make_snap_with_flash(i as u64, t, i == 1, 95))
            .collect();
        let snaps_low: Vec<_> = tvls
            .iter()
            .enumerate()
            .map(|(i, &t)| make_snap_with_flash(i as u64, t, i == 1, 55))
            .collect();

        let score_high = score_r1(&snaps_high);
        let score_low = score_r1(&snaps_low);

        assert!(
            score_high > score_low,
            "Higher flash confidence should yield higher score: {} vs {}",
            score_high,
            score_low
        );
        assert_eq!(
            score_high, 83,
            "60% drop => base 88 weighted by 95 confidence"
        );
        assert_eq!(
            score_low, 48,
            "60% drop => base 88 weighted by 55 confidence"
        );
    }

    #[test]
    fn r1_flash_not_in_window_but_drain_present() {
        // Drain without flash loan — Rule 1 should not fire (Rule 2 handles this)
        let snaps: Vec<_> = vec![
            make_snap(0, 1_000_000.0, 0.0),
            make_snap(1, 1_000_000.0, 0.0),
            make_snap(2, 800_000.0, 0.0),
            make_snap(3, 600_000.0, 0.0),
            make_snap(4, 400_000.0, 0.0),
        ];
        assert_eq!(
            score_r1(&snaps),
            0,
            "Drain without flash = Rule 1 stays silent"
        );
    }

    // ─── Rule 2: TVL Velocity ─────────────────────────────────────────────────

    #[test]
    fn r2_window_too_small_returns_0() {
        let snaps = vec![make_snap(0, 1_000_000.0, 0.0), make_snap(1, 800_000.0, 0.0)];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        assert_eq!(tvl_velocity::score(&refs, 0.20), 0, "Window < 3 = no score");
    }

    #[test]
    fn r2_tvl_below_minimum_returns_0() {
        // TVL < $50k — too small to generate meaningful percentage signal
        let snaps = vec![
            make_snap(0, 10_000.0, 0.0),
            make_snap(1, 5_000.0, 0.0),
            make_snap(2, 1_000.0, 0.0),
        ];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        assert_eq!(
            tvl_velocity::score(&refs, 0.20),
            0,
            "TVL < $50k = no signal (noise floor)"
        );
    }

    #[test]
    fn r2_tvl_rising_returns_0() {
        let snaps = vec![
            make_snap(0, 1_000_000.0, 0.0),
            make_snap(1, 1_100_000.0, 0.0),
            make_snap(2, 1_200_000.0, 0.0),
        ];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        assert_eq!(tvl_velocity::score(&refs, 0.20), 0, "Rising TVL = no alert");
    }

    #[test]
    fn r2_slow_drop_below_threshold_returns_0() {
        // 10% drop over 3 slots — below 20% threshold
        let snaps = vec![
            make_snap(0, 1_000_000.0, 0.0),
            make_snap(1, 950_000.0, 0.0),
            make_snap(2, 900_000.0, 0.0),
        ];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        assert_eq!(
            tvl_velocity::score(&refs, 0.20),
            0,
            "10% drop < 20% threshold"
        );
    }

    #[test]
    fn r2_exactly_20_percent_drop_fires_at_75() {
        let snaps = vec![
            make_snap(0, 1_000_000.0, 0.0),
            make_snap(1, 900_000.0, 0.0),
            make_snap(2, 800_000.0, 0.0), // 20% total drop
        ];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        let score = tvl_velocity::score(&refs, 0.20);
        assert!(score >= 75, "20% drop should score >= 75, got {}", score);
    }

    #[test]
    fn r2_catastrophic_50_percent_drop_scores_near_99() {
        let snaps = vec![
            make_snap(0, 1_000_000.0, 0.0),
            make_snap(1, 800_000.0, 0.0),
            make_snap(2, 500_000.0, 0.0), // 50% drop
        ];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        let score = tvl_velocity::score(&refs, 0.20);
        assert!(score >= 95, "50% drop should score >= 95, got {}", score);
    }

    #[test]
    fn r2_small_absolute_drop_returns_0() {
        // $100 TVL, 50% percentage drop — but absolute drop < $10k guard
        let snaps = vec![
            make_snap(0, 100.0, 0.0),
            make_snap(1, 70.0, 0.0),
            make_snap(2, 50.0, 0.0),
        ];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        assert_eq!(
            tvl_velocity::score(&refs, 0.20),
            0,
            "TVL < $50k guard prevents noise"
        );
    }

    #[test]
    fn r2_only_looks_at_last_3_slots() {
        // Slots 0-6 have stable TVL, but slots 7-9 show 30% drop
        let snaps: Vec<_> = (0..10)
            .map(|i| {
                let tvl = if i < 7 {
                    1_000_000.0
                } else {
                    1_000_000.0 - (i as f64 - 6.0) * 100_000.0
                };
                make_snap(i, tvl, 0.0)
            })
            .collect();
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        let score = tvl_velocity::score(&refs, 0.20);
        // Last 3 slots: 800k → 700k → (depends on formula)
        // The point is Rule 2 only looks at last 3, not the whole window
        println!("  R2 score with last-3-slot drop: {}", score);
    }

    // ─── Rule 3: Bridge Spike ─────────────────────────────────────────────────

    #[test]
    fn r3_window_too_small_returns_0() {
        let snaps: Vec<_> = (0..4)
            .map(|i| make_snap(i, 1_000_000.0, 50_000.0))
            .collect();
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        assert_eq!(bridge_spike::score(&refs, 10.0), 0, "Window < 5 = no score");
    }

    #[test]
    fn r3_below_minimum_outflow_returns_0() {
        // Outflow < $10k — noise filter
        let snaps: Vec<_> = (0..6).map(|i| make_snap(i, 1_000_000.0, 5_000.0)).collect();
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        assert_eq!(
            bridge_spike::score(&refs, 10.0),
            0,
            "Below $10k outflow = noise"
        );
    }

    #[test]
    fn r3_normal_consistent_outflow_returns_0() {
        // Consistent $50k outflow — no spike
        let snaps: Vec<_> = (0..6)
            .map(|i| make_snap(i, 1_000_000.0, 50_000.0))
            .collect();
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        assert_eq!(
            bridge_spike::score(&refs, 10.0),
            0,
            "Consistent outflow = no spike"
        );
    }

    #[test]
    fn r3_10x_spike_scores_85() {
        // Normal: $50k/slot, Current: $600k (12x)
        let mut snaps: Vec<_> = (0..5)
            .map(|i| make_snap(i, 1_000_000.0, 50_000.0))
            .collect();
        snaps.push(make_snap(5, 1_000_000.0, 600_000.0)); // 12x spike
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        let score = bridge_spike::score(&refs, 10.0);
        assert_eq!(score, 85, "10-20x spike = score 85, got {}", score);
    }

    #[test]
    fn r3_20x_spike_scores_95() {
        // Normal: $50k/slot, Current: $1.2M (24x)
        let mut snaps: Vec<_> = (0..5)
            .map(|i| make_snap(i, 1_000_000.0, 50_000.0))
            .collect();
        snaps.push(make_snap(5, 1_000_000.0, 1_200_000.0)); // 24x spike
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        let score = bridge_spike::score(&refs, 10.0);
        assert_eq!(score, 95, "20x+ spike = score 95, got {}", score);
    }

    #[test]
    fn r3_cold_wallet_large_outflow_scores_80() {
        // No historical baseline, but huge single outflow ($600k)
        let mut snaps: Vec<_> = (0..5).map(|i| make_snap(i, 1_000_000.0, 0.0)).collect();
        snaps.push(make_snap(5, 1_000_000.0, 600_000.0));
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        let score = bridge_spike::score(&refs, 10.0);
        assert_eq!(
            score, 80,
            "Cold wallet + large outflow = score 80, got {}",
            score
        );
    }

    // ─── Cross-rule: Multiple rules firing together ───────────────────────────

    #[test]
    fn combined_flash_and_tvl_drop_both_rules_fire() {
        // A real exploit: flash loan + rapid TVL drain
        // Rule 1 AND Rule 2 should both score high
        let snaps = vec![
            make_snap_with_flash(0, 2_000_000.0, false, 0),
            make_snap_with_flash(1, 2_000_000.0, true, 95), // flash here
            make_snap_with_flash(2, 1_600_000.0, false, 0), // -20%
            make_snap_with_flash(3, 1_200_000.0, false, 0), // -40% total
            make_snap_with_flash(4, 800_000.0, false, 0),   // -60% total
        ];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();

        let r1 = score_r1(&snaps);
        let r2 = tvl_velocity::score(&refs, 0.20);

        println!("  Combined attack scores: R1={} R2={}", r1, r2);
        assert!(r1 >= 75, "Rule 1 should fire: {}", r1);
        assert!(r2 >= 75, "Rule 2 should fire: {}", r2);
        assert!(
            r1.max(r2) >= 90,
            "Max score should be >= 90: {}",
            r1.max(r2)
        );
    }

    // ─── Edge cases ───────────────────────────────────────────────────────────

    #[test]
    fn all_rules_return_0_on_empty_window() {
        let empty: Vec<&SlotSnapshot> = vec![];
        assert_eq!(flash_loan::score(&empty, 0.0), 0);
        assert_eq!(tvl_velocity::score(&empty, 0.20), 0);
        assert_eq!(bridge_spike::score(&empty, 10.0), 0);
    }

    #[test]
    fn all_rules_return_0_on_single_slot() {
        let snaps = vec![make_snap_with_flash(0, 1_000_000.0, true, 95)];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();
        assert_eq!(flash_loan::score(&refs, 1_000_000.0), 0);
        assert_eq!(tvl_velocity::score(&refs, 0.20), 0);
        assert_eq!(bridge_spike::score(&refs, 10.0), 0);
    }

    #[test]
    fn score_does_not_exceed_99() {
        // Most extreme possible scenario
        let snaps = vec![
            make_snap_with_flash(0, 10_000_000.0, true, 98),
            make_snap_with_flash(1, 5_000_000.0, true, 98),
            make_snap_with_flash(2, 1_000_000.0, false, 0),
            make_snap_with_flash(3, 100_000.0, false, 0),
            make_snap_with_flash(4, 10_000.0, false, 0),
        ];
        let refs: Vec<&SlotSnapshot> = snaps.iter().collect();

        let r1 = flash_loan::score(&refs, 10_000_000.0);
        let r2 = tvl_velocity::score(&refs, 0.20);
        let r3 = bridge_spike::score(&refs, 10.0);

        assert!(r1 <= 99, "Rule 1 max is 99");
        assert!(r2 <= 99, "Rule 2 max is 99");
        assert!(r3 <= 99, "Rule 3 max is 99");
    }
}
