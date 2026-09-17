# EquityMux Keeper

Bounded maintenance agent for EquityMux, built for BNB Agent Studio
(`bag` CLI, `@bnbagent/studio-cli`).

## Role

Monitor explicitly authorized portfolio policies and propose or execute
*bounded* maintenance tasks. The keeper has **no signing capability** outside
the Agentic Wallet boundary — analysis tasks return signed evaluation bundles;
anything that moves funds requires the user's interactive confirmation through
the normal pipeline.

## Task surface (ERC-8183-style)

| Task | Input | Output | Authority |
|---|---|---|---|
| `EVALUATE_EQUITY_INTENT` | `{ticker, notional, constitutionHash?}` | route evaluation bundle | analysis only |
| `REFRESH_REPRESENTATION_GRAPH` | `{ticker}` | normalized representations | read-only |
| `CHECK_CONSTITUTION_COMPLIANCE` | `{exposures, totalValueUsd}` | violations[] | read-only |
| `PREPARE_REBALANCE` | `{targetAllocations}` | plan + receipt DRAFT | never self-executes |

## Run locally

```bash
# keeper logic lives in services/api/equitymux/services/keeper.py and is
# exercised via POST /api/agent/tasks
pnpm dev:api
curl -s localhost:8000/api/agent/tasks -H 'content-type: application/json' \
  -d '{"kind":"EVALUATE_EQUITY_INTENT","input":{"ticker":"NVDA","notional":"10"}}'
```

## BNB Agent Studio deployment

```bash
bag init equitymux-keeper --protocols A2A,MCP,X402   # scaffold seller agent
bag wallet new                                      # throwaway wallet for testnet
bag erc8004 register --endpoint <url>               # on-chain identity
bag deploy prepare && bag deploy --provider aws     # mainnet-capable provider
```

The managed `bnb` provider is a **48h testnet trial** — never presented as
mainnet. `studio.toml` in this directory captures the intended production
shape; the same keeper logic is served by `services/api` so the product works
with or without a Studio deployment.

## Identity

`identity.json` is written after `bag erc8004 register` and surfaced in the
Agent Ops UI.
