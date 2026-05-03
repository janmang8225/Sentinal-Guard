#!/usr/bin/env bun
// tests/attack_scenarios.ts — FIXED VERSION
//
// Fixes vs original:
//   1. Calls initialize() BEFORE any deposit/drain/withdraw
//   2. Correct Anchor discriminators (sha256("global:{name}")[..8])
//   3. Correct account ordering matching the Anchor program's #[derive(Accounts)]
//   4. Keypair persistence (payer/authority/attacker saved to keys/)
//   5. Robust tx helper with confirmation
import "dotenv/config";
import { createHash } from "crypto";
import {
  Connection, Keypair, PublicKey, Transaction,
  TransactionInstruction, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  createMint, getOrCreateAssociatedTokenAccount, mintTo,
  getAccount, TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const RPC_URL = process.env.SOLANA_RPC_URL!;
const WS_URL = process.env.SOLANA_WS_URL!;
const STEP_MS = 1_500;
const USDC = (n: number) => BigInt(Math.floor(n * 1_000_000));

const R = "\x1b[31m", G = "\x1b[32m", Y = "\x1b[33m", B = "\x1b[34m", M = "\x1b[35m", C = "\x1b[36m", RESET = "\x1b[0m", BOLD = "\x1b[1m";

// ─── Real Anchor discriminators ───────────────────────────────────────────────
// sha256("global:{name}")[0..8]  — computed externally, verified correct
const DISC = {
  initialize: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]),
  deposit: Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]),
  withdraw: Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]),
  flash_borrow: Buffer.from([166, 221, 220, 25, 61, 73, 127, 240]),
  flash_repay: Buffer.from([182, 143, 19, 23, 39, 221, 184, 78]),
  drain_vault: Buffer.from([87, 219, 34, 249, 5, 135, 65, 116]),
};

function ixData(disc: Buffer, amount?: bigint): Buffer {
  if (!amount) return disc;
  const ab = Buffer.alloc(8); ab.writeBigUInt64LE(amount);
  return Buffer.concat([disc, ab]);
}

function anchorDisc(name: string) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

async function tx(conn: Connection, ix: TransactionInstruction, signers: Keypair[]) {
  const t = new Transaction().add(ix);
  t.feePayer = signers[0].publicKey;
  t.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  for (const s of signers) t.partialSign(s);
  const sig = await conn.sendRawTransaction(t.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" });
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function kp(file: string): Keypair {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(file)) return Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(file, "utf8"))));
  const k = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(k.secretKey)));
  return k;
}

async function drop(conn: Connection, pub: PublicKey, sol: number) {
  const sig = await conn.requestAirdrop(pub, sol * LAMPORTS_PER_SOL);
  await conn.confirmTransaction(sig, "confirmed");
}

async function usdcBal(conn: Connection, acc: PublicKey): Promise<number> {
  try { return Number((await getAccount(conn, acc)).amount) / 1e6; } catch { return 0; }
}

async function scenario(n: number, title: string, fn: () => Promise<void>) {
  console.log(`\n${BOLD}${M}━━━ Scenario ${n}: ${title} ━━━${RESET}`);
  try { await fn(); console.log(`${G}✓ Scenario ${n} done${RESET}`); }
  catch (e: any) {
    console.error(`${R}✗ Failed: ${e?.message ?? e}${RESET}`);
    const logs = e?.logs ?? e?.transactionLogs ?? [];
    logs.forEach((l: string) => console.error(`  ${l}`));
  }
  await sleep(2_000);
}

// ─── Instruction builders — account order matches #[derive(Accounts)] exactly ─

function ixInit(pid: PublicKey, vs: PublicKey, vault: PublicKey, mint: PublicKey, auth: PublicKey) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.initialize), keys: [
      { pubkey: vs, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: auth, isSigner: true, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ]
  });
}

function ixDeposit(pid: PublicKey, vs: PublicKey, vault: PublicKey, userAta: PublicKey, user: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.deposit, amt), keys: [
      { pubkey: vs, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: auth, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

function ixWithdraw(pid: PublicKey, vs: PublicKey, vault: PublicKey, userAta: PublicKey, user: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.withdraw, amt), keys: [
      { pubkey: vs, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: auth, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

function ixFlashBorrow(pid: PublicKey, vs: PublicKey, vault: PublicKey, borrowerAta: PublicKey, borrower: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.flash_borrow, amt), keys: [
      { pubkey: vs, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: borrowerAta, isSigner: false, isWritable: true },
      { pubkey: borrower, isSigner: true, isWritable: false },
      { pubkey: auth, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

function ixFlashRepay(pid: PublicKey, vs: PublicKey, vault: PublicKey, borrowerAta: PublicKey, borrower: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.flash_repay, amt), keys: [
      { pubkey: vs, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: borrowerAta, isSigner: false, isWritable: true },
      { pubkey: borrower, isSigner: true, isWritable: false },
      { pubkey: auth, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

function ixDrain(pid: PublicKey, vs: PublicKey, vault: PublicKey, attackerAta: PublicKey, auth: PublicKey, amt: bigint) {
  return new TransactionInstruction({
    programId: pid, data: ixData(DISC.drain_vault, amt), keys: [
      { pubkey: vs, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: attackerAta, isSigner: false, isWritable: true },
      { pubkey: auth, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ]
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${C}╔══════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${C}║   SentinelGuard Attack Scenario Test Suite   ║${RESET}`);
  console.log(`${BOLD}${C}╚══════════════════════════════════════════════╝${RESET}\n`);

  const conn = new Connection(RPC_URL, { commitment: "confirmed", wsEndpoint: WS_URL });

  const payer = kp("keys/test-payer.json");
  const auth = kp("keys/protocol-authority.json");
  const hacker = kp("keys/test-attacker.json");
  const watcher = kp("keys/watcher-keypair.json");

  // Airdrop to all actors
  // Devnet-safe balance check (NO airdrop)
for (const [label, k] of [["payer", payer], ["auth", auth], ["hacker", hacker]] as [string, Keypair][]) {
  const bal = await conn.getBalance(k.publicKey) / LAMPORTS_PER_SOL;

  if (bal < 0.5) {
    console.log(`  ⚠️ ${label} low balance (${bal.toFixed(2)} SOL) — please fund manually`);
  } else {
    console.log(`  ${label}: ${bal.toFixed(2)} SOL`);
  }
}
  console.log(`${G}✓${RESET} Payer:   ${payer.publicKey.toBase58()}`);
  console.log(`${G}✓${RESET} Auth:    ${auth.publicKey.toBase58()}`);
  console.log(`${G}✓${RESET} Hacker:  ${hacker.publicKey.toBase58()}`);
  console.log(`${G}✓${RESET} Watcher: ${watcher.publicKey.toBase58()}\n`);

const pid = new PublicKey(process.env.MOCK_PROTOCOL_PROGRAM_ID!);
  const [vs] = PublicKey.findProgramAddressSync([Buffer.from("vault_state"), auth.publicKey.toBuffer()], pid);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), auth.publicKey.toBuffer()], pid);

  console.log(`${G}✓${RESET} Program:    ${pid.toBase58()}`);
  console.log(`${G}✓${RESET} VaultState: ${vs.toBase58()}`);
  console.log(`${G}✓${RESET} Vault:      ${vault.toBase58()}\n`);

  // Create mock USDC mint (idempotent)
  const mintKp = kp("keys/mock-usdc-mint.json");
  let mint: PublicKey;
  try {
    mint = await createMint(conn, payer, payer.publicKey, null, 6, mintKp);
    console.log(`${G}✓${RESET} USDC mint created: ${mint.toBase58()}`);
  } catch {
    mint = mintKp.publicKey;
    console.log(`${Y}~${RESET} USDC mint exists: ${mint.toBase58()}`);
  }

  const payerAta = await getOrCreateAssociatedTokenAccount(conn, payer, mint, payer.publicKey);
  const hackerAta = await getOrCreateAssociatedTokenAccount(conn, payer, mint, hacker.publicKey);

  await mintTo(conn, payer, mint, payerAta.address, payer, USDC(20_000_000));
  console.log(`${G}✓${RESET} Payer USDC: ${await usdcBal(conn, payerAta.address)}\n`);

  // ── Initialize vault (idempotent) ─────────────────────────────────────────
  if (!(await conn.getAccountInfo(vs))) {
    console.log(`${B}[Setup]${RESET} Initializing vault...`);
    await tx(conn, ixInit(pid, vs, vault, mint, auth.publicKey), [auth]);
    console.log(`${G}✓${RESET} Vault initialized`);
  } else {
    console.log(`${Y}~${RESET} Vault already initialized`);
  }

const SENTINEL_PROGRAM_ID = new PublicKey(
  process.env.SENTINEL_PROGRAM_ID!
);
  const [sentinelState] = PublicKey.findProgramAddressSync(
    [Buffer.from("sentinel"), auth.publicKey.toBuffer()],
    SENTINEL_PROGRAM_ID
  );

  const discRegister = anchorDisc("register_protocol");
  const escrowBuf = Buffer.alloc(8);
  escrowBuf.writeBigUInt64LE(BigInt(0));

  const ixRegister = new TransactionInstruction({
    programId: SENTINEL_PROGRAM_ID,
    data: Buffer.concat([discRegister, escrowBuf]),
    keys: [
      { pubkey: sentinelState, isSigner: false, isWritable: true },
      { pubkey: auth.publicKey, isSigner: true, isWritable: true },
      { pubkey: watcher.publicKey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]
  });

  const sentinelAcc = await conn.getAccountInfo(sentinelState);
  if (!sentinelAcc) {
    console.log(`${B}[Setup]${RESET} Registering protocol in Sentinel...`);
    await tx(conn, ixRegister, [auth]);
    console.log(`${G}✓${RESET} SentinelState initialized`);
  } else {
    console.log(`${Y}~${RESET} Sentinel already initialized`);
  }
  console.log(`${G}✓${RESET} SentinelState PDA: ${sentinelState.toBase58()}`);

  // ── Seed with 1M USDC ─────────────────────────────────────────────────────
  const initialBal = await usdcBal(conn, vault);
  if (initialBal < 100_000) {
    console.log(`${B}[Setup]${RESET} Seeding vault with 1M USDC...`);
    await tx(conn, ixDeposit(pid, vs, vault, payerAta.address, payer.publicKey, auth.publicKey, USDC(1_000_000)), [payer]);
    console.log(`${G}✓${RESET} Vault: ${await usdcBal(conn, vault)} USDC`);
  } else {
    console.log(`${G}✓${RESET} Vault already has ${initialBal.toLocaleString()} USDC`);
  }

  // ── Watcher config reminder ───────────────────────────────────────────────
  console.log(`\n${Y}Update watcher .env:${RESET}`);
  console.log(`  WATCHED_PROGRAMS=${pid.toBase58()}`);
  console.log(`  SOLANA_RPC_URL=${RPC_URL}`);
  console.log(`  GEYSER_ENDPOINT=${WS_URL}`);

  // Wait for user to start watcher
  await new Promise<void>(resolve => {
    process.stdout.write("Press ENTER when watcher is running...");
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.once("data", () => { process.stdin.setRawMode?.(false); process.stdin.pause(); console.log(); resolve(); });
  });

  // ══════════════════════════════════════════════════════════════════════════

  await scenario(1, "Normal deposits + small withdraw — NO alert", async () => {
    for (let i = 0; i < 3; i++) {
      await mintTo(conn, payer, mint, payerAta.address, payer, USDC(200_000));
      await tx(conn, ixDeposit(pid, vs, vault, payerAta.address, payer.publicKey, auth.publicKey, USDC(200_000)), [payer]);
      await sleep(STEP_MS); console.log(`  Deposit ${i + 1}/3 ✓  vault=${await usdcBal(conn, vault)}`);
    }
    await tx(conn, ixWithdraw(pid, vs, vault, payerAta.address, payer.publicKey, auth.publicKey, USDC(50_000)), [payer]);
    console.log(`  Withdrew 50k ✓  vault=${await usdcBal(conn, vault)}`);
    console.log(`  ${G}Expected: NO alert${RESET}`);
  });

  await scenario(2, "Rapid 80% drain — Rule 2 TVL_VELOCITY MUST fire", async () => {
    const tvl = await usdcBal(conn, vault);
    const each = USDC(tvl * 0.27);
    console.log(`  TVL: $${tvl.toLocaleString()}  draining ${(tvl * 0.27).toFixed(0)} × 3...`);
    for (let i = 0; i < 3; i++) {
      await tx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, each), [payer]);
      console.log(`  Drain ${i + 1}/3 ✓  vault=${await usdcBal(conn, vault)}`);
      await sleep(400);
    }
    await sleep(STEP_MS * 3);
    console.log(`  ${R}Expected: ALERT rule=TVL_VELOCITY severity>=75${RESET}`);
  });

  // restore
  await mintTo(conn, payer, mint, payerAta.address, payer, USDC(1_000_000));
  await tx(conn, ixDeposit(pid, vs, vault, payerAta.address, payer.publicKey, auth.publicKey, USDC(1_000_000)), [payer]);
  console.log(`${B}[Restore]${RESET} vault=${await usdcBal(conn, vault)}\n`);

  // Unpause sentinel so scenario 3 can fire a new pause
  const discUnpause = anchorDisc("unpause_withdrawals");
  const ixUnpause = new TransactionInstruction({
    programId: SENTINEL_PROGRAM_ID,
    data: discUnpause,
    keys: [
      { pubkey: sentinelState, isSigner: false, isWritable: true },
      { pubkey: auth.publicKey, isSigner: true, isWritable: false },
    ]
  });
  try {
    await tx(conn, ixUnpause, [auth]);
    console.log(`${G}✓${RESET} Sentinel unpaused`);
  } catch { console.log(`${Y}~${RESET} Already unpaused`); }

  // Wait for Redis cooldown to expire (30s TTL)
  console.log(`${Y}Waiting 32s for alert cooldown to expire...${RESET}`);
  await sleep(32_000);

  await scenario(3, "Flash borrow + drain — Rule 1 FLASH_LOAN_DRAIN MUST fire", async () => {
    // Clear any stuck flash loan state from a previous failed run
    const vsInfo = await conn.getAccountInfo(vs);
    if (vsInfo) {
      // Read flash_loan_active from account data
      // VaultState layout: discriminator(8) + authority(32) + vault(32) + 
      //                    total_deposited(8) + flash_loan_active(1) + ...
      const flashLoanActive = vsInfo.data[80]; // byte 81 = flash_loan_active
      if (flashLoanActive === 1) {
        console.log("  Clearing stuck flash loan state...");
        // Give hacker enough USDC to repay whatever was borrowed
        await mintTo(conn, payer, mint, hackerAta.address, payer, USDC(2_000_000));
        // The flash_loan_amount is at byte 82 (u64, 8 bytes)
        const stuckAmount = vsInfo.data.readBigUInt64LE(81);
        await tx(conn,
          ixFlashRepay(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, stuckAmount),
          [payer, hacker]);
        console.log(`  Cleared stuck flash loan of ${Number(stuckAmount) / 1e6} USDC ✓`);
      }
    }

    const tvl = await usdcBal(conn, vault);
    const borrow = USDC(tvl * 0.5);
    const drain = USDC(tvl * 0.4);
    await mintTo(conn, payer, mint, hackerAta.address, payer, USDC(5_000)); // repay buffer

    await tx(conn, ixFlashBorrow(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow), [payer, hacker]);
    console.log(`  flash_borrow ✓  (logs: "flash_loan: borrowed ...")`);
    await sleep(STEP_MS);

    await tx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, drain), [payer]);
    console.log(`  drain ✓  vault=${await usdcBal(conn, vault)}`);
    await sleep(STEP_MS);

    await tx(conn, ixFlashRepay(pid, vs, vault, hackerAta.address, hacker.publicKey, auth.publicKey, borrow), [payer, hacker]);
    console.log(`  flash_repay ✓`);

    await sleep(STEP_MS * 3);
    console.log(`  ${R}Expected: ALERT rule=FLASH_LOAN_DRAIN severity>=75${RESET}`);
  });

  await mintTo(conn, payer, mint, payerAta.address, payer, USDC(1_000_000));
  await tx(conn, ixDeposit(pid, vs, vault, payerAta.address, payer.publicKey, auth.publicKey, USDC(1_000_000)), [payer]);
  console.log(`${B}[Restore]${RESET} vault=${await usdcBal(conn, vault)}\n`);

  try { await tx(conn, ixUnpause, [auth]); } catch { }
  await sleep(32_000);

  await scenario(4, "10% drain — below threshold — NO alert", async () => {
    const tvl = await usdcBal(conn, vault);
    await tx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, USDC(tvl * 0.10)), [payer]);
    await sleep(STEP_MS * 2);
    console.log(`  ${G}Expected: NO alert (10% < 20% threshold)${RESET}`);
  });

  await scenario(5, "Slow 5%-per-slot × 8 — Rule 2 fires cumulatively", async () => {
    const tvl = await usdcBal(conn, vault);
    const slice = USDC(tvl * 0.05);
    for (let i = 0; i < 8; i++) {
      await tx(conn, ixDrain(pid, vs, vault, hackerAta.address, auth.publicKey, slice), [payer]);
      process.stdout.write(`  slice ${i + 1}/8 (${5 * (i + 1)}% drained)\r`);
      await sleep(600);
    }
    await sleep(STEP_MS * 3);
    console.log(`\n  ${Y}Expected: Alert around slice 5-6${RESET}`);
  });

  console.log(`\n${BOLD}${C}All scenarios done.${RESET}`);
  console.log(`Redis:  ${B}redis-cli KEYS 'alert_*'${RESET}`);
  console.log(`DB:     ${B}psql -U sentinel_user -d sentinel -c "SELECT rule_triggered,severity,created_at FROM alerts;"${RESET}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
