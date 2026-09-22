"""EquityMux Keeper — bounded maintenance agent logic (ERC-8183-style tasks).

Analysis tasks run inline. Anything that could move funds is rejected here and
must go through the interactive pipeline with human confirmation — the keeper
never has a signing capability outside the Agentic Wallet boundary.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from equitymux.domain.models import EquityIntent, Side
from equitymux.policy.engine import PortfolioState
from equitymux.policy.schema import PortfolioConstitution
from equitymux.services import persistence

SUPPORTED_TASKS = {
    "ANALYZE_EXPOSURE",
    "EVALUATE_EQUITY_INTENT",
    "REFRESH_REPRESENTATION_GRAPH",
    "CHECK_CONSTITUTION_COMPLIANCE",
    "PREPARE_REBALANCE",
}


def run_task(kind: str, inp: dict[str, Any], pipeline) -> dict:
    if kind == "ANALYZE_EXPOSURE":
        from equitymux.services.decisions import DecisionRequest, decide

        return decide(DecisionRequest.model_validate(inp), pipeline.s)
    if kind == "EVALUATE_EQUITY_INTENT":
        return evaluate_equity_intent(inp, pipeline)
    if kind == "REFRESH_REPRESENTATION_GRAPH":
        ticker = str(inp.get("ticker", "NVDA")).upper()
        data = pipeline.explore(ticker)
        return {"ticker": ticker, "representations": len(data["representations"]), "market": data["market"]}
    if kind == "CHECK_CONSTITUTION_COMPLIANCE":
        return check_compliance(inp, pipeline)
    if kind == "PREPARE_REBALANCE":
        return {
            "status": "PREPARED_NOT_EXECUTED",
            "note": "rebalance plans never self-execute; interactive confirmation required",
            "input": inp,
        }
    return {"error": f"unsupported task kind: {kind}", "supported": sorted(SUPPORTED_TASKS)}


def evaluate_equity_intent(inp: dict[str, Any], pipeline) -> dict:
    ticker = str(inp.get("ticker", "")).upper()
    if not ticker:
        return {"error": "ticker required"}
    notional = inp.get("notional")
    intent = EquityIntent(
        raw=f"agent eval {ticker}",
        ticker=ticker,
        side=Side.BUY,
        notional=Decimal(str(notional)) if notional else None,
        quote_asset=str(inp.get("quoteAsset", "USDC")),
    )
    data = pipeline.explore(ticker)
    reps = data["representations"]

    row = persistence.active_constitution()
    constitution = (
        PortfolioConstitution.model_validate_json(row["canonical_json"]) if row else PortfolioConstitution()
    )
    from equitymux.policy.engine import DeterministicPolicyEngine

    engine = DeterministicPolicyEngine(constitution, pipeline.s)
    tournament = pipeline.tournament
    cands = tournament.build_candidates(intent, [_rep_from_dump(r) for r in reps])
    tournament.evaluate(intent, cands, engine, PortfolioState())
    return {
        "ticker": ticker,
        "market": data["market"],
        "candidates": [
            {
                "platform": c.representation.platform.value,
                "token": c.representation.token_symbol,
                "tokenAddress": c.representation.token_address,
                "premiumBps": str(c.premium_bps) if c.premium_bps is not None else None,
                "marketState": c.representation.market_state.value,
                "status": c.status.value,
                "score": str(c.score) if c.score is not None else None,
                "reasonCodes": c.reason_codes,
            }
            for c in cands
        ],
        "note": "analysis only — no execution authority",
    }


def check_compliance(inp: dict[str, Any], pipeline) -> dict:
    row = persistence.active_constitution()
    if not row:
        return {"error": "no active constitution"}
    constitution = PortfolioConstitution.model_validate_json(row["canonical_json"])
    exposures = inp.get("exposures") or {}
    total = Decimal(str(inp.get("totalValueUsd", "0")))
    violations = []
    pct = constitution.concentration.max_single_underlying_pct
    if pct is not None and total > 0:
        for ticker, usd in exposures.items():
            share = Decimal(str(usd)) / total * 100
            if share > pct:
                violations.append(
                    {
                        "rule": "concentration.max_single_underlying",
                        "ticker": ticker,
                        "sharePct": str(share),
                        "maxPct": str(pct),
                    }
                )
    return {"compliant": not violations, "violations": violations, "constitutionHash": row["hash"]}


def _rep_from_dump(d: dict):
    from equitymux.domain.models import TokenizedRepresentation

    return TokenizedRepresentation.model_validate(d)
