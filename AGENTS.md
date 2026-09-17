# AGENTS.md — EquityMux

Intent + execution router for tokenized stocks on BSC. Read `README.md`
first; `docs/codebase-summary.md` has the map.

## Commands

```bash
pnpm install                       # workspace (web)
cd services/api && uv sync         # backend (dev group installs by default)
pnpm dev:api                       # uvicorn :8000 (use --port 8001 if 8000 busy)
pnpm dev:web                       # next dev :3000 — proxies /api/* via EQUITYMUX_API
pnpm test:api / test:web / test:contracts
./scripts/ci-local.sh              # full pipeline; --skip-contracts if no forge
docker compose up --build          # containerized demo
```

## Hard rules

- `EXECUTION_ENABLED=false` stays the default. Never enable mainnet
  execution without explicit user authorization.
- The LLM interprets; the deterministic engine decides. Final transaction
  authority is never in model code paths.
- No private keys in the repo or the browser. Throwaway keys only for
  testnet; never commit them.
- Fixtures are labeled `RECORDED`; blocked integrations are labeled
  `BLOCKED` with reproduction steps. Never fabricate tx hashes, signatures,
  deployments, receipts, or payment settlement.
- Receipt hash = sha256 of canonical JSON
  (`json.dumps(sort_keys, separators=(",",":"), ensure_ascii)`); TS parity
  in `apps/web/lib/canonical.ts` — keep both sides in lockstep.

## Gotchas learned the hard way

- `REPO_ROOT = config.py parents[3]` — package must sit at
  `<root>/services/api/equitymux` (Docker preserves this layout).
- Dev proxy: `next dev` reads `EQUITYMUX_API` at start; restart it if the
  API port changes. `/api/health` returns `service=equitymux-api` —
  fingerprint-check before trusting proxied data.
- `services/keeper/agent` is a standalone package (`pnpm install
  --ignore-workspace`), not a workspace member.
- `packages/contracts/lib/forge-std` is a git submodule — clone with
  `--recurse-submodules`.
- `baw`/`bag` CLIs and Foundry live at `/root/.local/bin` and
  `/root/.foundry/bin` in the dev WSL; the API test server may run on
  `:8001` when `:8000` is occupied by another project.
- WSL git identity is `0xacee`; pushes to `tang-vu/equitymux` go through
  Windows (`powershell.exe -c "cd D:\Github\equitymux; git push"`).

## Layout

`apps/web` (Next.js 15, Tailwind v4, vitest) · `services/api` (FastAPI,
pytest/ruff/mypy) · `services/keeper` (BNB Agent Studio `bag` scaffold) ·
`packages/contracts` (Foundry receipt registry) · `fixtures/rwa` (recorded
API responses) · `dx/` (recorded DX evidence) · `docs/demo` (screenshots).
