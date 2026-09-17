# Project Roadmap

## Done (verified in this repo)

- Live RWA discovery across Ondo / xStocks / bStock on BSC; **510
  underlyings** indexed (`/api/underlyings`).
- Canonical equity graph; Decimal normalization; multiplier-aware pricing;
  **TTL cache + parallel enrichment** (~0.8 s full graph); **peer
  reference fallback** with `peer:*` provenance.
- Portfolio Constitution: NL compiler + deterministic engine + hashing.
- Route tournament with per-rule reasons; fail-closed on missing evidence.
- Execution state machine, simulation binding, stale-quote protection.
- Canonical receipts, sha256; **client + server dual verification**;
  cross-language parity test vector. Foundry notary contract (4 tests);
  BSC testnet deploy dry-run (343,595 gas).
- FastAPI surface + Next.js frontend (7 routes, build green; health
  fingerprint guards the dev proxy).
- Agentic Wallet CLI boundary; verify:live read-only command.
- **Keeper**: canonical `bag` scaffold, `bag doctor` all-PASS, deterministic
  `doWorkAndSubmit` → EquityMux API (no LLM in the paid path).
- **x402** challenge surface (`/api/agent/tasks/paid`): 402 + `accepts`
  when configured, honest 501 otherwise.
- Dockerfiles (api+web verified), compose, `ci-local.sh`, CI with vitest +
  keeper + secrets scan. Clean-checkout judge test passed end-to-end.
- DX evidence pipeline: 8 recorded issues → `docs/dx-report.md`.

## Blocked on human action

- Wallet sign-in (`baw auth signin`) → unlocks executable quote, simulation
  probe, tiny mainnet proof tx (`pnpm verify:mainnet-execution`).
- Receipt-registry **broadcast** → needs tBNB on the throwaway deployer
  (`docs/deployment-guide.md` has the faucet + command).
- Public deploy target choice → then ERC-8004 registration.
- Agent Studio deploy → AWS/Azure creds (or 48 h `bnb` testnet trial).

## Near-term

- Receipt commit tx on the deployed registry (post-deploy).
- Kline-based reference proxy for bStock when `stockInfo.price` is null
  (peer fallback already shipped).
- x402 paid endpoint demo on the deployed keeper + facilitator wiring.

## Later

- Multi-underlying portfolio intents ("rebalance to 60/40 NVDA/AAPL").
- Limit-order routes via `baw limit-order`.
- Receipt anchoring cadence + public verification page.
