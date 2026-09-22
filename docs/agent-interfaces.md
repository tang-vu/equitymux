# Agent interfaces

Start `pnpm mcp` for MCP stdio, or use REST at `localhost:8000`.
The official Python MCP SDK supplies framing, initialization and tool schemas.
The MCP test launches the real subprocess and negotiates a session.

Tools:

- `analyze_exposure`: `{ "text": "Buy $10 of NVDA", "mode": "recorded" }`.
  Optional typed `policy`; extra policy fields are rejected.
- `compare_policy`: `{ "receipt": <entire decision receipt>, "policy": { "min_liquidity_usd": "100000" } }`.
  Reuses embedded market inputs; refuses tampered or unreproducible receipts.
- `replay_decision`: `{ "receipt": <entire decision receipt> }`.
  Returns `hashMatch`, `decisionMatch`, `provenanceMatch` and the authenticity limit.

REST equivalents are `/api/decisions`, `/api/decisions/compare` and
`/api/decisions/replay`. The keeper accepts:

```json
{"kind":"ANALYZE_EXPOSURE","input":{"text":"Buy $10 of NVDA","mode":"recorded"}}
```

The Agent Studio domain adapter accepts the same structured `text`, `mode` and
`policy` inside a job's task. It refuses failed API tasks before the fixed signing
code can submit a deliverable. Its local boundary tests do not prove hosted
payment settlement or on-chain delivery.

With the API running, test the actual keeper HTTP adapter:

```bash
cd services/keeper/agent
EQUITYMUX_API_URL=http://localhost:8000 pnpm test:api
```

This smoke test requests RECORDED analysis, checks the receipt and asserts that
no transaction occurred. It imports no payment or signing module.

Every path is read-only with respect to wallets. No server tool authorizes a
trade. LIVE describes upstream fetching, not verified freshness. RECORDED is
historical fixture evidence. Independent replay verifies internal consistency,
not the authenticity of user-supplied source data.

## Python API usage

```python
import httpx

with httpx.Client(base_url="http://localhost:8000", timeout=120) as client:
    response = client.post("/api/decisions", json={"text": "Buy $10 of NVDA"})
    response.raise_for_status()
    receipt = response.json()
    checked = client.post("/api/decisions/replay", json={"receipt": receipt})
    checked.raise_for_status()
    assert checked.json()["decisionMatch"]
```
