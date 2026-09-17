# EquityMux — 4-minute demo script

Target: show the full intent→receipt pipeline on BSC mainnet in under four
minutes. Stage timestamps assume a connected wallet (obtained before filming).

## 0:00–0:25 — The problem
- Show the Explorer page: one underlying (NVDA) → three BSC tokens
  (`NVDAon`, `NVDAx`, `NVDAB`), three different prices.
- Line: *"Users shouldn't need to know which NVDA token to buy."*

## 0:25–0:55 — Intent & Constitution
- Terminal page: type `Buy $10 of NVIDIA`.
- Pipeline stages animate: intent resolved → NVDA, constitution compiled.
- Open Constitution page: show the compiled policy —
  `maxPremiumOverReferenceBps`, `marketMustBeOpen`, `simulationRequired`,
  `spotOnly`. Line: *"The LLM interprets. The constitution decides."*

## 0:55–1:45 — Discovery & route tournament
- Routes page: three candidates with live evidence —
  reference price vs on-chain price, premium bps, market state, liquidity,
  audit status.
- Tournament verdict: deterministic winner with explicit reasons; losers show
  exact fail/pass conditions. Line: *"No black box — every route gets a
  reason."*

## 1:45–2:40 — Policy gate, simulation, wallet
- Selected route blocked/passed by constitution — show the pass list and
  the system ceilings it cannot loosen.
- Simulation result (BSC RPC eth_call): expected out, gas, slippage.
- Agentic Wallet prompt: `baw market-order quote` → human approves in
  Binance Wallet App. Line: *"The model never touches signing."*

## 2:40–3:30 — Execution & verification
- Order polls to `FINISHED` (never report success at orderId).
- `eth_getTransactionReceipt` + portfolio delta shown.
- Receipts page: canonical JSON, `receiptHash` = sha256, links to
  policy hash, intent hash, execution tx hash.
- Optional: `ReceiptRegistry.commit` tx on BscScan — on-chain evidence
  notary (holds no funds).

## 3:30–4:00 — Agent & DX
- Agent Ops page: Keeper task surface (ERC-8183), ERC-8004 identity card,
  x402 status — labeled honestly.
- `pnpm verify:live` output recap: 6 PASS / 1 BLOCKED → post-auth all PASS.
- `pnpm dx:summary`: real DX events (WAF-blocked docs, audit param fix,
  wallet auth gate). Line: *"Our friction is the report."*

## Fallbacks
- No wallet: `DEMO_MODE=true` runs the identical UI over recorded fixtures
  (visible RECORDED badge). Execution step shows the BLOCKED panel with the
  exact `baw auth signin` steps instead — honesty is the demo.
- API hiccup: Explorer/Routes read from `fixtures/rwa` timestamps; state the
  capture time aloud.
