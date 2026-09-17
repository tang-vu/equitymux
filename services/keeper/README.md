# EquityMux Keeper

Bounded maintenance agent for EquityMux, built on the canonical BNB Agent
Studio scaffold (`bag` CLI v0.0.13, `@bnbagent/studio-runtime@0.0.13`).

## Role

Monitor explicitly authorized portfolio policies and propose or execute
*bounded* maintenance tasks. The keeper has **no signing capability** outside
the Agentic Wallet boundary — analysis tasks return evaluation bundles;
anything that moves funds requires the user's interactive confirmation through
the normal pipeline.

## Layout (canonical `bag init` shape)

```
studio.toml            # workspace project config — `bag doctor` reads this
agent/
  src/
    unifiedMain.ts     # A2A + MCP + x402 entrypoints (scaffold, verbatim)
    sellerCore.ts      # negotiate / notifyFunded / sweep (scaffold, verbatim)
    signing.ts         # EIP-191 quote sign / submitResult / settle — FIXED code,
                       # never LLM-callable (scaffold, verbatim)
    executor.ts        # A2A wire + EquityMux override of doWorkAndSubmit
    agentCard.ts, model.ts, requestLimits.ts, tools.ts   # scaffold, verbatim
  package.json         # pinned: @bnbagent/studio-runtime@0.0.13, @bnbagent/sdk@0.5.5
.studio/wallets/       # evm-local keystore dir (gitignored)
```

**Customization surface is one method**: `SellerAgentExecutor.doWorkAndSubmit`
in `agent/src/executor.ts` delegates the paid job to
`POST $EQUITYMUX_API_URL/api/agent/tasks` (kind `EVALUATE_EQUITY_INTENT`) and
submits the API's deterministic JSON as the deliverable. The LLM is bypassed
for deliverable content — the paid output is byte-reproducible analysis, and
all on-chain signing stays in `signing.ts` fixed code.

## Task surface (ERC-8183-style)

| Task | Input | Output | Authority |
|---|---|---|---|
| `EVALUATE_EQUITY_INTENT` | `{ticker, notional, constitutionHash?}` | route evaluation bundle | analysis only |
| `REFRESH_REPRESENTATION_GRAPH` | `{ticker}` | normalized representations | read-only |
| `CHECK_CONSTITUTION_COMPLIANCE` | `{exposures, totalValueUsd}` | violations[] | read-only |
| `PREPARE_REBALANCE` | `{targetAllocations}` | plan + receipt DRAFT | never self-executes |

## Verify

```bash
cd services/keeper
bag doctor          # scaffold + env diagnostics (PASS for project checks)

cd agent && pnpm install && pnpm build   # compiles against pinned runtime
```

## Run locally (no Studio deploy needed)

```bash
# keeper logic is served by the EquityMux API — services/api/equitymux/services/keeper.py
pnpm dev:api
curl -s localhost:8000/api/agent/tasks -H 'content-type: application/json' \
  -d '{"kind":"EVALUATE_EQUITY_INTENT","input":{"ticker":"NVDA","notional":"10"}}'

# or run the Studio runtime dev loop (needs wallet + WALLET_PASSWORD):
cd agent && EQUITYMUX_API_URL=http://localhost:8000 pnpm dev
```

## Deployment

```bash
cd services/keeper
bag wallet new                          # throwaway wallet for testnet
bag erc8004 register --endpoint <url>   # on-chain identity (writes identity.json)
bag deploy --provider aws               # mainnet-capable provider
```

The managed `bnb` provider is a **48h testnet trial** — never presented as
mainnet. `studio.toml` targets `bsc-mainnet`; deployment requires AWS/Azure
credentials (human action).

## Identity

`identity.json` is written after `bag erc8004 register` and surfaced in the
Agent Ops UI.
