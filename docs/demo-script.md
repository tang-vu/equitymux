# Judge demo — one stock, one decision, one policy challenge

Target duration: 3 minutes. Start web/API locally, or use the verified deployment
when available. No wallet is needed. Keep the RECORDED badge visible throughout.

| Time | Action | Say / show |
|---|---|---|
| 0:00–0:25 | Open decision desk | “Buying NVIDIA exposure should not require choosing a wrapper. These issuers represent the same company differently.” |
| 0:25–0:50 | Run `Buy $10 of NVDA` in recorded mode | Three real recorded representations, normalized by shares per token. No fabricated quotes. |
| Optional | Select an issuer sleeve; open **Explain normalization** | Token price divided by shares per token resolves to the service's USD/share observation. The sleeve, ledger inspector and parity reference stay aligned. |
| 0:50–1:20 | Expand the research lead and a rejected alternative | Show raw token price, multiplier, underlying share price, parity and exact policy checks. A shortlist is not a trade. |
| 1:20–1:50 | Click **Require liquidity evidence** | The same snapshot now fails the depth requirement. “Market cap is not liquidity. Unknown is not safe.” |
| 1:50–2:15 | Restore baseline; toggle an issuer or tighten premium; apply to same snapshot | Only the policy changes. Explain the revised shortlist and rejected alternatives. |
| 2:15–2:40 | Verify & replay; download receipt | Browser hash and server replay match. Show embedded snapshot, policy and NOT_EXECUTED status. |
| 2:40–3:00 | Show `pnpm demo` or the MCP test | Agents use the identical analyze/compare/replay workflow. No agent tool can sign. |

## Reproduction

```bash
pnpm demo
pnpm cli replay ../../data/judge-demo/baseline.json
cd services/api
uv run pytest tests/test_mcp.py -q
```

The demo uses repository recordings. It proves deterministic decision behavior,
not current liquidity, live execution, verified backing or investment returns.
An actual mainnet demonstration remains an explicit release gate: authenticated
funded wallet, exact transaction simulation and binding, authorized small trade,
confirmed chain receipt and independently checked resulting token balance.
Do not substitute test transactions or invented hashes for that gate.
