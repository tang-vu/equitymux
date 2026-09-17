# Deployment Guide

## Local (development / judging)

```bash
pnpm install
pnpm dev:api          # FastAPI on :8000 (uv run uvicorn)
pnpm dev:web          # Next.js on :3000, /api/* → :8000
```

Copy `.env.example` → `.env`. Defaults are safe: `EXECUTION_ENABLED=false`.

## Backend hosting

The API is a plain ASGI app (`equitymux.api.main:app`). Deploy to any
Python host (Railway, Fly, a VPS):

```bash
cd services/api
uv sync
uv run uvicorn equitymux.api.main:app --host 0.0.0.0 --port 8000
```

State is a local SQLite DB (`data/equitymux.db`) — receipts, constitutions,
keeper tasks. Mount a volume for persistence.

**Agentic Wallet caveat:** `baw` CLI must be installed and authenticated on
the host for execution paths. Read paths (explore/routes/receipts) work
without it. Do not enable `EXECUTION_ENABLED` on a shared host.

## Frontend hosting

`apps/web` is a standard Next.js app. On Vercel:

- root directory: `apps/web`
- env: `EQUITYMUX_API=https://<your-api-host>` (server-side rewrite target;
  never exposed to the browser beyond the /api path)

`pnpm build` is green as of this commit (all routes static-prerendered;
data fetched client-side through the rewrite).

## Contracts

```bash
cd packages/contracts
forge install foundry-rs/forge-std
forge test
DEPLOYER_PRIVATE_KEY=... forge script script/Deploy.s.sol \
  --rpc-url $BSC_RPC --broadcast --verify
```

The registry holds no funds; committing receipts is optional evidence.

## Keeper (BNB Agent Studio)

```bash
cd services/keeper
bag init equitymux-keeper   # or use studio.toml directly
bag erc8004 register --endpoint <public-url>
bag deploy --provider aws
```

Managed `bnb` provider = 48h testnet trial only. See `services/keeper/README.md`.

## Verification after deploy

```bash
pnpm verify:live      # read-only; should print PASS for all checks
                    # (wallet check shows BLOCKED until a host wallet auths)
```
