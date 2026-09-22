#!/usr/bin/env bash
# ci-local.sh — run every check CI runs, locally, in order.
# Usage: ./scripts/ci-local.sh [--skip-contracts]
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

step "pnpm install (frozen)"
pnpm install --frozen-lockfile

step "web: typecheck"
pnpm --filter @equitymux/web typecheck

step "web: lint (eslint)"
pnpm --filter @equitymux/web lint
pnpm --filter @equitymux/web format:check

step "web: tests (vitest)"
pnpm --filter @equitymux/web test

step "api: ruff"
(cd services/api && uv run ruff check .)
(cd services/api && uv run ruff format --check .)

step "api: mypy"
(cd services/api && uv run mypy -p equitymux)

step "api: pytest"
(cd services/api && uv run pytest -q)

step "judge demo and MCP (MCP round trip is included in pytest)"
pnpm demo

step "production build and browser E2E"
pnpm --filter @equitymux/web exec playwright install chromium
pnpm test:e2e

if [ "${1:-}" != "--skip-contracts" ]; then
  step "contracts: forge test"
  # foundryup installs to ~/.foundry/bin which isn't always on PATH
  command -v forge >/dev/null || export PATH="$HOME/.foundry/bin:$PATH"
  (cd packages/contracts && forge test)
fi

step "keeper: standalone install, build and delivery tests"
(cd services/keeper/agent && pnpm install --frozen-lockfile && pnpm test)

step "documentation links"
python3 scripts/check-doc-links.py

step "ALL CHECKS PASSED"
