"""EquityMux API — thin HTTP layer over the domain services."""
from __future__ import annotations

import json
import uuid
from decimal import Decimal
from typing import Any

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from equitymux.config import get_settings
from equitymux.dx import recorder
from equitymux.policy.compiler import compile_with_report
from equitymux.policy.schema import (
    POLICY_COMPILER_VERSION,
    PortfolioConstitution,
    constitution_hash,
)
from equitymux.policy.engine import PortfolioState
from equitymux.providers.baw import AgenticWallet
from equitymux.providers.bsc_rpc import BscRpc
from equitymux.providers.errors import ProviderError
from equitymux.services import persistence
from equitymux.services.intent import parse_intent
from equitymux.services.pipeline import Pipeline

log = structlog.get_logger()
settings = get_settings()
app = FastAPI(title="EquityMux", version="0.1.0",
              description="The intent and execution router for tokenized stocks")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"],
                   allow_methods=["*"], allow_headers=["*"])

pipeline = Pipeline(settings)
wallet = AgenticWallet(settings)
rpc = BscRpc(settings)


@app.on_event("startup")
def _startup() -> None:
    persistence.init_db()


# ---------- meta ----------
@app.get("/api/health")
def health() -> dict:
    out = {"app": "ok", "demoMode": settings.demo_mode,
           "executionEnabled": settings.execution_enabled,
           "dxSession": recorder.session_id()}
    try:
        out["bscRpc"] = {"ok": True, "chainId": rpc.chain_id(),
                         "block": rpc.block_number()}
    except Exception as e:
        out["bscRpc"] = {"ok": False, "error": str(e)[:200]}
    try:
        out["agenticWallet"] = {"installed": wallet.available(),
                                "status": wallet.status() if wallet.available() else None}
    except Exception as e:
        out["agenticWallet"] = {"installed": wallet.available(), "error": str(e)[:200]}
    try:
        ms = pipeline.graph.client.market_status()
        out["binanceRwa"] = {"ok": True, "marketStatus": ms.get("marketStatus"),
                             "openState": ms.get("openState")}
    except Exception as e:
        out["binanceRwa"] = {"ok": False, "error": str(e)[:200]}
    return out


@app.get("/api/config")
def config() -> dict:
    return {
        "demoMode": settings.demo_mode,
        "executionEnabled": settings.execution_enabled,
        "requireSimulation": settings.require_simulation,
        "requireConfirmation": settings.require_confirmation,
        "maxMainnetNotionalUsd": settings.max_mainnet_notional_usd,
        "allowedChainIds": sorted(settings.chain_ids),
        "allowedPlatforms": sorted(settings.platforms),
        "allowedQuoteAssets": sorted(settings.quote_assets),
        "maxSlippageBpsHard": settings.max_slippage_bps_hard,
        "maxPremiumBpsHard": settings.max_premium_bps_hard,
    }


# ---------- constitution ----------
class CompileIn(BaseModel):
    text: str


@app.post("/api/constitution/compile")
def constitution_compile(body: CompileIn) -> dict:
    return compile_with_report(body.text)


class ApproveIn(BaseModel):
    nl_text: str
    constitution: dict[str, Any]


@app.post("/api/constitution/approve")
def constitution_approve(body: ApproveIn) -> dict:
    c = PortfolioConstitution.model_validate(body.constitution)
    chash = constitution_hash(c)
    persistence.save_constitution(body.nl_text, c.model_dump(mode="json"),
                                  POLICY_COMPILER_VERSION, chash, approved=True)
    return {"hash": chash, "active": True}


@app.get("/api/constitution")
def constitution_get() -> dict:
    row = persistence.active_constitution()
    if not row:
        return {"active": None}
    row["canonical"] = json.loads(row["canonical_json"])
    return {"active": row}


@app.get("/api/constitution/history")
def constitution_history() -> dict:
    return {"history": persistence.constitution_history()}


# ---------- explorer ----------
@app.get("/api/explore/{ticker}")
def explore(ticker: str) -> dict:
    try:
        return pipeline.explore(ticker)
    except ProviderError as e:
        raise HTTPException(502, str(e))


# ---------- intent / tournament ----------
class RunIn(BaseModel):
    text: str | None = None
    intent: dict[str, Any] | None = None
    state: dict[str, Any] | None = None
    confirm: bool = False


@app.post("/api/intent")
def run_intent(body: RunIn) -> dict:
    intent = parse_intent(body.text) if body.text else None
    if intent is None and body.intent:
        from equitymux.domain.models import EquityIntent
        intent = EquityIntent.model_validate(body.intent)
    if intent is None or not intent.ticker:
        raise HTTPException(400, "could not parse a supported ticker from intent")
    row = persistence.active_constitution()
    if not row:
        raise HTTPException(400, "no active constitution — approve one first")
    constitution = PortfolioConstitution.model_validate(json.loads(row["canonical_json"]))
    state = PortfolioState.model_validate(body.state or {})
    result = pipeline.run(intent, constitution, state, confirm=body.confirm)
    return result


# ---------- receipts ----------
@app.get("/api/receipts")
def receipts() -> dict:
    return {"receipts": persistence.list_receipts()}


@app.get("/api/receipts/{receipt_id}")
def receipt(receipt_id: str) -> dict:
    r = persistence.get_receipt(receipt_id)
    if not r:
        raise HTTPException(404, "receipt not found")
    return r


# ---------- agent / keeper ----------
class TaskIn(BaseModel):
    kind: str = "EVALUATE_EQUITY_INTENT"
    input: dict[str, Any]


@app.post("/api/agent/tasks")
def submit_task(body: TaskIn) -> dict:
    """ERC-8183-style task intake. Analysis tasks run inline; execution tasks are
    always queued for the wallet boundary — an arbitrary caller can never spend."""
    from equitymux.services import keeper
    task_id = uuid.uuid4().hex[:16]
    persistence.save_task(task_id, body.kind, body.input)
    try:
        output = keeper.run_task(body.kind, body.input, pipeline)
        persistence.finish_task(task_id, output)
        return {"taskId": task_id, "status": "SUCCEEDED", "output": output}
    except ProviderError as e:
        persistence.finish_task(task_id, {"error": str(e)}, "FAILED")
        raise HTTPException(502, str(e))


@app.get("/api/agent/tasks")
def agent_tasks() -> dict:
    return {"tasks": persistence.list_tasks()}


@app.get("/api/agent/identity")
def agent_identity() -> dict:
    from equitymux.config import REPO_ROOT
    p = REPO_ROOT / "services" / "keeper" / "identity.json"
    try:
        ident = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        ident = {"name": "EquityMux Keeper", "erc8004": None,
                 "status": "local-runtime", "note": "register with `bag erc8004 register`"}
    return {"agent": ident, "tasks": persistence.list_tasks(10)}


# ---------- dx ----------
@app.get("/api/dx/events")
def dx_events(limit: int = 200) -> dict:
    path = recorder._EVENTS
    if not path.exists():
        return {"events": []}
    lines = path.read_text(encoding="utf-8").strip().splitlines()[-limit:]
    return {"events": [json.loads(l) for l in lines if l.strip()]}
