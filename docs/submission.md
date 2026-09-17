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
  BSC JSON-RPC, token-audit security API. TTL-cached parallel enrichment;
  peer reference fallback with provenance (`peer:ondo`).
- **Underlyings index**: `/api/underlyings` — 510 canonical equity↔token
  mappings across the three BSC issuers, browsable in Explorer.
- Agentic Wallet boundary (`baw` CLI) for quotes/swaps; order polled to
  terminal `FINISHED`/`FAILED`.
- **Receipts are independently verifiable**: canonical JSON + sha256 with a
  cross-language parity vector (Python ⇄ TypeScript); the UI re-computes the
  hash client-side AND via `GET /api/receipts/{id}/verify`.
- 89 Python tests + 11 frontend tests + 4 Foundry tests, all green.
  `verify:live` reproduces every read-only claim with no credentials.
- Fail-closed defaults: `EXECUTION_ENABLED=false`, system ceilings the
  constitution cannot loosen. Clean checkout verified end-to-end
  (`scripts/ci-local.sh`); Docker images for api+web, compose file included.

## Agentic-wallet + Agent Studio (special prizes)
- **Agentic Wallet**: sole execution path for user funds; explicit auth,
  quote, simulate, confirm, poll, verify.
- **Agent Studio Keeper** (`services/keeper`, `bag` CLI): canonical
  `bag init` scaffold; `bag doctor` all-PASS on bsc-mainnet. The keeper's
  `doWorkAndSubmit` is overridden to call the EquityMux API — the paid
  deliverable is deterministic engine JSON, not LLM prose; signing stays in
  fixed code. ERC-8004 registration scripted, gated on public deploy.
- **x402**: `POST /api/agent/tasks/paid` issues a real 402 challenge when
  `X402_PAYTO_ADDRESS` is configured; honestly 501s without it — settlement
  verification is not claimed until a facilitator is wired.

## Developer Experience Report
9 recorded issues in `dx/` (`pnpm dx:summary`): WAF-blocked docs
(workaround: skills-hub repo), bStock `stockInfo.price=null` (peer-reference
fallback, then `kline:close` last-resort fallback — verified live on the
bStock-only ticker BNC), 10s token-dynamic latency (parallel enrichment),
token-audit 400 → corrected POST shape, `baw` async order lifecycle, dev-proxy
silently targeting a wrong backend, a mypy-caught latent crash, a
container-layout `REPO_ROOT` break, and the peer-fallback coverage gap the
kline fallback closes. See `docs/dx-report.md`.

## Judge quickstart
See README — `pnpm test:api`, `pnpm test:web`, `pnpm test:contracts`,
`pnpm verify:live`, `pnpm verify:receipt`, `./scripts/ci-local.sh`, or
`docker compose up --build`.
Screenshots of every page against live mainnet data: `docs/demo/`.
Mainnet execution requires the sign-in steps in `docs/demo-script.md`.

## Integrity
No fake data presented as live; fixtures labeled RECORDED; every blocked
integration labeled BLOCKED with reproduction steps.
