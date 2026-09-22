# Winner DNA — evidence and adoption decisions

Research date: 2026-09-22. Awards below come from organizer announcements or
official submission pages. Technical descriptions are project claims, not an
independent security audit. “Judge appeal” is our inference; no private judge
comments or causal claims about why a project won are implied. No source code
was copied. Current repositories can contain work added after the competition.

| Project / event / award | Core idea and visible strength | Technical / agent / sponsor integration | Trust and demo lesson; inferred judge appeal | EquityMux decision |
|---|---|---|---|---|
| [Router402](https://ethglobal.com/showcase/router402-b717q), HackMoney 2026 finalist; LI.FI Best AI × LI.FI Smart App | Familiar chat hides payment complexity; one API across models | x402, Flashblocks, LI.FI MCP returns unsigned typed transactions; SDK and web client | Concrete end-to-end task; signing remains with the user | Adopt narrow analysis tools and one shared decision service. Defer paid calls until useful demand and settlement exist |
| [Synapze](https://ethglobal.com/showcase/synapze-vijh5), Agentic Ethereum 2025 finalist; Coinbase/EigenLayer pool prizes | Templates and one-click agent hosting with visible progress | Eliza, AgentKit, EigenLayer; environment-managed credentials | Users can see where deployment is, rather than trust a spinner | Adopt ready-to-run scenarios and explicit stage outcomes. Do not build an agent hosting platform |
| [Shaman](https://ethglobal.com/showcase/shaman-hyeav), Agentic Ethereum 2025 finalist | Onchain workflow automation | MUD, sandboxed Deno workers, IPFS, Privy | Inspectable execution and monitoring make autonomy concrete | Adopt deterministic replay. Reject arbitrary generated-code execution in a financial router |
| [MCPay](https://github.com/microchipgnu/mcpay), Cypherpunk 2025 stablecoin first prize | A reusable payment boundary for MCP tools | Registry, proxy, SDK, x402 verification and retry | Agent interoperability is itself a usable product | Adopt discoverable tools over existing services. Defer monetization; a 402 challenge is not settlement |
| [Seer](https://colosseum.com/arena/projects/seer), Cypherpunk 2025 infrastructure first prize | Solana transaction debugging | Organizer verifies category and purpose; current landing gives little technical evidence | Explaining a failure is useful developer infrastructure | Adopt explicit blockers and reproducible input bundles. No unverified claims about Seer's internals |
| Autonom, Cypherpunk 2025 RWA first prize | Specialized RWA oracle | Organizer verifies RWA oracle purpose; detailed submission fetch unavailable | RWA products need evidence about the underlying asset | Adopt reference provenance and unknown-data handling. Do not claim to verify legal backing from a report URL |
| Capitola, Cypherpunk 2025 consumer first prize | Prediction-market meta-aggregation | Organizer verifies aggregation thesis; internals not independently inspected | Fragmentation becomes a single user task | Adopt normalized exposure comparison. Reject prediction markets and cross-chain scope |
| BIBIM, BNB Hack July 21 2025 Prize 3 winner | Visual creation and testing of DeFi strategies | BNB organizer describes AI strategy tooling; source repository not located confidently | Users can inspect and test a strategy before relying on it | Adopt policy changes against a frozen snapshot. Reject a general visual strategy builder |
| DeFi Copilot, same BNB batch, Prize 3 winner | Analysis and one-click PancakeSwap workflow | BNB-native execution and automated management per organizer | A continuous task is more legible than disconnected modules | Adopt one intent-to-evidence screen. Keep explicit execution boundaries |
| [Keryx](https://github.com/tang-vu/keryx), Lepton × Arc first place (user-provided placement; organizer post not independently retrieved) | Research decisions lead to citation payments and portable receipts | Arc, x402, evidence ledger, MCP; deterministic spending limits | One short loop exposes decisions and proof | Adopt portable decision bundles and independent verification. Reject citation economics and research-agent scope |

Award sources: [BNB July batch](https://www.bnbchain.org/en/blog/congratulations-to-the-latest-bnb-hack-winners-july-21-batch),
[Cypherpunk organizer results](https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/).
Also reviewed the [BNB AI Trading Agent 2026 winners](https://www.bnbchain.org/en/blog/meet-the-winners-of-bnb-hack-ai-trading-agent-edition).
That announcement establishes awards but insufficient implementation evidence
to attribute specific design mechanisms to Neural Alpha or Guarded Alpha.

## Recurring patterns and product choice

The useful intersection is a small complete workflow, visible boundaries,
reusable interfaces, and inspectable outcomes. EquityMux's core story is:
**Buy the exposure. Understand the route. Keep the evidence.**

The memorable moment is changing a parity or issuer policy against the *same*
market snapshot and watching the shortlist change, then independently replaying
the decision from a downloaded receipt. This demonstrates causal policy behavior
without pretending a recorded price is an executable quote.

## Baseline repository assessment

Preserve: Decimal normalization, provider adapters, portfolio constitution,
canonical receipt hashing with browser parity, recorded fixtures, explicit kill
switch, Foundry notary, BNB keeper boundary, and existing terminal/explorer.

Fix: liquidity scoring used market cap; quote/balance probes were labeled swap
simulation; intent constraints were parsed but not enforced; missing reference
timestamps could appear freshly observed; a token candle could stand in for an
independent stock reference; some configured concentration/daily rules were not
evaluated. Public confirmation was also not authentication.

Product gaps: wallet setup before first useful result, missing comparison
explanation, no immutable what-if comparison, no CLI/MCP analysis path, and docs
claiming more execution verification than implemented. These are higher value
than adding strategies, new chains, or payment monetization.

## Hackathon fit

[Official rules](https://www.bnbchain.org/en/hackathons/tokenized-stocks) require
working Binance Web3 integration, central bStocks/Ondo/xStocks exposure and BSC
spot scope. Mainnet proof remains a release gate requiring an authorized funded
wallet and a genuinely bound simulation/execution adapter. Offline replay is
useful judging evidence, not a replacement for that proof.

Agentic Wallet and Agent Studio specials reward meaningful depth. Existing
adapters remain, but scaffold, local tasks, registration, hosted runtime and
settled payments must be reported separately. DX evidence is collected as actual
events; the participant must write their own DX report, as the rules reject
AI-generated reports. This document is product research, not the DX report.
