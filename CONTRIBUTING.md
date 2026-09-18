# Contributing

Thanks for your interest. EquityMux is a hackathon submission kept public and
reproducible — contributions are welcome after the judging period.

## Setup

Requirements: Node ≥22, pnpm ≥11, Python ≥3.12 (`uv`), Foundry.

```bash
pnpm install
cd services/api && uv sync
cd packages/contracts && forge build
```

Run the whole thing:

```bash
pnpm dev:api   # API on :8000
pnpm dev:web   # UI on :3000 (set EQUITYMUX_API to the API URL)
```

Or offline against recorded fixtures:

```bash
cd services/api && DEMO_MODE=true uv run uvicorn equitymux.api.main:app --port 8000
```

## Before opening a PR

```bash
./scripts/ci-local.sh   # runs the same checks as CI
```

Equivalent to: `pnpm test:api`, `pnpm test:web`, `pnpm test:contracts`,
`pnpm lint`, `pnpm typecheck`.

## Rules that matter

- Never weaken a safety default (`EXECUTION_ENABLED`, ceilings, simulation or
  confirmation requirements). PRs doing so are rejected outright.
- The LLM never gets transaction authority. Authorization stays deterministic.
- Fixtures are `RECORDED` data — never present them as live.
- Money math uses `Decimal`, never float.
- See `AGENTS.md` for operational details and `docs/code-standards.md` for style.

## Reporting security issues

See `SECURITY.md` — do not open public issues for vulnerabilities.
