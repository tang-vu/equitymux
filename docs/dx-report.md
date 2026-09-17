# Developer Experience Report — EquityMux

Every entry below was recorded at the moment it happened
(`dx/evidence/issues.jsonl`, `dx/raw/api-events.jsonl`). Reproduce with
`pnpm dx:summary`. Nothing here is retrospective or embellished.

## Issue 1 — `web3.binance.com` dev-docs unreachable for agents

- **Expected:** `llms.txt` fetchable by curl for LLM tooling.
- **Observed:** AWS WAF challenge (`x-amzn-waf-action: challenge`),
  `content-length: 0`. Machine-readable docs unreachable for non-browser
  clients.
- **Workaround:** `github.com/binance/binance-skills-hub` skill markdown —
  verified accurate against live responses.
- **Suggested fix:** exempt `/llms*.txt` from the WAF challenge or mirror to
  `developers.binance.com` (which is fetchable).

## Issue 2 — `rwa/dynamic` v2: `stockInfo.price` null for bStock

- **Expected:** `stockInfo.price` populated for all provider types.
- **Observed:** `NVDAB` (type=3) returns `stockInfo.price=null` during a
  REGULAR session while Ondo/xStocks return a price.
- **Impact:** premium-over-reference can't be computed for bStock from that
  endpoint alone.
- **Workaround:** peer same-ticker reference or kline close as reference
  proxy, flagged by source. Fail closed when no reference exists.

## Issue 3 — `market/token/dynamic/info` latency

- **Expected:** ~200 ms like other public endpoints.
- **Observed:** 4.4 s and 10.6 s responses on BSC RWA contracts.
- **Impact:** dominates route-tournament latency.
- **Workaround:** enrichment runs concurrently and is best-effort; the policy
  engine degrades to explicit `SKIP`/`UNVERIFIABLE` rather than blocking.

## Issue 4 — token-audit requires undocumented request shape

- **Expected:** GET with query params like sibling endpoints.
- **Observed:** HTTP 400. Actual contract is `POST` with JSON body
  `{binanceChainId, contractAddress, requestId}` where `requestId` must be
  UUID v4.
- **Fix applied:** corrected in `providers/audit.py`; now returns
  `hasResult`/`isSupported`/risk items.

## Issue 5 — `baw` order submission is not execution

- **Observed:** `market-order swap` returns `success:true` + `orderId`
  immediately; the order is only done after polling `market-order list` to
  `FINISHED`/`FAILED`.
- **Design consequence:** the pipeline's `_execute` polls to terminal state;
  a receipt never reports success at orderId.

## Issue 6 — dev proxy silently targets the wrong backend

- **Expected:** `next dev` proxies `/api/*` to the EquityMux API.
- **Observed:** when the API moved to `:8001` (`:8000` was held by an
  unrelated uvicorn), the already-running dev server kept proxying to
  `:8000` — every page rendered `loading…` forever with no visible error.
- **Workaround:** restart with `EQUITYMUX_API=http://localhost:8001`.
- **Fix applied:** `/api/health` returns `service=equitymux-api`; the dev
  page shows a red proxy warning when the fingerprint mismatches.

## Issue 7 — latent `TypeError` on the zero-representations path

- **Observed:** mypy 2.3.1 caught a missing positional arg in
  `pipeline.py`'s `_receipt` call — a runtime crash masked until typecheck.
- **Fix applied:** args aligned; `mypy -p equitymux` is now a CI gate.

## Issue 8 — `REPO_ROOT` breaks in shallow container layouts

- **Observed:** `config.py` derives `REPO_ROOT = parents[3]` — an
  `IndexError` when the package is copied to `/app/equitymux` inside a
  naive Dockerfile.
- **Fix applied:** `Dockerfile.api` preserves the `services/api/equitymux`
  depth under `/repo`, and `REPO_ROOT` is now env-overridable via
  `EQUITYMUX_REPO_ROOT` for non-standard layouts.

## Issue 9 — `stockInfo.price` gap can outlive peer fallback

- **Observed:** the bStock `stockInfo.price=null` gap (Issue 2) leaves a
  representation with no reference when no same-ticker peer exists on
  another platform — the rep then fails `require_reference_price` closed
  even though the token itself trades.
- **Fix applied:** last-resort `token/kline` 1d close reference with
  provenance `kline:close`. Weaker than an equity reference (token price,
  not stock price) so it ranks below `stockInfo` and `peer:*` sources;
  the source label is carried into the receipt so consumers can weight it.

## What went well

- Public RWA endpoints are genuinely keyless and fast; three provider types
  cover the same underlyings on BSC.
- `baw` CLI JSON output is clean and composable.
- `bag` CLI scaffolds the Studio agent surface quickly.
