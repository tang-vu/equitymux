# Product roadmap

## Implemented

- BSC discovery and multiplier-aware prices across Ondo, xStocks and bStock.
- Deterministic decision desk with source labels and rejected alternatives.
- Same-snapshot policy comparison and a liquidity-evidence challenge.
- Self-contained receipts, browser hash verification and offline replay.
- REST, CLI and read-only MCP using the same engine.
- Execution state machine hardened against missing simulation, stale prices and absent risk context.
- Foundry registry source and BNB Agent Studio integration scaffold.

See [validation](validation.md) for actual results. Historical discovery counts,
benchmark timings and dry-run gas estimates are not current production metrics.

## Required before a live trade

1. Integrate authoritative reference observation times and executable depth.
2. Bind exact sender, recipient, chain, calldata, value and quote expiry to simulation and approval.
3. Authenticate execution requests, bind approval to the plan hash and prevent replay.
4. Verify post-trade balance deltas against the intended position.
5. Obtain explicit authorization for mainnet spend, then record a small real trade.

Wallet login alone does not resolve these engineering requirements.

## Submission operations

- Publish stable web/API deployments and record verified URLs.
- Record the 2–4 minute demo and genuine developer-written DX report.
- Deploy the receipt registry if on-chain anchoring adds demonstrable value.
- Deploy Agent Studio and prove settlement before claiming completion of the special-prize integration.

Multi-asset optimization, autonomous trading and payments are deferred until the
single-exposure workflow has dependable execution evidence.
