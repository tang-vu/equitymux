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

## What went well

- Public RWA endpoints are genuinely keyless and fast; three provider types
  cover the same underlyings on BSC.
- `baw` CLI JSON output is clean and composable.
- `bag` CLI scaffolds the Studio agent surface quickly.
