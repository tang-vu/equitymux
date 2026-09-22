# Integration Matrix — EquityMux

## 2026-09-22 correction

The table below is a historical 2026-09-17 integration record, not a current
deployment claim. The decision desk adds recorded/live analysis, policy
counterfactuals and replay via REST/CLI/MCP. See `docs/validation.md` for reruns.
A quote plus balance probe is not swap simulation; that pipeline now stops
explicitly. Source timestamps are unknown, token candles cannot satisfy an
independent equity-reference policy, and market cap is not liquidity. Wallet
execution, hosted Agent Studio identity and payment settlement remain BLOCKED.

Verified: 2026-09-17 (updated post-hardening). Evidence: `dx/raw/api-events.jsonl`, `fixtures/rwa/`, `docs/demo/*.png`.

| Component | Docs location | Purpose in EquityMux | Auth model | Endpoints / tools | Chains | Runtime status | What we use | Known limitations | Fallback | Date verified |
|---|---|---|---|---|---|---|---|---|---|---|
| RWA stock list | binance-skills-hub `binance-tokenized-securities-info` + `binance-agentic-wallet` SKILL.md | Representation discovery (Canonical Equity Graph) | None (public) | `GET www.binance.com/bapi/defi/v1/public/.../rwa/stock/detail/list/ai?type={1,2,3}` | 1, 56, CT_501 | VERIFIED live | All 3 types; ticker→contract map | Docs page (web3.binance.com dev-docs) is AWS-WAF challenged for CLI fetch; skill markdown is authoritative | Recorded fixtures | 2026-09-17 |
| RWA meta | same | Issuer evidence, attestation links, company info, decimals | None | `GET .../rwa/meta/ai?chainId&contractAddress` | 1, 56 | VERIFIED | companyInfo, attestation report paths (bin.bnbstatic.com host) | xStocks/bStock meta may be sparser than Ondo | n/a | 2026-09-17 |
| RWA market status | same | Underlying market open/closed, next open/close | None | `GET .../rwa/market/status/ai` | — | VERIFIED (`regular` session observed, `offhours` sub-object) | Market Closed Mode | Fields are state-dependent | n/a | 2026-09-17 |
| RWA asset market status | same | Per-asset trading status, corporate actions | None | `GET .../rwa/asset/market/status/ai` | 1, 56 | VERIFIED | reasonCode TRADING/MARKET_CLOSED/ASSET_PAUSED/ASSET_LIMITED… | — | n/a | 2026-09-17 |
| RWA dynamic v2 | same | On-chain token price, sharesMultiplier, holders, supply, US fundamentals, order limits | None | `GET .../v2/.../rwa/dynamic/ai` | 1, 56 | VERIFIED | tokenInfo.price, sharesMultiplier, stockInfo.*, limitInfo | `tokenInfo.volume24h` is the *stock's* USD volume, NOT on-chain volume (docs note) | n/a | 2026-09-17 |
| Token K-line | same | Recent price history for representation | None | `GET .../dex/market/token/kline/ai` | 1, 56 | VERIFIED | 1d candles | — | n/a | 2026-09-17 |
| Token dynamic info | `query-token-info` skill | On-chain volume24hBuy/Sell, liquidity-ish fields | None | `GET web3.binance.com/bapi/defi/v4/public/.../market/token/dynamic/info/ai` | 1, 56 | VERIFIED (high latency observed: 4.4–10.6s) | on-chain trade volume | Slow endpoint | degrade to RWA-only | 2026-09-17 |
| Token search | `query-token-info` | Sanity-check symbol search | None | `GET web3.binance.com/bapi/defi/v5/public/.../market/token/search/ai` | many | VERIFIED | optional enrichment | — | skip | 2026-09-17 |
| Token audit | `query-token-audit` | Contract security audit per candidate | None | `POST web3.binance.com/bapi/defi/v1/public/wallet-direct/security/token/audit` (binanceChainId, contractAddress, requestId) | 1, 56, 8453, CT_501 | VERIFIED — corrected POST returns 200; NVDAon reports `hasResult:false, isSupported:false` (audit unsupported → engine fails closed) | Risk items pre-execution | requires UUID requestId; hasResult/isSupported gating | explicit "audit unavailable" state | 2026-09-17 |
| Binance Agentic Wallet (`baw` CLI) | developers.binance.com/products/agentic-wallet/* + skills-hub | Authorization boundary + execution: quote, swap, balances, limits, x402 | QR pairing via Binance App; MPC keyless | `baw auth signin/verify/signout`, `wallet status/address/balance/settings/tx-history/tx-lock/chains/gas-price`, `market-order quote/swap/list`, `x402-payment preview/sign`, `approvals list/revoke`, `contract-call preview/execute` | 56, 1, 8453, CT_501 (+more) | CLI v1.10.0 INSTALLED; wallet UNCONNECTED (needs human QR) | Layer-4 wallet policy + execution | Requires human QR sign-in; orders are async (poll to terminal) | `verify:live` reports BLOCKED | 2026-09-17 |
| Read-only Wallet Skills (tokenized-securities-info etc.) | skills-hub repo | Cross-check direct REST integration | None | SKILL.md-defined public calls | 1, 56 | VERIFIED (same endpoints) | DX comparison evidence | skill wraps same endpoints; older versions only type=1 | direct calls | 2026-09-17 |
| BNB Agent Studio (`bag`) | docs.bnbchain.org/developer-kit/bnbchain-studio/* | EquityMux Keeper: bounded monitoring agent, ERC-8004 identity, ERC-8183 service, x402 | local keystore (evm-local) / twak | `bag init/wallet/dev/erc8004/erc8183/x402/deploy/doctor/audit` | BSC testnet trial; mainnet via aws/azure providers | INSTALLED v0.0.13; canonical scaffold vendored at `services/keeper/agent` — `bag doctor` all-PASS (network reachable bsc-mainnet); `tsc` build clean; keeper runtime live in services/api (`POST /api/agent/tasks`); ERC-8004 registration pending deploy target | Keeper service + agent identity surface | Managed `bnb` provider is testnet-only 48h trial; mainnet deploy needs AWS/Azure creds | local keeper runtime | 2026-09-17 |
| x402 / b402 | developers.binance.com/products/onchainpay-x402/* + baw x402-payment | Agent-paid services; optionally charge for EVALUATE_EQUITY_INTENT | wallet signature (EIP-3009 U/USD1; Permit2 USDC/USDT) | `baw x402-payment preview/sign`; `POST /api/agent/tasks/paid` challenge surface (402 + `accepts` when `X402_PAYTO_ADDRESS` set; 501 honest-not-configured otherwise) | 56 | CHALLENGE-SURFACE IMPLEMENTED; settlement verification intentionally not claimed until a real facilitator is wired | honest plumbing, no invented paid deps | short-lived signatures (~30s) | disabled when wallet unconnected | 2026-09-17 |
| BSC public RPC | docs.bnbchain.org | eth_call simulation fallback + tx receipt verification | None | `https://bsc-dataseed.binance.org` (+ public nodes) | 56 | VERIFIED live (chainId=56, blockNumber, balanceOf probes pass in `/api/health` + `verify:live`) | simulation evidence, tx receipt | public rate limits | multiple endpoints | 2026-09-17 |
| Binance signed Web3 API | web3.binance.com/en/dev-docs (WAF-blocked to curl) | NOT used: the hackathon Web3 surface is the public bapi + baw wallet layer | n/a | n/a | n/a | BLOCKED-FETCH (docs only) | n/a | dev-docs unreachable programmatically; skill repo used as authoritative spec | n/a | 2026-09-17 |

## Deliberately NOT used

- Binance `products/stocks/*` APIs — centralized stock trading, not BSC tokenized equities. Out of scope per hackathon rules.
- Perps/leverage APIs — prohibited by hackathon scope.
- PancakeSwap direct router — execution goes through the Agentic Wallet boundary (`baw market-order`), which aggregates DEX routes and enforces wallet policy. A raw-router fallback would bypass Layer-4 controls, so it is intentionally absent.
