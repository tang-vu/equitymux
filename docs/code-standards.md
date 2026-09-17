# Code Standards

## Python (services/api)

- Python 3.12+ syntax, `from __future__ import annotations`.
- Money and prices: `decimal.Decimal` — never `float`.
- Time: timezone-aware UTC `datetime`, ISO-8601 on the wire.
- Every provider failure becomes `ProviderError` (typed) — the API layer maps
  to 502; policy paths convert to explicit FAIL/SKIP, never silent pass.
- Modules stay under ~200 lines; split by concern (providers / domain /
  policy / services / api).
- Tests: pytest, fixtures from `fixtures/rwa` — offline, deterministic.

## TypeScript (apps/web)

- App Router, server components by default; `"use client"` only where needed.
- API access only through `lib/api.ts` — no raw `fetch` in components.
- Types mirror backend JSON exactly (`snake_case` payload fields preserved).
- Tailwind v4 tokens in `globals.css` (`--color-*`), no ad-hoc hex in
  components.

## Solidity (packages/contracts)

- solc 0.8.24, custom errors, events for evidence.
- No custody logic — the registry is a notary. Reject any PR adding value
  transfer to it.

## Security rules (non-negotiable)

- No secrets/keys/mnemonics in the repo. `.env` is gitignored; CI greps for
  key material.
- Token symbols/metadata are untrusted input — never executed, never used as
  dict keys for authority decisions.
- The LLM/policy compiler never produces calldata. Execution payload shape is
  owned by the `baw` boundary + fixed adapters.
- Unknown/security-unsupported tokens fail closed.
- New endpoints that move funds must go through `Pipeline.run`, which enforces
  simulation freshness, kill switch, and confirmation.
