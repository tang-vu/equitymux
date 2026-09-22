# Validation record — 2026-09-22

These results apply to the working tree for the decision-desk upgrade. No
mainnet transaction, registry deployment, paid settlement or public deployment
was performed during this validation.

| Check | Result |
|---|---|
| `uv sync --frozen` | PASS; Python 3.13 on Windows |
| `uv run pytest -q` | PASS; 107 tests, two upstream deprecation warnings |
| `uv run ruff check .` | PASS |
| `uv run ruff format --check .` | PASS; 50 Python files |
| `uv run mypy -p equitymux` | PASS; 33 source files; notes about untyped function bodies |
| Web Vitest | PASS; 12 tests across four files |
| Frozen pnpm install | PASS in an isolated WSL copy of the source; pnpm 11.24.0 |
| Web typecheck and ESLint | PASS in WSL |
| Next production build | PASS; Next 15.5.25, all 12 static pages generated |
| Web Prettier check | PASS; app, components, lib, E2E and test configs |
| Foundry | PASS; four tests including 256 fuzz runs in WSL |
| Deterministic demo | PASS; three NVDA representations, liquidity challenge stops, both receipts replay |
| CLI plan/replay | PASS; offline receipt integrity, decision and source-label consistency |
| MCP protocol | PASS; real official-SDK client/server stdio initialization, tools and round trips in pytest |
| REST | PASS; in-process FastAPI integration tests exercise decision, comparison and replay |
| Live public data | PASS; explicit LIVE NVDA CLI observation fetched three BSC representations |
| Standalone keeper | PASS; frozen install, TypeScript build and three delivery-boundary tests in WSL |
| Chromium E2E | PASS; production decision/challenge/replay/download workflow, browser-error guard, mobile layout and overflow checks |
| Compose configuration | PASS; `docker compose config --quiet` |
| API Docker image | PASS; `docker build -f Dockerfile.api -t equitymux-api:judge-local .` |
| Offline container demo | PASS; `docker run --rm --network none -e DEMO_MODE=true -e EXECUTION_ENABLED=false equitymux-api:judge-local python -m equitymux.demo` |
| Keeper HTTP integration | PASS; `tests/api-smoke.mjs` calls the real API and receives a recorded decision without execution |
| Local production preview | PASS; Windows HTTP request to `http://localhost:3017/api/health` identifies `equitymux-api`; proxied decision returns three routes and NOT_EXECUTED |
| Documentation links | PASS; local Markdown targets checked by `scripts/check-doc-links.py` |
| Source audit | No embedded-secret patterns flagged in 159 maintained source/config files; whitespace diff check passes |

Live observations are transient market data. They do not establish executable
liquidity, issuer backing, reference freshness or a completed trade. Generated
receipts are under ignored `data/judge-demo/`; they are analysis artifacts with
`NOT_EXECUTED` and a null transaction hash.

## Release gates

The native Windows pnpm package-copy step repeatedly stalled. Frozen dependency
installation, frontend production build and browser checks were completed in an
isolated WSL copy of the current source. Windows Vitest and Prettier also passed.
Native Windows installation is not certified by this record.

Container image verification is recorded separately from the successful native
production build; do not infer a deployed service from a Dockerfile.
The API image and its offline demo were tested. The web Docker image and the
full Compose stack were not rebuilt in this run; the web standalone artifact
was built and exercised by Chromium instead.

The E2E suite builds and boots the production standalone server. Initial dev-server
tests exposed hot-reload JavaScript failures; the production browser run passed.
This is not a claim that every development-server race was fixed.

The local preview runs from the validated WSL frontend source snapshot at
`/tmp/equitymux-design-20260922`, with web port 3017 and the existing API on port 8017. It is
temporary and not a public judging deployment. Current repository edits require
a new build to appear there.

Mainnet execution is BLOCKED by missing bound swap simulation, authenticated
approval, authoritative freshness evidence and post-trade verification. Reproduce
with `pnpm demo` or the execution terminal: unknown execution evidence prevents
progress. Do not enable the kill switch merely to bypass these checks.

Public deployment, Agent Studio hosted settlement and a live trade require real
infrastructure and credentials. The DX report needs the builder's genuine
experience; this record does not replace it.

## Exposure desk design update (2026-09-22)

The frontend was rebuilt as an editorial research workspace with self-hosted,
OFL-licensed fonts, an expandable issuer ledger, responsive parity visualization,
policy memo and downloadable evidence record. See [design rationale](design.md).

Validation: 12 frontend unit tests, ESLint, Prettier, TypeScript and the Next.js
production build pass. Five Chromium E2E tests exercise initial recorded data,
keyboard and skip-link access, all seven secondary workspace pages, a custom
policy baseline, the complete challenge/replay/download journey and mobile
overflow. Each test asserts no uncaught browser errors. Desktop and mobile
screenshots were regenerated and visually inspected. The tests use isolated
API/web ports 8021/3021, so they do not interrupt the existing preview.

No execution capability, live liquidity claim or public deployment was added by
this design update. The earlier backend/contract/keeper validation remains
separate from this frontend-specific check.
