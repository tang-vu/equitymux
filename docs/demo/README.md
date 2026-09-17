# Demo evidence

Captured against the **live** stack — API on `:8001`, web on `:3000`,
`DEMO_MODE=false`, `EXECUTION_ENABLED=false`. Every badge and number is real
(BSC chainId 56, live block, Binance RWA `marketStatus=regular`). The wallet
is honestly `UNCONNECTED` — real execution needs a human `baw` sign-in.

| File | Page | Shows |
|---|---|---|
| `home.png` | Terminal | intent box, live status rail (BSC·56 / LIVE / REGULAR / WALLET:UNCONNECTED), execution disabled by default |
| `constitution.png` | Constitution | ACTIVE·REV 1 + canonical hash, NL rules, suggestion chips |
| `explorer.png` | Explorer | NVDA × 3 platforms live (ondo/xstocks/bstock), `peer:ondo` reference provenance on bstock, 510-underlying BSC index |
| `routes.png` | Routes | tournament output — scored candidates with explicit reject reasons |
| `receipts.png` | Receipts | persisted receipt list (NO_VALID_ROUTE fails closed, no fake success) |
| `agent.png` | Agent Ops | keeper identity, honest x402 status card, 5-layer authorization boundary |
| `dev.png` | Dev | health/config JSON + JSONL DX event log |

Regenerate: `node scripts/screenshots.mjs` (needs `CHROME` + running dev stack).
