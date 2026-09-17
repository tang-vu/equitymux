# Hackathon Constraints — BNB Hack: Tokenized Stocks Edition

Source: https://www.bnbchain.org/en/hackathons/tokenized-stocks (verified 2026-09-17)

- Event: BNB Hack: Tokenized Stocks Edition, online, $20,000 prizes, sponsored by Binance Web3 Wallet
- Submission window: Sep 16 – Oct 11, 2026 (~23 days left at research time)

## Hard product requirements (treated as spec)

- BNB Smart Chain, chainId 56, **mainnet**, spot only (no perps / no leveraged derivatives)
- At least one of bStocks / Ondo / xStocks central to the product — we support all three
- Binance Web3 API integration must be substantive
- Public repo, reproducible judge instructions, deployed app or exact deploy steps
- Demo <= 4 minutes; small real mainnet tx as proof
- Working product over slides

## Scoring priorities

1. Technical implementation
2. Creativity / originality
3. Developer Experience Report
4. Product quality & UX

## Special prizes

- Best Use of Agentic Wallet / Wallet Skills
- Best Use of BNB Agent Studio

## Verified facts (2026-09-17, live)

- RWA stock list API is PUBLIC (no key): `GET https://www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai?type=N`
  - type=1 Ondo (1366 entries, 458 on BSC), type=2 xStocks (267, 128 BSC), type=3 bStock (77, all BSC)
  - Fields: chainId, contractAddress, symbol, ticker, type, assetType, multiplier, d (decimals), cs (CEX pair for bStock), lastUpdateTime
- Market status API returns `openState`, `marketStatus` (regular/premarket/postmarket/overnight/closed/pause), reasonCode, nextOpen/nextClose (incl. `offhours` object)
- NVDA exists on BSC under ALL THREE platforms:
  - Ondo `NVDAon` 0xa9ee28c80f960b889dfbd1902055218cba016f75 (mult 1.0017152487959898)
  - xStocks `NVDAx` 0xc845b2894dbddd03858fd2d643b4ef725fe0849d (mult 1)
  - bStock `NVDAB` 0x02fca66c1d1afb4e2a7884261eb00f63598a7436 (mult 1.000778223752807865, cs=NVDABUSDT)
- Agentic Wallet = `baw` CLI (`npm i -g @binance/agentic-wallet`, v1.10.0 verified installed). QR pairing sign-in via Binance App. BSC supported.
- `baw market-order quote|swap` = quote + execution path (submits orderId; poll `market-order list` to terminal FINISHED/FAILED)
- `baw wallet settings` exposes dailyLimit, abnormalTxnHandling, devMode, x402 quota (read-only; set in Binance App)
- BNB Agent Studio = `bag` CLI (`npm i -g @bnbagent/studio-cli`); TypeScript seller agents; ERC-8004 identity, ERC-8183 commerce, x402 payments; deploy providers `bnb` (48h testnet trial), `aws`, `azure`
- Agent Studio managed `bnb` trial is TESTNET only — do not present it as mainnet
- x402 v2 headers: challenge `payment-required`, request `PAYMENT-SIGNATURE`, settlement `payment-response`
