# Security Policy

EquityMux routes real transactions on BSC mainnet. Safety is the core design
constraint — the LLM interprets language but has **no final transaction
authority**; all authorization is deterministic.

## Scope

In scope for reports:

- Ways to bypass the deterministic policy engine or system ceilings
- Ways to execute without simulation, confirmation, or wallet authorization
- Receipt forgery or hash-verification bypass
- Secret leakage through API responses, receipts, or DX event logs
- Dependency or supply-chain risks in the build

Out of scope:

- The Binance Agentic Wallet CLI itself (`baw`) — report upstream
- Third-party issuer contracts (Ondo, xStocks, bStock)
- Demo-mode behavior (`DEMO_MODE=true` serves recorded fixtures by design)

## Reporting

Do **not** open a public issue for a vulnerability. Email the maintainer via
the address in the git history (`git log`) or open a private GitHub Security
Advisory on this repository.

Include: affected endpoint/module, reproduction steps, and whether the issue
affects `EXECUTION_ENABLED=false` (default, safe) or an armed configuration.

## Defaults that keep you safe

- `EXECUTION_ENABLED=false` — the system kill switch; nothing executes until armed
- `REQUIRE_SIMULATION=true`, `REQUIRE_CONFIRMATION=true`
- `MAX_MAINNET_NOTIONAL_USD=25` — hard ceiling no constitution can override
- `MAX_SLIPPAGE_BPS_HARD=100`, `MAX_PREMIUM_BPS_HARD=100` — hard caps
- Real execution additionally requires: connected Agentic Wallet, chain ID 56,
  fresh quote (<30 s), passing simulation, and human confirmation

See `docs/system-architecture.md` for the full authorization model.
