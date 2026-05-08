# SentinelGuard

> **Real-time on-chain exploit detection and automated protocol pause system for Solana DeFi**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.32.1-green)](https://www.anchor-lang.com/)
[![Network](https://img.shields.io/badge/Network-Devnet-orange)](https://explorer.solana.com/?cluster=devnet)
[![Hackathon](https://img.shields.io/badge/Colosseum-Frontier%202026-black)](https://arena.colosseum.org/hackathon)

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Detection Rules](#detection-rules)
- [Monorepo Structure](#monorepo-structure)
- [Program IDs](#program-ids)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Setup & Running](#setup--running)
- [API Reference](#api-reference)
- [Dashboard](#dashboard)
- [Testing & Demo Verification](#testing--demo-verification)
- [Security Model](#security-model)
- [Alert Severity Thresholds](#alert-severity-thresholds)
- [Failure Handling](#failure-handling)
- [Data Stores & Retention](#data-stores--retention)
- [Deployment Topology](#deployment-topology)
- [Monitoring & Logging](#monitoring--logging)
- [Incident Response & Unpause Workflow](#incident-response--unpause-workflow)
- [Known Limitations](#known-limitations)
- [License](#license)
- [Security Disclosure](#security-disclosure)

---

## Overview

SentinelGuard is a production-grade, real-time threat detection and automated circuit-breaking system built for Solana DeFi protocols. It streams on-chain activity through Yellowstone/Helius Geyser, scores transactions against configurable exploit detection rules, and — when threat severity crosses a threshold — automatically triggers an on-chain `pause_withdrawals` instruction to halt protocol outflows before losses can compound.

The system is designed for sub-400ms detection-to-response times and includes a full operational stack: detection engine, threat feed API, webhook fan-out service, and a live monitoring dashboard.

---

## Problem Statement

DeFi exploits on Solana are fast. Flash loan attacks, TVL drain events, and bridge outflow spikes can drain millions within a single block. Protocol teams have no automated line of defense — by the time a human operator sees an alert and manually intervenes, damage is already done.

SentinelGuard closes this gap by:

- Monitoring every transaction touching watched programs in real time
- Scoring threat signals against rule-based detection logic
- Triggering an on-chain protective pause autonomously, with no human in the loop
- Fanning out structured alerts to Discord, Telegram, Circle, and Wormhole integrations
- Providing a live dashboard for operators to monitor, analyze, and manually override

---

## How It Works

```
Solana / Geyser
     │
     ▼
Rust Watcher (yellowstone-grpc)
     │   ├── Transaction Subscriber
     │   ├── Detection Engine  ──► Rule scoring (FlashLoanDrain / TvlVelocity / BridgeOutflowSpike)
     │   ├── Responder         ──► on-chain pause_withdrawals (Anchor CPI)
     │   └── Threat Feed API   ──► HTTP + WebSocket endpoints
     │
     ▼
PostgreSQL / Redis / Kafka
     │   ├── PostgreSQL  — alerts, TVL history, outflow history
     │   ├── Redis       — hot state cache, alert deduplication
     │   └── Kafka       — durable alert/event log
     │
     ▼
Webhook Dispatcher (Bun / Elysia)
     │   ├── Discord
     │   ├── Telegram
     │   ├── Circle API
     │   └── Wormhole API
     │
     ▼
Next.js Dashboard
     ├── Live Alerts
     ├── Analytics
     ├── Protocol Controls
     └── Live Monitoring
```

### Watcher Task Topology

The Rust watcher runs four concurrent async tasks:

| Task | Responsibility |
|---|---|
| `transaction_subscriber` | Subscribes to Yellowstone gRPC stream, filters by watched programs |
| `detection_engine` | Parses transactions, applies scoring rules, emits alerts when threshold met |
| `responder` | Receives high-severity alerts, builds and signs `pause_withdrawals` CPI |
| `threat_feed_api` | Serves HTTP REST + WebSocket endpoints for dashboard and external consumers |

---

## Architecture

### On-Chain Programs (Anchor / Rust)

| Program | Address | Role |
|---|---|---|
| `sentinel_guardian` | `2Fi9UPVbD77Cr2SerjKkpPtbejYXdaa6D4R3Pjor4kQs` | Pause logic and bounty distribution |
| `mock_protocol` | `HyUb8Ffara4byitYExmbjbA37Ja7By8fECpG6dFyg8Ln` | Test target for attack simulation |

### Off-Chain Services

| Service | Tech | Role |
|---|---|---|
| `watcher` | Rust + Axum + Tokio | Detection engine and threat feed API |
| `apps/webhook-dispatcher` | Bun + Elysia | Notification fan-out to external channels |
| `apps/sentinel-frontend` | Next.js + Recharts + shadcn/ui | Operator dashboard and landing page |

### Data Layer

| Store | Usage |
|---|---|
| PostgreSQL | Persistent alert storage, TVL history, bridge outflow history |
| Redis | Hot state (current TVL, vault balances), alert deduplication |
| Kafka | Durable event log for transactions and alerts |

---

## Detection Rules

SentinelGuard ships three built-in detection rules. Each rule contributes a severity score; alerts are published and/or on-chain pause is triggered based on configurable thresholds.

### 1. `FlashLoanDrain`

Detects patterns consistent with flash loan–funded drain attacks: large borrows immediately followed by vault withdrawals within the same transaction or closely adjacent slots.

**Signals scored:**
- Borrow instruction + vault withdrawal in same transaction
- Withdrawal amount relative to vault TVL
- Flash loan program involved

### 2. `TvlVelocity`

Detects abnormally fast TVL decline over a rolling time window. A sudden percentage drop in total protocol value locked — faster than organic withdrawal patterns — is a strong indicator of an ongoing exploit.

**Signals scored:**
- TVL drop percentage vs. `TVL_DROP_THRESHOLD`
- Rate of change over `WINDOW_SIZE` seconds
- Concurrent unusual withdrawal destinations

### 3. `BridgeOutflowSpike`

Detects anomalous spikes in bridge outflow volume. A rapid increase in tokens being bridged out of the protocol (e.g., via Wormhole) relative to baseline can indicate an attacker moving stolen funds cross-chain before the protocol can respond.

**Signals scored:**
- Current outflow volume vs. rolling average × `BRIDGE_SPIKE_MULTIPLIER`
- Number of distinct destination chains
- Overlap with known exploit patterns

---

## Monorepo Structure

```
sentinelguard/
├── programs/
│   ├── sentinel_guardian/      # On-chain pause and bounty logic (Anchor)
│   └── mock_protocol/          # Test protocol for attack simulation (Anchor)
├── watcher/
│   ├── src/
│   │   ├── subscriber.rs       # Yellowstone gRPC transaction subscriber
│   │   ├── detection/          # Rule engine and scoring logic
│   │   ├── responder.rs        # On-chain pause_withdrawals executor
│   │   └── api/                # Axum HTTP + WebSocket threat feed
│   ├── migrations/             # PostgreSQL schema migrations
│   └── Cargo.toml
├── apps/
│   ├── sentinel-frontend/      # Next.js dashboard and landing page
│   │   ├── app/
│   │   └── components/
│   └── webhook-dispatcher/     # Bun/Elysia notification fan-out
├── tests/
│   └── attack_scenarios.ts     # End-to-end exploit simulation tests
├── docker-services/
│   └── docker-compose.yml      # Local Redis, Kafka, PostgreSQL
└── README.md
```

---

## Program IDs

| Program | Network | Address |
|---|---|---|
| `sentinel_guardian` | Devnet | `2Fi9UPVbD77Cr2SerjKkpPtbejYXdaa6D4R3Pjor4kQs` |
| `mock_protocol` | Devnet | `HyUb8Ffara4byitYExmbjbA37Ja7By8fECpG6dFyg8Ln` |

> Both programs are currently deployed to **Devnet**. Mainnet deployment requires additional multisig authority setup and a formal audit.

---

## Prerequisites

Ensure all of the following are installed before proceeding:

| Dependency | Version | Notes |
|---|---|---|
| Rust | stable | Install via `rustup` |
| Anchor CLI | 0.32.1 | `cargo install --git https://github.com/coral-xyz/anchor anchor-cli` |
| Solana CLI | ≥ 1.18 | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"` |
| Bun | ≥ 1.1 | `curl -fsSL https://bun.sh/install \| bash` |
| Node.js | ≥ 20 | For frontend |
| Docker + Compose | Latest | For local infra stack |
| Helius / Yellowstone gRPC | — | API key required |

---

## Environment Configuration

### Watcher (`watcher/.env`)

| Variable | Description | Example |
|---|---|---|
| `HELIUS_API_KEY` | Helius API key for Geyser access | `abc123...` |
| `SENTINEL_PROGRAM_ID` | Deployed sentinel_guardian program ID | `2Fi9UPVbD77...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/sentinel` |
| `PROTOCOL_AUTHORITY` | Authority pubkey for on-chain pause CPI | `YourPubkey...` |
| `GEYSER_ENDPOINT` | Yellowstone gRPC endpoint URL | `https://mainnet.helius-rpc.com` |
| `SOLANA_RPC_URL` | Solana RPC URL | `https://api.devnet.solana.com` |
| `WATCHER_KEYPAIR_PATH` | Path to watcher signing keypair | `~/.config/solana/watcher.json` |
| `WATCHED_PROGRAMS` | Comma-separated program IDs to monitor | `HyUb8Ff...,TokenkegQ...` |
| `TRACKED_MINT` | Token mint address to track for TVL | `So11111...` |
| `VAULT_ACCOUNTS` | Comma-separated vault account addresses | `vault1,vault2` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `KAFKA_BROKERS` | Kafka broker addresses | `localhost:9092` |
| `KAFKA_TX_TOPIC` | Kafka topic for raw transactions | `sentinel.transactions` |
| `KAFKA_ALERT_TOPIC` | Kafka topic for published alerts | `sentinel.alerts` |
| `API_PORT` | Port for threat feed HTTP API | `8080` |
| `WEBHOOK_DISPATCHER_URL` | Internal URL of webhook dispatcher | `http://localhost:3001` |
| `TVL_DROP_THRESHOLD` | TVL drop % to trigger TvlVelocity rule | `0.15` (15%) |
| `BRIDGE_SPIKE_MULTIPLIER` | Outflow multiplier for BridgeOutflowSpike | `3.0` |
| `MIN_SEVERITY_TO_PAUSE` | Minimum score to trigger on-chain pause | `85` |
| `MIN_SEVERITY_TO_PUBLISH` | Minimum score to publish an alert | `50` |
| `WINDOW_SIZE` | Rolling window for velocity checks (seconds) | `60` |

### Frontend (`apps/sentinel-frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_WATCHER_HTTP_URL` | Watcher API base URL | `http://localhost:8080` |
| `NEXT_PUBLIC_WATCHER_WS_URL` | Watcher WebSocket URL | `ws://localhost:8080/ws` |

### Webhook Dispatcher (`apps/webhook-dispatcher/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Dispatcher HTTP port | `3001` |
| `DISPATCHER_API_SECRET` | Shared secret for watcher → dispatcher auth | `super_secret` |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | `https://discord.com/api/webhooks/...` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | `1234567890:ABC...` |
| `TELEGRAM_CHAT_ID` | Telegram chat/channel ID | `-1001234567890` |
| `CIRCLE_API_KEY` | Circle API key | `circle_...` |
| `CIRCLE_API_URL` | Circle API base URL | `https://api.circle.com` |
| `WORMHOLE_API_KEY` | Wormhole API key | `whorm_...` |
| `WORMHOLE_API_URL` | Wormhole API base URL | `https://api.wormholescan.io` |

---

## Setup & Running

### 1. Start Infrastructure

Spin up the local data stack (PostgreSQL, Redis, Kafka) using Docker Compose:

```bash
cd docker-services
docker compose up -d
```

Wait for all services to report healthy:

```bash
docker compose ps
```

### 2. Run Database Migrations

Apply the PostgreSQL schema from the watcher migrations directory:

```bash
cd watcher
# Using sqlx-cli (install with: cargo install sqlx-cli)
sqlx migrate run --database-url "$DATABASE_URL"
```

### 3. Deploy Anchor Programs

If deploying fresh to Devnet:

```bash
cd programs
anchor build
anchor deploy --provider.cluster devnet
```

If using the already-deployed program IDs, update `SENTINEL_PROGRAM_ID` and `WATCHED_PROGRAMS` in your watcher `.env` accordingly. No redeploy needed.

### 4. Start the Watcher

```bash
cd watcher
cargo run --release
```

The watcher will:
- Connect to Yellowstone gRPC and begin streaming transactions
- Initialize detection state from Redis
- Start the HTTP + WebSocket API on `API_PORT`

### 5. Start the Webhook Dispatcher

```bash
cd apps/webhook-dispatcher
bun install
bun run start
```

### 6. Start the Frontend Dashboard

```bash
cd apps/sentinel-frontend
npm install
npm run dev
```

Dashboard is available at `http://localhost:3000`.

---

## API Reference

The Next.js frontend proxies watcher endpoints under `/api`. All endpoints are also available directly from the watcher at `NEXT_PUBLIC_WATCHER_HTTP_URL`.

| Endpoint | Method | Description |
|---|---|---|
| `/api/alerts` | `GET` | List recent alerts with severity, rule, and timestamps |
| `/api/stats` | `GET` | Current system stats: alert count, pause count, uptime |
| `/api/unpause` | `POST` | Manually trigger on-chain unpause (requires operator auth) |
| `/api/config` | `GET` / `POST` | View or update runtime detection thresholds |
| `/api/protocol-status` | `GET` | Current protocol pause state from on-chain account |
| `/api/tvl` | `GET` | Current TVL and historical TVL data series |
| `/api/dispatch` | `POST` | Manually trigger a webhook dispatch (internal use) |

**WebSocket:** Connect to `NEXT_PUBLIC_WATCHER_WS_URL` for a live stream of alert events and TVL updates without polling.

---

## Dashboard

The Next.js dashboard provides four main operational areas:

### Alerts
Live feed of all scored alerts with rule name, severity score, affected accounts, and timestamp. Color-coded by severity tier (info / warning / critical). Links to Solana Explorer for each transaction.

### Analytics
Time-series charts for TVL, bridge outflow volume, and alert frequency. Powered by Recharts. Useful for baselining normal protocol behavior and reviewing post-incident timelines.

### Controls
Manual override panel for operators:
- Trigger `unpause_withdrawals` after verifying threat is neutralized
- Adjust `MIN_SEVERITY_TO_PAUSE` and `MIN_SEVERITY_TO_PUBLISH` at runtime without restarting
- View current watcher configuration

### Live Monitoring
Real-time feed of incoming transactions being scored, with per-rule signal breakdown. Useful during incident triage to understand what the detection engine is seeing.

---

## Testing & Demo Verification

### Run Attack Simulations

```bash
cd tests
bun install
bun run attack_scenarios.ts
```

This script executes a series of exploit simulations against `mock_protocol` on Devnet, including:
- Flash loan drain simulation
- Rapid TVL withdrawal to trigger TvlVelocity
- Bridge outflow spike via Wormhole mock

### Observe Alert Generation

With the watcher running, alerts will appear in:
- The terminal log (`WARN` level with full JSON payload)
- The `/api/alerts` endpoint
- The dashboard Alerts panel in real time

### Confirm Pause Execution

Check the `mock_protocol` account state after a high-severity alert fires:

```bash
solana account HyUb8Ffara4byitYExmbjbA37Ja7By8fECpG6dFyg8Ln --url devnet
```

The `withdrawals_paused` field will be `true`. You can also verify the pause transaction in the dashboard Controls panel, which shows confirmed pause transaction signatures linkable to Solana Explorer.

### Inspect Webhook Outputs

Watch dispatcher logs for outbound notification confirms to Discord and Telegram:

```bash
cd apps/webhook-dispatcher
bun run start --log-level debug
```

---

## Security Model

**Assumptions:**
- The watcher keypair (`WATCHER_KEYPAIR_PATH`) is stored securely and has authority to call `pause_withdrawals` on the `sentinel_guardian` program.
- The `DISPATCHER_API_SECRET` is kept confidential between the watcher and dispatcher. The dispatcher rejects any request without a valid `Authorization` header.
- Detection rule thresholds are the primary defense-tuning surface. Misconfigured thresholds (too low) may cause false-positive pauses; (too high) may miss real attacks.
- The system is defense-in-depth — it adds a first automated layer, but does not replace protocol-level security audits or multisig governance.
- On-chain pause authority is intentionally held by a single keypair for hackathon demo purposes. A production deployment should use a multisig (e.g., Squads Protocol) for pause authority.

**Trust Boundaries:**
- The watcher trusts Yellowstone/Helius for transaction data integrity.
- The dispatcher trusts the watcher for alert payloads, authenticated via shared secret.
- The frontend trusts the watcher API; the watcher is the source of truth.

---

## Alert Severity Thresholds

Severity scores are integers from 0 to 100, computed by summing weighted signals across all active detection rules for a given transaction or time window event.

| Score Range | Level | Default Action |
|---|---|---|
| 0 – 49 | INFO | No action. Logged to PostgreSQL. |
| 50 – 74 | WARNING | Alert published to dashboard and Kafka. Webhook notification sent. |
| 75 – 84 | HIGH | Alert published. All webhook channels notified with urgency flag. |
| 85 – 100 | CRITICAL | Alert published + on-chain `pause_withdrawals` triggered automatically. |

Thresholds are controlled by `MIN_SEVERITY_TO_PUBLISH` and `MIN_SEVERITY_TO_PAUSE` environment variables and can be updated at runtime via `POST /api/config` without restarting the watcher.

---

## Failure Handling

| Failure Mode | Behavior |
|---|---|
| Geyser connection drop | Watcher reconnects with exponential backoff; no alerts lost during gap |
| PostgreSQL unavailable | Watcher continues in-memory; alerts buffered in Redis; DB writes retried |
| Redis unavailable | Watcher falls back to in-process state; dedup disabled temporarily |
| Kafka unavailable | Alert publishing continues to dashboard and webhooks; Kafka writes retried on reconnect |
| Webhook dispatcher down | Watcher retries dispatch with exponential backoff; alerts still published to dashboard |
| On-chain pause CPI fails | Error logged with full context; alert escalated; operator notified via all webhook channels |

The watcher is designed to degrade gracefully: loss of any downstream sink does not halt detection or alerting to surviving sinks.

On process restart, the watcher recovers state from Redis and PostgreSQL before resuming the Geyser stream, ensuring no detection window is missed on normal restarts.

---

## Data Stores & Retention

| Store | Data | Default Retention |
|---|---|---|
| PostgreSQL `alerts` | All scored alerts ≥ `MIN_SEVERITY_TO_PUBLISH` | Indefinite (configurable) |
| PostgreSQL `tvl_history` | TVL snapshots at configurable intervals | 90 days rolling |
| PostgreSQL `outflow_history` | Bridge outflow volume per window | 90 days rolling |
| Redis | Hot TVL state, vault balances, alert dedup keys | 24-hour TTL on dedup keys |
| Kafka `sentinel.transactions` | Raw transaction payloads | Per broker retention config (default 7 days) |
| Kafka `sentinel.alerts` | Alert event log | Per broker retention config (default 30 days) |

---

## Deployment Topology

For a production deployment beyond the hackathon demo:

```
                         ┌─────────────────┐
                         │   Solana RPC /  │
                         │ Yellowstone gRPC│
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │  Watcher (Rust) │  ← single instance, or multiple
                         │  + Axum API     │    with leader election
                         └───┬─────────┬───┘
                             │         │
               ┌─────────────▼┐       ┌▼──────────────┐
               │  PostgreSQL  │       │     Redis      │
               │  (primary +  │       │  (standalone / │
               │   replica)   │       │   sentinel)    │
               └──────────────┘       └────────────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  Kafka (3-broker     │
                                   │  cluster for prod)   │
                                   └──────────┬───────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │  Webhook Dispatcher  │
                                   │  (Bun, stateless,    │
                                   │   horizontally       │
                                   │   scalable)          │
                                   └─────────────────────┘
```

Recommended: deploy watcher and dispatcher behind a private VPC. Expose only the frontend and the threat feed API (with rate limiting and auth) publicly.

---

## Monitoring & Logging

The watcher emits structured JSON logs at configurable verbosity levels (`RUST_LOG=info` for production, `debug` for development). Every alert, CPI call, and rule scoring event is logged with:

- `timestamp` (ISO 8601)
- `rule` (detection rule name)
- `severity` (integer score)
- `tx_signature` (Solana transaction signature)
- `accounts_involved` (affected account pubkeys)
- `action_taken` (`published` / `paused` / `none`)

**Recommended monitoring stack:** ship watcher logs to a centralized log aggregator (Datadog, Grafana Loki, or AWS CloudWatch). Alert on `CRITICAL` severity log entries and on any CPI failure events as second-layer monitoring independent of the dashboard.

---

## Incident Response & Unpause Workflow

When SentinelGuard automatically pauses a protocol, the following operator workflow applies:

1. **Triage** — Review the triggering alert in the dashboard Alerts panel. Examine the linked transaction on Solana Explorer. Determine whether the signal is a true positive or false positive.

2. **Investigate** — Use the Analytics panel to inspect TVL trends and outflow history around the incident timestamp. Review Kafka alert log for the full event sequence.

3. **Neutralize (if true positive)** — Coordinate with protocol team to identify and close the exploit vector. Deploy a patched program or revoke attacker authority before unpausing.

4. **Unpause** — Once confident the threat is resolved, execute unpause via the dashboard Controls panel (`POST /api/unpause`) or directly via CLI:

```bash
# Unpause via CLI using Anchor
anchor run unpause --provider.cluster devnet
```

5. **Post-mortem** — Export the incident alert timeline from `/api/alerts` and the TVL history from `/api/tvl` for post-mortem documentation.

> **False positive handling:** If the pause was triggered incorrectly, unpause immediately via the Controls panel. Raise `MIN_SEVERITY_TO_PAUSE` or tune the affected rule's weights to prevent recurrence.

---

## Known Limitations

- **Devnet only**: This build targets Solana Devnet. Mainnet deployment requires a formal security audit of the `sentinel_guardian` program and production-grade key management.
- **Single watcher keypair**: The pause authority is held by a single keypair. Production systems should use Squads multisig for pause authority to prevent single point of compromise.
- **Detection rules are heuristic**: The three built-in rules cover known exploit patterns but cannot detect novel attack vectors without rule updates.
- **No historical backfill**: The watcher only processes transactions received after startup. Historical TVL is seeded from PostgreSQL if available; otherwise the first `WINDOW_SIZE` seconds of data accumulates before velocity rules activate.
- **Kafka is best-effort in demo mode**: For the hackathon build, Kafka is run as a single broker via Docker Compose. This is not fault-tolerant; for production, a 3-broker cluster is required.
- **No audit**: `sentinel_guardian` has not been independently audited. Do not use in production with real protocol funds without a full audit.

---

## License

MIT License. See [LICENSE](LICENSE) for full terms.

---

## Security Disclosure

If you discover a security vulnerability in SentinelGuard, please disclose it responsibly. Do not open a public GitHub issue for security findings.

**Security contact:** rudraprajapati2612@gmail.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Any suggested mitigations

We aim to respond to security disclosures within 48 hours.

---

*Built for the [Colosseum Frontier Hackathon 2026](https://arena.colosseum.org/hackathon) by [@0xRudraSol](https://x.com/0xRudraSol)*
