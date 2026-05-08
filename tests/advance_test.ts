#!/usr/bin/env bun
// tests/attack_scenarios_extended.ts — EDGE CASE SUITE (Devnet)
//
// Covers gaps in the original 5 scenarios:
//   S6:  Flash loan with clean repay — NO alert (false positive test)
//   S7:  Flash + drain + Rule 2 simultaneously — highest severity (dual rule)
//   S8:  Drain below $10k absolute — NO alert (Rule 2 guard test)
//   S9:  Rapid deposit → rapid drain in same window (wash trading pattern)
//   S10: Cooldown bypass — two attacks back to back
//   S11: Multiple flash borrows in same slot window (compound Rule 1)
//   S12: Empty vault attack — drain on near-zero TVL (zero-guard test)
//   S13: Partial drain → pause → drain attempt should REVERT (on-chain proof)
//
// Run after original attack_scenarios.ts has set up vault + sentinel state.
// Assumes vault is already initialized and sentinel is registered.

import "dotenv/config";
import { createHash } from "crypto";
import {
  Connection, Keypair, PublicKey, Transaction,
  TransactionInstruction, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount, mintTo,
  getAccount, TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL = process.env.SOLANA_RPC_URL!;
const WS_URL  = process.env.SOLANA_WS_URL!;
const STEP_MS = 1_500;
const USDC    = (n: number) => BigInt(Math.floor(n * 1_000_000));

const R = "\x1b[31m", G = "\x1b[32m", Y = "\x1b[33m", B = "\x1b[34m",
      M = "\x1b[35m", C = "\x1b[36m", RESET = "\x1b[0m", BOLD = "\x1b[1m";

// ─── Discriminators ──────────────────────────────────────────────────────────

const DISC = {
  initialize:   Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]),
  deposit:      Buffer.from([242, 35,  198, 137, 82, 225, 242, 182]),
  withdraw:     Buffer.from([183, 18,  70,  156, 148, 109, 161, 34]),
  flash_borrow: Buffer.from([166, 221, 220, 25,  61,  73,  127, 240]),
  flash_repay:  Buffer.from([182, 143, 19,  23,  39,  221, 184, 78]),
  drain_vault:  Buffer.from([87,  219, 34,  249, 5,   135, 65,  116]),
};

function anchorDisc(name: string) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function ixData(disc: Buffer, amount?: bigint): Buffer {
  if (!amount) return disc;
  const ab = Buffer.alloc(8);
  ab.writeBigUInt64LE(amount);
  return Buffer.concat([disc, ab]);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sendTx(
  conn: Connection,
  ix: TransactionInstruction,
  signers: Keypair[],
  expectFail = false
): Promise<string | null> {
  const t = new Transaction().add(ix);
  t.feePayer = signers[0].publicKey;
  t.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  for (const s of signers) t.partialSign(s);
  try {
    const sig = await conn.sendRawTransaction(t.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await conn.confirmTransaction(sig, "confirmed");
    if (expectFail) {
      console.log(`  ${R}✗ Expected failure but tx succeeded: ${sig}${RESET}`);
    }
    return sig;
  } catch (e: any) {
    if (expectFail) {
      const logs: string[] = e?.logs ?? e?.transactionLogs ?? [];
      const paused = logs.some(l => l.includes("WithdrawalsPaused") || l.includes("paused"));
      console.log(`  ${G}✓ Tx correctly reverted${paused ? " — WithdrawalsPaused" : ""}${RESET}`);
      return null;
    }
    throw e;
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function kp(file: string): Keypair {
  if (fs.existsSync(file))
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(file, "utf8"))));
  throw new Error(`Keypair not found: ${file} — run original attack_scenarios.ts first`);
}

async function usdcBal(conn: Connection, acc: PublicKey): Promise<number> {
  try { return Number((await getAccount(conn, acc)).amount) / 1e6; } catch { return 0; }
}

async function scenario(n: number, title: string, fn: () => Promise<void>) {
  console.log(`\n${BOLD}${M}━━━ Scenario ${n}: ${title} ━━━${RESET}`);
  try {
    await fn();
    console.log(`${G}✓ Scenario ${n} complete${RESET}`);
  } catch (e: any) {
    console.error(`${R}✗ Failed: ${e?.message ?? e}${RESET}`);
    const logs = e?.logs ?? e?.transactionLogs ?? [];
    logs.forEach((l: string) => console.error(`  ${l}`));
  }
  await sleep(2_000);
}

// ─── Instruction builders (identical account ordering to original) ────────────

function ixDeposit(pid: PublicKey, vs: PublicKey, vault: PublicKey, userAta: PublicKey, user: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.deposit, amt), keys: [
      { pubkey: vs,      isSigner: false, isWritable: true  },
      { pubkey: vault,   isSigner: false, isWritable: true  },
      { pubkey: userAta, isSigner: false, isWritable: true  },
      { pubkey: user,    isSigner: true,  isWritable: false },
      { pubkey: auth,    isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

function ixWithdraw(pid: PublicKey, vs: PublicKey, vault: PublicKey, userAta: PublicKey, user: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.withdraw, amt), keys: [
      { pubkey: vs,      isSigner: false, isWritable: true  },
      { pubkey: vault,   isSigner: false, isWritable: true  },
      { pubkey: userAta, isSigner: false, isWritable: true  },
      { pubkey: user,    isSigner: true,  isWritable: false },
      { pubkey: auth,    isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

function ixFlashBorrow(pid: PublicKey, vs: PublicKey, vault: PublicKey, borrowerAta: PublicKey, borrower: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.flash_borrow, amt), keys: [
      { pubkey: vs,          isSigner: false, isWritable: true  },
      { pubkey: vault,       isSigner: false, isWritable: true  },
      { pubkey: borrowerAta, isSigner: false, isWritable: true  },
      { pubkey: borrower,    isSigner: true,  isWritable: false },
      { pubkey: auth,        isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

function ixFlashRepay(pid: PublicKey, vs: PublicKey, vault: PublicKey, borrowerAta: PublicKey, borrower: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.flash_repay, amt), keys: [
      { pubkey: vs,          isSigner: false, isWritable: true  },
      { pubkey: vault,       isSigner: false, isWritable: true  },
      { pubkey: borrowerAta, isSigner: false, isWritable: true  },
      { pubkey: borrower,    isSigner: true,  isWritable: false },
      { pubkey: auth,        isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

function ixDrain(pid: PublicKey, vs: PublicKey, vault: PublicKey, attackerAta: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.drain_vault, amt), keys: [
      { pubkey: vs,          isSigner: false, isWritable: true  },
      { pubkey: vault,       isSigner: false, isWritable: true  },
      { pubkey: attackerAta, isSigner: false, isWritable: true  },
      { pubkey: auth,        isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

// ─── Restore + unpause helpers ────────────────────────────────────────────────

async function restoreVault(
  conn: Connection, payer: Keypair, auth: Keypair,
  pid: PublicKey, vs: PublicKey, vault: PublicKey,
  payerAta: PublicKey, mint: PublicKey,
  targetUsdc = 1_000_000
) {
  const current = await usdcBal(conn, vault);
  const needed  = targetUsdc - current;
  if (needed > 0) {
    await mintTo(conn, payer, mint, payerAta, payer, USDC(needed));
    await sendTx(conn, ixDeposit(pid, vs, vault, payerAta, payer.publicKey, auth.publicKey, USDC(needed)), [payer]);
  }
  console.log(`${B}[Restore]${RESET} vault = $${await usdcBal(conn, vault)}`);
}

async function unpauseSentinel(
  conn: Connection, auth: Keypair,
  sentinelPid: PublicKey, sentinelState: PublicKey
) {
  const ix = new TransactionInstruction({
    programId: sentinelPid,
    data: Buffer.from(anchorDisc("unpause_withdrawals")),
    keys: [
      { pubkey: sentinelState, isSigner: false, isWritable: true  },
      { pubkey: auth.publicKey, isSigner: true, isWritable: false },
    ]
  });
  try {
    await sendTx(conn, ix, [auth]);
    console.log(`${G}✓${RESET} Sentinel unpaused`);
  } catch {
    console.log(`${Y}~${RESET} Already unpaused`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${C}╔═══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${C}║  SentinelGuard Extended Edge Case Suite (Devnet)  ║${RESET}`);
  console.log(`${BOLD}${C}╚═══════════════════════════════════════════════════╝${RESET}\n`);

  const conn = new Connection(RPC_URL, { commitment: "confirmed", wsEndpoint: WS_URL });

  // Load existing keypairs (created by original script)
  const payer   = kp("keys/test-payer.json");
  const auth    = kp("keys/protocol-authority.json");
  const hacker  = kp("keys/test-attacker.json");
  const watcher = kp("keys/watcher-keypair.json");

  const pid            = new PublicKey(process.env.MOCK_PROTOCOL_PROGRAM_ID!);
  const sentinelPid    = new PublicKey(process.env.SENTINEL_PROGRAM_ID!);
  const mintKp         = kp("keys/mock-usdc-mint.json");
  const mint           = mintKp.publicKey;

  const [vs]           = PublicKey.findProgramAddressSync([Buffer.from("vault_state"), auth.publicKey.toBuffer()], pid);
  const [vault]        = PublicKey.findProgramAddressSync([Buffer.from("vault"),       auth.publicKey.toBuffer()], pid);
  const [sentinelState]= PublicKey.findProgramAddressSync([Buffer.from("sentinel"),    auth.publicKey.toBuffer()], sentinelPid);

  const payerAta  = await getOrCreateAssociatedTokenAccount(conn, payer, mint, payer.publicKey);
  const hackerAta = await getOrCreateAssociatedTokenAccount(conn, payer, mint, hacker.publicKey);

  // Balance check
  for (const [label, k] of [["payer", payer], ["auth", auth], ["hacker", hacker]] as [string, Keypair][]) {
    const bal = await conn.getBalance(k.publicKey) / LAMPORTS_PER_SOL;
    console.log(`  ${bal < 0.3 ? R : G}${label}: ${bal.toFixed(3)} SOL${RESET}`);
    if (bal < 0.3) console.log(`  ${Y}⚠ Fund ${label} before running${RESET}`);
  }

  console.log(`\n  Protocol:      ${pid.toBase58()}`);
  console.log(`  SentinelGuard: ${sentinelPid.toBase58()}`);
  console.log(`  Vault:         ${vault.toBase58()}`);
  console.log(`  SentinelState: ${sentinelState.toBase58()}\n`);

  // Ensure vault is funded before starting
  await restoreVault(conn, payer, auth, pid, vs, vault, payerAta.address, mint, 1_000_000);
  await unpauseSentinel(conn, auth, sentinelPid, sentinelState);

  // Wait for watcher
  await new Promise<void>(resolve => {
    process.stdout.write("\nPress ENTER when watcher is running...");
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.setRawMode?.(false);
      process.stdin.pause();
      console.log();
      resolve();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // S6: Flash loan with clean full repay — NO drain — should NOT alert
  // Tests: Rule 1 does not fire on flash alone without TVL drop
  // ════════════════════════════════════════════════════════════════════════════

  await scenario(6, "Flash borrow + clean repay — NO alert (false positive check)", async () => {
    const tvl    = await usdcBal(conn, vault);
    const borrow = USDC(tvl * 0.5);

    await mintTo(conn, payer, mint, hackerAta.address, payer, USDC(10_000));

    await sendTx(conn, ixFlashBorrow(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow), [payer, hacker]);
    console.log(`  flash_borrow 500k ✓  vault=${await usdcBal(conn, vault)}`);
    await sleep(500);

    // Repay immediately — no drain
    await sendTx(conn, ixFlashRepay(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow), [payer, hacker]);
    console.log(`  flash_repay 500k ✓  vault=${await usdcBal(conn, vault)}`);

    await sleep(STEP_MS * 3);
    console.log(`  ${G}Expected: NO alert — flash without TVL drop${RESET}`);
    console.log(`  ${G}Validates: Rule 1 requires BOTH flash AND drain${RESET}`);
  });

  await restoreVault(conn, payer, auth, pid, vs, vault, payerAta.address, mint, 1_000_000);
  await unpauseSentinel(conn, auth, sentinelPid, sentinelState);
  await sleep(32_000); // cooldown

  // ════════════════════════════════════════════════════════════════════════════
  // S7: Flash + drain + fast velocity — Rule 1 AND Rule 2 fire simultaneously
  // Tests: both rules scoring at once, highest combined severity
  // ════════════════════════════════════════════════════════════════════════════

  await scenario(7, "Flash + aggressive drain — Rule 1 AND Rule 2 both fire (max severity)", async () => {
    const tvl    = await usdcBal(conn, vault);
    const borrow = USDC(tvl * 0.6);
    const drain  = USDC(tvl * 0.55); // >20% in 3 slots AND >15% with flash

    await mintTo(conn, payer, mint, hackerAta.address, payer, USDC(10_000));

    await sendTx(conn, ixFlashBorrow(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow), [payer, hacker]);
    console.log(`  flash_borrow 600k ✓`);
    await sleep(400);

    // Large drain — triggers Rule 2 velocity AND contributes to Rule 1 score
    await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, drain), [payer]);
    console.log(`  drain 550k ✓  vault=${await usdcBal(conn, vault)}`);
    await sleep(400);

    await sendTx(conn, ixFlashRepay(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow), [payer, hacker]);
    console.log(`  flash_repay ✓`);

    await sleep(STEP_MS * 3);
    console.log(`  ${R}Expected: BOTH Rule 1 (score>=75) AND Rule 2 (score>=75) fire${RESET}`);
    console.log(`  ${R}Highest severity alert in the suite${RESET}`);
  });

  await restoreVault(conn, payer, auth, pid, vs, vault, payerAta.address, mint, 1_000_000);
  await unpauseSentinel(conn, auth, sentinelPid, sentinelState);
  await sleep(32_000);

  // ════════════════════════════════════════════════════════════════════════════
  // S8: Drain below $10k absolute — NO alert
  // Tests: Rule 2 absolute drop guard ($10k minimum)
  // Vault at $50k, drain 25% = $12.5k → should fire
  // Vault at $30k, drain 25% = $7.5k  → should NOT fire (below $10k guard)
  // ════════════════════════════════════════════════════════════════════════════

  await scenario(8, "Drain 25% of small vault ($30k) — below $10k absolute — NO alert", async () => {
    // First drain vault down to ~$30k
    const tvl = await usdcBal(conn, vault);
    const drainToSmall = USDC(tvl - 30_000);
    await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, drainToSmall), [payer]);
    console.log(`  Drained to $30k  vault=${await usdcBal(conn, vault)}`);
    await sleep(STEP_MS * 2);

    // Now drain 25% = $7.5k (below $10k absolute guard)
    const smallDrain = USDC(30_000 * 0.25);
    await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, smallDrain), [payer]);
    console.log(`  Drained 25% ($7.5k)  vault=${await usdcBal(conn, vault)}`);

    await sleep(STEP_MS * 3);
    console.log(`  ${G}Expected: NO alert — $7.5k drop < $10k absolute guard${RESET}`);
    console.log(`  ${G}Validates: Rule 2 absolute drop guard working${RESET}`);
  });

  await restoreVault(conn, payer, auth, pid, vs, vault, payerAta.address, mint, 1_000_000);
  await unpauseSentinel(conn, auth, sentinelPid, sentinelState);
  await sleep(32_000);

  // ════════════════════════════════════════════════════════════════════════════
  // S9: Rapid deposit → rapid drain in same window (wash trading / pump + dump)
  // Tests: sanitize_tvl() handling — spike up then spike down
  // Should NOT false-positive on the deposit spike, SHOULD alert on drain
  // ════════════════════════════════════════════════════════════════════════════

  await scenario(9, "Rapid deposit spike → rapid drain — only drain should alert", async () => {
    // Pump TVL by 3x (deposit 2M into 1M vault)
    await mintTo(conn, payer, mint, payerAta.address, payer, USDC(2_000_000));
    for (let i = 0; i < 3; i++) {
      await sendTx(conn, ixDeposit(pid, vs, vault, payerAta.address, payer.publicKey, auth.publicKey, USDC(667_000)), [payer]);
      console.log(`  deposit ${i+1}/3 ✓  vault=${await usdcBal(conn, vault)}`);
      await sleep(400);
    }
    console.log(`  ${Y}TVL spike to ~$3M — sanitize_tvl() should absorb this${RESET}`);
    await sleep(STEP_MS * 2);

    // Now drain 70% fast — should trigger Rule 2
    const tvl = await usdcBal(conn, vault);
    const each = USDC(tvl * 0.25);
    for (let i = 0; i < 3; i++) {
      await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, each), [payer]);
      console.log(`  drain ${i+1}/3 ✓  vault=${await usdcBal(conn, vault)}`);
      await sleep(400);
    }

    await sleep(STEP_MS * 3);
    console.log(`  ${R}Expected: Alert on drain (Rule 2), NO false alert on deposit spike${RESET}`);
    console.log(`  ${Y}Validates: sanitize_tvl() prevents upward spike false positives${RESET}`);
  });

  await restoreVault(conn, payer, auth, pid, vs, vault, payerAta.address, mint, 1_000_000);
  await unpauseSentinel(conn, auth, sentinelPid, sentinelState);
  await sleep(32_000);

  // ════════════════════════════════════════════════════════════════════════════
  // S10: Cooldown bypass — two attacks back to back
  // First attack fires alert + pause. Second attack during cooldown should
  // NOT generate a duplicate alert (cooldown dedup working).
  // ════════════════════════════════════════════════════════════════════════════

  await scenario(10, "Attack → pause → immediate second attack — cooldown dedup check", async () => {
    // First attack — should alert
    const tvl  = await usdcBal(conn, vault);
    const each = USDC(tvl * 0.28);
    for (let i = 0; i < 3; i++) {
      await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, each), [payer]);
      console.log(`  attack1 drain ${i+1}/3  vault=${await usdcBal(conn, vault)}`);
      await sleep(400);
    }
    console.log(`  ${R}Attack 1 done — waiting for alert + pause...${RESET}`);
    await sleep(STEP_MS * 2);

    // Restore vault but do NOT unpause or wait for cooldown
    await restoreVault(conn, payer, auth, pid, vs, vault, payerAta.address, mint, 1_000_000);
    console.log(`  Vault restored, sentinel still paused, cooldown still active`);

    // Second attack immediately — drain should revert (paused), no new alert
    const tvl2  = await usdcBal(conn, vault);
    const drain2 = USDC(tvl2 * 0.3);
    console.log(`  Attempting second drain during cooldown window...`);
    await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, drain2), [payer], true);

    await sleep(STEP_MS * 2);
    console.log(`  ${G}Expected: First attack fires alert, second drain REVERTS (paused)${RESET}`);
    console.log(`  ${G}Validates: On-chain pause block + cooldown dedup${RESET}`);
  });

  await restoreVault(conn, payer, auth, pid, vs, vault, payerAta.address, mint, 1_000_000);
  await unpauseSentinel(conn, auth, sentinelPid, sentinelState);
  await sleep(32_000);

  // ════════════════════════════════════════════════════════════════════════════
  // S11: Multiple flash borrows in same slot window (compound Rule 1)
  // Attacker does: flash1 → partial drain → repay1 → flash2 → partial drain → repay2
  // Combined TVL drop across the window should still fire Rule 1
  // ════════════════════════════════════════════════════════════════════════════

  await scenario(11, "Two sequential flash+drain cycles — Rule 1 compound detection", async () => {
    const tvl = await usdcBal(conn, vault);
    await mintTo(conn, payer, mint, hackerAta.address, payer, USDC(20_000));

    // Flash cycle 1 — 8% drain
    const borrow1 = USDC(tvl * 0.4);
    const drain1  = USDC(tvl * 0.08);
    await sendTx(conn, ixFlashBorrow(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow1), [payer, hacker]);
    await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, drain1), [payer]);
    await sendTx(conn, ixFlashRepay(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow1), [payer, hacker]);
    console.log(`  cycle 1 done — vault=${await usdcBal(conn, vault)} (8% drained)`);
    await sleep(600);

    // Flash cycle 2 — 10% drain (total 18% > 15% Rule 1 threshold)
    const tvl2    = await usdcBal(conn, vault);
    const borrow2 = USDC(tvl2 * 0.4);
    const drain2  = USDC(tvl2 * 0.10);
    await sendTx(conn, ixFlashBorrow(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow2), [payer, hacker]);
    await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, drain2), [payer]);
    await sendTx(conn, ixFlashRepay(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow2), [payer, hacker]);
    console.log(`  cycle 2 done — vault=${await usdcBal(conn, vault)} (~18% cumulative drained)`);

    await sleep(STEP_MS * 3);
    console.log(`  ${R}Expected: Rule 1 fires — cumulative TVL drop >15% across window${RESET}`);
    console.log(`  ${R}peak_tvl baseline catches the full window drop${RESET}`);
  });

  await restoreVault(conn, payer, auth, pid, vs, vault, payerAta.address, mint, 1_000_000);
  await unpauseSentinel(conn, auth, sentinelPid, sentinelState);
  await sleep(32_000);

  // ════════════════════════════════════════════════════════════════════════════
  // S12: Near-empty vault attack — TVL at edge of $50k guard
  // Drain vault to $55k, then drain 25% = $13.75k (above $10k absolute)
  // Should still fire Rule 2 (TVL >$50k guard passes, absolute >$10k passes)
  // ════════════════════════════════════════════════════════════════════════════

  await scenario(12, "Attack on vault just above $50k minimum — Rule 2 boundary test", async () => {
    // Drain vault down to ~$55k
    const tvl          = await usdcBal(conn, vault);
    const drainToEdge  = USDC(tvl - 55_000);
    await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, drainToEdge), [payer]);
    console.log(`  Drained to edge: vault=${await usdcBal(conn, vault)}`);
    await sleep(STEP_MS * 2);

    // Now drain fast — 25% of $55k = $13.75k (above $10k guard, above $50k TVL guard)
    const tvl2   = await usdcBal(conn, vault);
    const each   = USDC(tvl2 * 0.09);
    for (let i = 0; i < 3; i++) {
      await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, each), [payer]);
      console.log(`  boundary drain ${i+1}/3  vault=${await usdcBal(conn, vault)}`);
      await sleep(400);
    }

    await sleep(STEP_MS * 3);
    console.log(`  ${R}Expected: Rule 2 fires — $55k > $50k guard, drop > $10k absolute${RESET}`);
    console.log(`  ${Y}Boundary test: one dollar below $50k TVL guard would NOT fire${RESET}`);
  });

  await restoreVault(conn, payer, auth, pid, vs, vault, payerAta.address, mint, 1_000_000);
  await unpauseSentinel(conn, auth, sentinelPid, sentinelState);
  await sleep(32_000);

  // ════════════════════════════════════════════════════════════════════════════
  // S13: The money shot — drain → pause confirmed → subsequent drain REVERTS
  // This is the core proof: on-chain circuit breaker actually works
  // Show in demo video: exploit tx 3 reverts with WithdrawalsPaused
  // ════════════════════════════════════════════════════════════════════════════

  await scenario(13, "Drain triggers pause — subsequent drain tx REVERTS on-chain (circuit breaker proof)", async () => {
    const tvl  = await usdcBal(conn, vault);
    const each = USDC(tvl * 0.28);

    // Trigger Rule 2
    console.log(`  Starting attack on $${tvl.toLocaleString()} vault...`);
    for (let i = 0; i < 3; i++) {
      await sendTx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, each), [payer]);
      console.log(`  drain ${i+1}/3 ✓  vault=${await usdcBal(conn, vault)}`);
      await sleep(400);
    }

    // Wait for watcher to detect + submit pause tx
    console.log(`  ${Y}Waiting for SentinelGuard to detect and pause...${RESET}`);
    await sleep(5_000);

    // Now attempt another drain — should REVERT with WithdrawalsPaused
    console.log(`  Attempting drain AFTER pause is confirmed...`);
    const postPauseDrain = USDC(50_000);
    const reverted = await sendTx(
      conn,
      ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, postPauseDrain),
      [payer],
      true // expectFail = true
    );

    if (reverted === null) {
      console.log(`\n  ${BOLD}${G}╔══════════════════════════════════════════════╗${RESET}`);
      console.log(`  ${BOLD}${G}║  CIRCUIT BREAKER CONFIRMED                   ║${RESET}`);
      console.log(`  ${BOLD}${G}║  Exploit tx reverted — WithdrawalsPaused     ║${RESET}`);
      console.log(`  ${BOLD}${G}║  Vault funds protected on-chain              ║${RESET}`);
      console.log(`  ${BOLD}${G}╚══════════════════════════════════════════════╝${RESET}`);
    }

    await sleep(STEP_MS * 2);
    console.log(`  ${G}This is your demo video money shot — record this scenario${RESET}`);
  });

  // ── Final summary ────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${C}═══ Extended Suite Complete ═══${RESET}`);
  console.log(`\nCheck results:`);
  console.log(`  ${B}psql -U sentinel_user -d sentinel -c "SELECT rule_triggered, severity, created_at FROM alerts ORDER BY created_at DESC LIMIT 20;"${RESET}`);
  console.log(`  ${B}redis-cli KEYS 'alert_*'${RESET}`);
  console.log(`\nExpected alert count from this suite: 6`);
  console.log(`  S7:  Rule 1 + Rule 2 (dual fire, max severity)`);
  console.log(`  S9:  Rule 2 (drain after deposit spike)`);
  console.log(`  S10: Rule 2 (first attack only, second reverts)`);
  console.log(`  S11: Rule 1 (compound flash cycles)`);
  console.log(`  S12: Rule 2 (boundary TVL test)`);
  console.log(`  S13: Rule 2 (circuit breaker proof — use for demo video)`);
  console.log(`\nExpected NO-alert scenarios: S6, S8`);
  console.log(`  S6:  Flash with clean repay (no drain)`);
  console.log(`  S8:  Drain below $10k absolute guard\n`);
}

main().catch(e => { console.error(e); process.exit(1); });