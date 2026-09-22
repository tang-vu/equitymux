# EquityMux — submission preparation

**Buy the exposure. Understand the route. Keep the evidence.**

EquityMux compares BSC tokenized equity representations across Ondo, xStocks
and bStocks, normalizes prices by share multiplier and applies explicit risk
policies. A user or agent can challenge the same snapshot under a stricter
policy and independently replay the exported decision.

## Demonstrable differentiation

- Exposure, rather than issuer token symbol, is the primary input.
- Unknown executable depth cannot pass a positive minimum-liquidity policy.
- Premium and absolute parity limits treat both expensive wrappers and extreme
  discounts as conditions worth inspecting.
- Complete decision receipts include inputs and deterministic outputs, not just
  a summary hash. A rehashed, altered decision still fails semantic replay.
- UI, CLI, REST and MCP share one analysis service. No MCP tool can sign.

## Evidence and limits

Use [validation](validation.md) for actual run results and [demo script](demo-script.md)
for the three-minute presentation. The sample data is RECORDED. The live option
uses Binance public APIs; it does not certify underlying timestamp freshness.

Mainnet execution is BLOCKED: the current Agentic Wallet quote does not bind
the later swap transaction. A quote or balance probe must not be presented as
transaction simulation. There is no demonstrated resulting position or mainnet
trade in this upgrade. Before submission, complete that integration with a
funded authenticated wallet and an explicitly authorized small trade.

The notary has tested commitment behavior, not a verified deployment here.
Agent Studio has a scaffold and domain hook; registration, hosted runtime and
paid delivery require their own evidence. x402 challenge handling is not payment
settlement. Only claim prize integrations actually demonstrated.

## Developer experience report

The participant must write the report from their actual experience. Existing
`dx/` recordings are supporting artifacts, not permission to invent experiences
or submit AI-generated narrative. Winner research in `docs/research/winner-dna.md`
is separate product research, not the required DX report.
