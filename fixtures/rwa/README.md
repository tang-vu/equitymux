# fixtures/rwa — recorded Binance public RWA API responses

These JSON files are **RECORDED** responses from the public Binance RWA
endpoints (`www.binance.com/bapi/defi/.../rwa/*` and
`web3.binance.com/bapi/defi/...`). They power:

- `DEMO_MODE=true` — the API serves these files so the whole UI runs offline
  (every response and receipt is labeled `RECORDED`, never presented as live)
- the backend test suite — hermetic, deterministic, no network

## Contents

- `stock-list-type{1,2,3}.json` — representation lists (Ondo / xStocks / bStock)
- `meta-*`, `asset-status-*`, `dynamic-*` — per-contract issuer, trading
  status, and pricing records for NVDA, TSLA, AAPL
- `kline-*` — 1d candle closes used by the last-resort reference fallback
- `market-status.json` — underlying equity-market session state
- `token-dynamic-*`, `audit-*` — on-chain volume and security-audit records
- `token-search-*` — symbol-search sanity records

## Refreshing

```bash
python3 scripts/fetch-fixtures.py
```

Re-records every file against the live public endpoints and appends DX
events to `dx/raw/api-events.jsonl`. Filenames embed the contract address;
the fetcher covers the tickers used by demo quick-prompts.
