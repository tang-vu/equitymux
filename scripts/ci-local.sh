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

step "web: tests (vitest)"
pnpm --filter @equitymux/web test

step "web: production build"
pnpm --filter @equitymux/web build

step "api: ruff"
(cd services/api && uv run ruff check .)

step "api: mypy"
(cd services/api && uv run mypy equitymux)

step "api: pytest"
(cd services/api && uv run pytest -q)

if [ "${1:-}" != "--skip-contracts" ]; then
  step "contracts: forge test"
  (cd packages/contracts && forge test)
fi

step "ALL CHECKS PASSED"
