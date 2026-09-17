# System Architecture

```
┌──────────────────────── apps/web (Next.js 15) ────────────────────────┐
│ Terminal · Constitution · Explorer · Routes · Receipts · Agent · Dev   │
│ /api/* rewritten → EQUITYMUX_API (no secrets in the browser)           │
└──────────────────────────────┬─────────────────────────────────────────┘
                               ▼
┌──────────────────── services/api (FastAPI, Python 3.14) ──────────────┐
│ api/main.py            thin REST layer                                │
│ services/pipeline.py   intent→receipt orchestrator + state machine    │
│ services/graph.py      CanonicalEquityGraph + platform adapters       │
│ services/tournament.py quote candidates, deterministic scoring        │
│ services/receipts.py   canonical JSON → sha256 receipt hash           │
│ services/keeper.py     bounded maintenance tasks (ERC-8183-style)     │
│ policy/compiler.py     NL → typed PortfolioConstitution               │
│ policy/engine.py       deterministic per-rule evaluation, fail closed │
│ providers/                                                            │
│   binance_public.py    RWA list/dynamic/meta/status/kline (keyless)   │
│   baw.py               Agentic Wallet CLI boundary (baw --json)       │
│   bsc_rpc.py           eth_call / receipts / balances (read-only)     │
│   audit.py             token security audit (POST + requestId)        │
└───────┬──────────────────┬───────────────────┬────────────────────────┘
        ▼                  ▼                   ▼
  Binance public      Agentic Wallet      BSC JSON-RPC
  RWA APIs            (baw CLI —          (public endpoints,
  (www + web3)        signs nothing       verification only)
                      without user)

packages/contracts   EquityMuxReceiptRegistry — evidence notary (no funds)
services/keeper      BNB Agent Studio config (bag CLI, ERC-8004/8183/x402)
```

## Authorization boundary (5 layers)

1. **Portfolio Constitution** — deterministic engine; each rule emits
   PASS/FAIL/REQUIRES_CONFIRMATION with a detail string.
2. **System ceilings** — env (`MAX_*_HARD`, `ALLOWED_*`, `EXECUTION_ENABLED`)
   cannot be loosened by any constitution.
3. **Fresh simulation binding** — quote + on-chain balance probe; stale
   simulation (`> max_simulation_age_s`) aborts execution.
4. **Agentic Wallet policy** — `baw` enforces its own limits/tx-lock; we only
   ever *submit*; success is polled to `FINISHED`.
5. **On-chain verification** — `eth_getTransactionReceipt` + portfolio delta
   recorded into the receipt.

## Execution state machine

`INTENT_COMPILED → DISCOVERING → QUOTING → SIMULATING →
{AWAITING_CONFIRMATION | POLICY_REJECTED | SIMULATION_FAILED |
NO_VALID_ROUTE} → EXECUTING → PENDING_CONFIRMATION → {CONFIRMED |
EXECUTION_FAILED}`

Every transition is timestamped into the receipt.

## Data integrity

- Prices are `Decimal` end-to-end; `referencePrice = tokenPrice ÷
  sharesMultiplier` where the multiplier is read per query.
- Receipts serialize canonically (sorted keys, fixed separators) before
  sha256; the hash field itself is excluded (`receiptHash`/`receipt_hash`).
- `DEMO_MODE=true` swaps the provider transport to `fixtures/rwa` — same
  parsing path, visibly labeled.
