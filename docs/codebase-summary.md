# Codebase Summary

```
equitymux/
├── apps/web/                    Next.js 15 + Tailwind v4 frontend
│   ├── app/                     / (terminal) constitution explorer routes
│   │                            receipts agent dev  + icon.svg
│   ├── components/              Nav, PipelineStages, RouteTable, ReceiptCard
│   ├── lib/api.ts               typed client; mirrors backend JSON
│   └── lib/canonical.ts         Python-parity canonical JSON + sha256
│                                (verifyReceiptHash — independent of server)
├── services/api/                Python backend (uv-managed; dep-groups dev)
│   └── equitymux/
│       ├── config.py            Settings + system ceilings (kill switches)
│       ├── api/main.py          REST: health config constitution explore
│       │                        underlyings intent receipts agent dx
│       ├── domain/              models (intent/representation/candidate/
│       │                        receipt), Decimal math helpers
│       ├── policy/              schema (PortfolioConstitution + hash),
│       │                        compiler (NL→rules), engine (evaluate)
│       ├── providers/           binance_public (TTL cache), baw (Agentic
│       │                        Wallet), bsc_rpc, audit, errors
│       ├── services/            graph (parallel enrich + peer ref),
│       │                        tournament, pipeline, receipts,
│       │                        state_machine, keeper, persistence,
│       │                        intent parser
│       ├── verify_live.py       read-only mainnet checks (no tx)
│       └── verify_execution.py  human-gated real-trade proof
│   └── tests/                   85 pytest tests — compiler, intent fuzz,
│                                pipeline state machine, graph enrichment,
│                                api surface, security, openapi guard
├── services/keeper/             BNB Agent Studio keeper
│   ├── studio.toml              canonical bag layout (bsc-mainnet, $U)
│   └── agent/                   bag-init scaffold — doWorkAndSubmit
│                                overridden → POSTs /api/agent/tasks
├── packages/contracts/          Foundry: EquityMuxReceiptRegistry + tests
├── fixtures/rwa/                recorded API responses (tests + demo mode)
├── docs/                        research, architecture, standards, demo,
│   │                            submission, dx-report, roadmap
│   └── demo/                    live screenshots of all 7 pages
├── dx/                          recorded DX issues (9) + raw API events
├── scripts/                     fetch-fixtures, dx-summary, screenshots,
│                                check-receipt-provenance (verify:receipt),
│                                ci-local (full judge pipeline)
├── Dockerfile.api/.web          verified images; docker-compose.yml
└── .github/workflows/ci.yml     backend, contracts, frontend+vitest,
                               keeper-agent, secrets scan, demo-mode
                               smoke test
```

## Entry points

| Command | Purpose |
|---|---|
| `pnpm dev:api` / `pnpm dev:web` | local stack |
| `pnpm test:api` | 85 backend tests (offline) |
| `pnpm test:web` | 11 vitest tests (canonical parity + components) |
| `pnpm test:contracts` | forge tests |
| `pnpm verify:live` | live read-only checks (8 PASS / 1 BLOCKED w/o wallet) |
| `pnpm verify:receipt` | receipt provenance — dataLabel inside the hash |
| `pnpm verify:mainnet-execution` | gated real-tx proof |
| `pnpm dx:summary` | DX evidence report |
| `./scripts/ci-local.sh` | everything, in order |
| `docker compose up --build` | containerized demo |
