# Codebase Summary

```
equitymux/
├── apps/web/                    Next.js 15 + Tailwind v4 frontend
│   ├── app/                     / (terminal) constitution explorer routes
│   │                            receipts agent dev
│   ├── components/              Nav, PipelineStages, RouteTable, ReceiptCard
│   └── lib/api.ts               typed client; mirrors backend JSON
├── services/api/                Python backend (uv-managed venv)
│   └── equitymux/
│       ├── config.py            Settings + system ceilings (kill switches)
│       ├── api/main.py          REST: health config constitution explore
│       │                        intent receipts agent dx
│       ├── domain/              models (intent/representation/candidate/
│       │                        receipt), Decimal math helpers
│       ├── policy/              schema (PortfolioConstitution + hash),
│       │                        compiler (NL→rules), engine (evaluate)
│       ├── providers/           binance_public, baw (Agentic Wallet),
│       │                        bsc_rpc, audit, errors
│       ├── services/            graph, tournament, pipeline, receipts,
│       │                        state_machine, keeper, persistence,
│       │                        intent parser
│       ├── verify_live.py       read-only mainnet checks (no tx)
│       └── verify_execution.py  human-gated real-trade proof
│   └── tests/                   56 pytest tests, fixture-driven
├── services/keeper/             BNB Agent Studio agent config + docs
├── packages/contracts/          Foundry: EquityMuxReceiptRegistry + tests
├── fixtures/rwa/                recorded API responses (tests + demo mode)
├── docs/                        research, architecture, standards, demo,
│                              submission, dx-report, roadmap
├── dx/                          recorded DX issues + raw API events
├── scripts/                     fetch-fixtures.py, dx-summary.py
└── .github/workflows/ci.yml     backend, contracts, frontend, secrets scan
```

## Entry points

| Command | Purpose |
|---|---|
| `pnpm dev:api` / `pnpm dev:web` | local stack |
| `pnpm test:api` | 56 backend tests (offline) |
| `pnpm test:contracts` | forge tests |
| `pnpm verify:live` | live read-only checks |
| `pnpm verify:mainnet-execution` | gated real-tx proof |
| `pnpm dx:summary` | DX evidence report |
