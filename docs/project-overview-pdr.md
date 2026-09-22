# Project Overview / PDR — EquityMux

## Problem

Tokenized equities fragment exposure across issuers. The same NVDA exists on
BSC as `NVDAon` (Ondo), `NVDAx` (xStocks), `NVDAB` (bStock) — different
prices, liquidity, backing models, market hours. Users must currently pick a
token; agents must guess safely. Both are broken.

## Product

EquityMux is the intent and execution router for tokenized stocks. Users
express *exposure* ("buy $10 of NVDA"); EquityMux discovers all on-chain
representations, collects evidence, applies a deterministic Portfolio
Constitution and compares normalized provider evidence. The decision desk emits
a replayable decision receipt and exposes policy counterfactuals. The existing
Agentic Wallet execution path remains blocked until exact transaction simulation,
fresh reference evidence and authenticated approval are implemented and verified.

## Users

- Retail users who want stock exposure without issuer archaeology.
- Agents/keepers that need a deterministic policy boundary between intent
  and signing.
- Judges evaluating whether intent routing can be both automated and safe.

## Non-goals

- Not a DEX, not an issuer, not custody. No funds ever touch EquityMux
  contracts.
- No leverage/perps — spot only, BSC mainnet, chainId 56.
- No LLM signing authority — the model interprets; the engine decides.

## Success criteria (hackathon)

1. Recorded demo passes; live checks report current evidence honestly.
2. Decisions replay independently; a small mainnet trade remains a release gate.
3. Constitution visibly constrains execution (fail-closed demonstrations).
4. Honest labels: VERIFIED / BLOCKED / RECORDED — zero fake claims.

## Core objects

- `EquityIntent` — parsed exposure (ticker, side, notional, quote asset).
- `TokenizedRepresentation` — normalized issuer token (platform, address,
  multiplier, prices, market state, attestation, liquidity, audit).
- `PortfolioConstitution` — typed policy; hash-pinned at approval.
- `CandidateRoute` — representation + quote + policy results + score.
- `ExecutionReceipt` — canonical JSON binding intent hash, constitution hash,
  checks, simulation, tx, deltas → `receiptHash`.

## Key invariants

- `EXECUTION_ENABLED` defaults false; system ceilings outrank user policy.
- A route without fresh quote + simulation cannot execute.
- An orderId is never reported as success — only `FINISHED` is.
- Every rejected candidate carries explicit reason codes.
