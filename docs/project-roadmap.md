# Project Roadmap

## Done (verified in this repo)

- Live RWA discovery across Ondo / xStocks / bStock on BSC.
- Canonical equity graph; Decimal normalization; multiplier-aware pricing.
- Portfolio Constitution: NL compiler + deterministic engine + hashing.
- Route tournament with per-rule reasons; fail-closed on missing evidence.
- Execution state machine, simulation binding, stale-quote protection.
- Canonical receipts with sha256 hashing; Foundry notary contract (4 tests).
- FastAPI surface + Next.js frontend (7 routes, build green).
- Agentic Wallet CLI boundary; verify:live read-only command.
- Keeper service scaffold + Studio config; DX evidence pipeline.

## Blocked on human action

- Wallet sign-in (`baw auth signin`) → unlocks executable quote, simulation
  probe, tiny mainnet proof tx (`pnpm verify:mainnet-execution`).
- ERC-8004 on-chain registration → needs `bag deploy` target decision.

## Near-term

- Receipt commit tx on the deployed registry (post-deploy).
- Kline-based reference proxy for bStock when `stockInfo.price` is null.
- Parallel enrichment to hide `token/dynamic/info` latency.
- x402 paid endpoint demo on the deployed keeper.

## Later

- Multi-underlying portfolio intents ("rebalance to 60/40 NVDA/AAPL").
- Limit-order routes via `baw limit-order`.
- Receipt anchoring cadence + public verification page.
