# Codebase map

Read [README](../README.md) for the product and [validation](validation.md) for measured status.

| Location | Responsibility |
|---|---|
| apps/web/app/page.tsx | Decision desk: intent, comparison, policy challenge, replay |
| apps/web/app/terminal | Original execution terminal; execution remains blocked |
| apps/web/components/ParityMap.tsx | Signed provider parity on a shared scale |
| apps/web/lib | Typed API, decision types, Python-compatible canonical SHA-256 |
| apps/web/e2e | Desktop judge flow and mobile overflow checks |
| services/api/equitymux/services/decisions.py | Snapshot capture, normalized shortlist, policy comparison, replay |
| services/api/equitymux/services/graph.py | Binance RWA discovery, enrichment, provenance |
| services/api/equitymux/services/pipeline.py | Existing execution state machine with fail-closed boundaries |
| services/api/equitymux/policy | Constitution compiler and deterministic execution checks |
| services/api/equitymux/providers | Binance data, Agentic Wallet CLI, BSC RPC, typed errors |
| services/api/equitymux/cli.py | CLI plan and offline replay |
| services/api/equitymux/mcp_server.py | Read-only MCP using the official Python SDK |
| services/api/equitymux/demo.py | Deterministic judge scenario |
| services/api/equitymux/api/main.py | REST, API fingerprint, configuration |
| services/api/tests | Unit, API, security and real MCP stdio round trip |
| services/keeper/agent | Standalone BNB Agent Studio scaffold |
| packages/contracts | Foundry receipt registry; no verified mainnet deployment |
| fixtures/rwa | Recorded sponsor responses, labeled RECORDED |
| dx | Historical raw developer experience evidence |
| docs/research/winner-dna.md | Award sources, comparison matrix and adoption decisions |

`pnpm demo` needs no network or wallet. CLI plans use recorded data by default;
`--live` explicitly fetches observations. `pnpm mcp` starts stdio tools.
`pnpm test:e2e` starts isolated API/web servers.

Decision receipts are downloadable, self-contained analysis artifacts, not stored
executions. Hash integrity and replay do not authenticate the issuer or prove a
trade. Keep Python and TypeScript canonical serialization aligned.
