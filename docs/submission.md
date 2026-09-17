# EquityMux — BNB Hack: Tokenized Stocks Edition submission

## One-liner
The intent and execution router for tokenized stocks: say "buy $10 of NVDA"
and EquityMux finds, vets, simulates, and executes the safest valid BSC
representation — then proves it with a cryptographic receipt.

## Why it's original
- **Representation-agnostic exposure**: first-class "underlying asset" object;
  `NVDAon`/`NVDAx`/`NVDAB` are interchangeable routes, not user-facing choices.
- **Portfolio Constitution**: NL intent compiles to a deterministic policy —
  premiums, slippage, liquidity, market-hours, platform allow-lists — that the
  LLM cannot override. LLM interprets; the engine decides.
- **Route tournament**: all valid candidates scored deterministically with
  per-rule pass/fail evidence.
- **Evidence receipts**: canonical JSON → sha256 receipt hash binding intent,
  constitution, quote, simulation, tx, and post-trade portfolio delta;
  optional on-chain commit via `EquityMuxReceiptRegistry` (notary, no custody).

## Technical implementation
- Real BSC mainnet reads: Binance public RWA APIs (Ondo/xStocks/bStock),
  BSC JSON-RPC, token-audit security API.
- Agentic Wallet boundary (`baw` CLI) for quotes/swaps; order polled to
  terminal `FINISHED`/`FAILED`.
- 56 Python tests + 4 Foundry tests, all green. `verify:live` reproduces
  every read-only claim with no credentials.
- Fail-closed defaults: `EXECUTION_ENABLED=false`, system ceilings the
  constitution cannot loosen.

## Agentic-wallet + Agent Studio (special prizes)
- **Agentic Wallet**: sole execution path for user funds; explicit auth,
  quote, simulate, confirm, poll, verify.
- **Agent Studio Keeper** (`services/keeper`, `bag` CLI): ERC-8183-style
  bounded tasks — graph refresh, compliance evaluation, rebalance prep —
  analysis-only, never self-executing. ERC-8004 registration scripted and
  surfaced in Agent Ops; x402 surface declared, gated on deployment.

## Developer Experience Report
Real recorded events in `dx/` (`pnpm dx:summary`): WAF-blocked docs
(workaround: llms.txt + skills-hub repo), token-audit 400 → corrected POST
shape, wallet auth gating the execution path, receipt-hash key casing bug.
See `docs/dx-report.md`.

## Judge quickstart
See README — `pnpm test:api`, `pnpm test:contracts`, `pnpm verify:live`.
Mainnet execution requires the sign-in steps in `docs/demo-script.md`.

## Integrity
No fake data presented as live; fixtures labeled RECORDED; every blocked
integration labeled BLOCKED with reproduction steps.
