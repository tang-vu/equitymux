"""Execution receipts — canonical JSON + SHA-256 hash. Never contains secrets."""

from __future__ import annotations

import hashlib
import time
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from equitymux.domain.models import CandidateRoute, EquityIntent, ExecState
from equitymux.policy.schema import canonical_json


def _ser(v: Any) -> Any:
    if isinstance(v, Decimal):
        return format(v.normalize(), "f")
    if hasattr(v, "model_dump"):
        return v.model_dump(mode="json")
    if isinstance(v, dict):
        return {k: _ser(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_ser(x) for x in v]
    if isinstance(v, ExecState):
        return v.value
    return v


def receipt_hash(receipt: dict) -> str:
    """SHA-256 over canonical JSON with receipt_hash field excluded."""
    body = {k: v for k, v in receipt.items() if k not in ("receipt_hash", "receiptHash")}
    return "0x" + hashlib.sha256(canonical_json(body).encode()).hexdigest()


def build_receipt(
    *,
    intent: EquityIntent,
    constitution_hash: str,
    policy_checks: list[dict],
    market_context: dict,
    candidates: list[CandidateRoute],
    selected: CandidateRoute | None,
    simulation: dict | None,
    authorization: dict,
    execution: dict,
    agent: dict,
    transitions: list[dict],
    state: str,
    data_label: str = "LIVE",
) -> dict:
    rec = {
        "version": "1",
        "receiptId": uuid.uuid4().hex,
        "createdAt": datetime.now(UTC).isoformat(),
        # provenance is part of the hashed body — a RECORDED receipt can never
        # be passed off as live without breaking its own hash.
        "dataLabel": data_label,
        "intent": _ser(intent.model_dump(mode="json")),
        "policy": {"constitutionHash": constitution_hash, "checks": policy_checks},
        "marketContext": _ser(market_context),
        "candidates": [_ser(_candidate_view(c)) for c in candidates],
        "selectedRoute": _ser(_candidate_view(selected)) if selected else None,
        "simulation": _ser(simulation),
        "authorization": _ser(authorization),
        "execution": _ser(execution),
        "agent": _ser(agent),
        "evidence": _ser(_evidence(candidates)),
        "transitions": _ser(transitions),
        "state": state,
    }
    rec["receiptHash"] = receipt_hash(rec)
    return rec


def _candidate_view(c: CandidateRoute | None) -> dict | None:
    if c is None:
        return None
    rep = c.representation
    return {
        "platform": rep.platform.value,
        "tokenSymbol": rep.token_symbol,
        "tokenAddress": rep.token_address,
        "chainId": rep.chain_id,
        "sharesPerToken": rep.shares_per_token,
        "tokenPriceUsd": rep.token_price_usd,
        "referencePriceUsd": rep.reference_price_usd,
        "referencePriceSource": rep.reference_price_source,
        "impliedSharePriceUsd": rep.implied_share_price_usd,
        "premiumBps": c.premium_bps,
        "expectedSlippageBps": c.expected_slippage_bps,
        "referenceAgeS": c.reference_age_s,
        "marketState": rep.market_state.value,
        "marketReasonCode": rep.market_reason_code,
        "quote": c.quote.model_dump(mode="json") if c.quote else None,
        "status": c.status.value,
        "reasonCodes": c.reason_codes,
        "policy": c.policy.model_dump(mode="json") if c.policy else None,
        "simulation": c.simulation.model_dump(mode="json") if c.simulation else None,
        "score": c.score,
        "scoreBreakdown": c.score_breakdown,
        "attestation": rep.attestation.model_dump(mode="json"),
        "liquidity": rep.liquidity.model_dump(mode="json"),
    }


def _evidence(candidates: list[CandidateRoute]) -> list[dict]:
    out = []
    for c in candidates:
        for src in c.representation.source_evidence:
            out.append(
                {
                    "kind": "api",
                    "ref": src,
                    "platform": c.representation.platform.value,
                    "token": c.representation.token_address,
                }
            )
    return out


def freshness_ok(sim_ts_iso: str, max_age_s: int) -> bool:
    try:
        age = time.time() - datetime.fromisoformat(sim_ts_iso).timestamp()
    except ValueError:
        return False
    return 0 <= age <= max_age_s
