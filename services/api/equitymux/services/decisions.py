"""Read-only, replayable exposure decisions. No wallet or execution authority.

Displayed prices support a shortlist, never an executable cost promise. Every
unknown stays visible. Replay recomputes the decision from the embedded inputs;
SHA-256 provides integrity, not source authenticity or proof of backing.
"""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from equitymux.config import FIXTURES_DIR, Settings
from equitymux.domain.mathx import premium_bps
from equitymux.domain.models import EquityIntent, MarketState, TokenizedRepresentation
from equitymux.policy.schema import canonical_json
from equitymux.providers.binance_public import BinancePublicClient
from equitymux.services.graph import CanonicalEquityGraph
from equitymux.services.intent import parse_intent
from equitymux.services.receipts import receipt_hash

VERSION = "equitymux-decision/1"
Issuer = Literal["ondo", "xstocks", "bstock"]


def _issuers() -> list[Issuer]:
    return ["ondo", "xstocks", "bstock"]


class DecisionPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    max_premium_bps: Decimal = Field(default=Decimal(100), ge=0, le=10000)
    max_parity_deviation_bps: Decimal = Field(default=Decimal(500), ge=0, le=10000)
    max_slippage_bps: Decimal = Field(default=Decimal(50), ge=0, le=100)
    min_liquidity_usd: Decimal = Field(default=Decimal(0), ge=0, le=1000000000)
    allowed_platforms: list[Issuer] = Field(default_factory=_issuers, max_length=3)
    require_attestation: bool = False
    allow_closed_market: bool = True


class MarketSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ticker: str = Field(pattern=r"^[A-Z][A-Z0-9.]{0,9}$")
    data_label: Literal["LIVE", "RECORDED"]
    representations: list[TokenizedRepresentation] = Field(max_length=100)
    source_digest: str | None = None
    market: dict[str, Any] = Field(default_factory=dict)


class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=500)
    policy: DecisionPolicy = Field(default_factory=DecisionPolicy)
    mode: Literal["live", "recorded"] = "recorded"


def capture(ticker: str, mode: str, settings: Settings | None = None) -> MarketSnapshot:
    s = (settings or Settings()).model_copy(update={"demo_mode": mode == "recorded"})
    graph = CanonicalEquityGraph(BinancePublicClient(s), s.platforms)
    reps = graph.discover(ticker)
    # Endpoints do not establish the underlying price timestamp. Retrieval time
    # must not be relabeled as the timestamp of the stock price itself.
    for rep in reps:
        rep.reference_observed_at = None
        rep.attestation.observed_at = None
    source_digest = None
    if mode == "recorded":
        digest = hashlib.sha256()
        for path in sorted((FIXTURES_DIR / "rwa").glob("*.json")):
            digest.update(path.name.encode())
            digest.update(path.read_bytes())
        source_digest = "sha256:" + digest.hexdigest()
    return MarketSnapshot(
        ticker=ticker,
        data_label="RECORDED" if s.demo_mode else "LIVE",
        representations=reps,
        source_digest=source_digest,
        market=graph.underlying_market(),
    )


def compile_request(request: DecisionRequest) -> tuple[EquityIntent, DecisionPolicy]:
    intent = parse_intent(request.text)
    if not intent.ticker or intent.notional is None or intent.notional <= 0:
        raise ValueError("Use a positive amount and one ticker, e.g. Buy $10 of NVDA")
    if intent.side.value != "BUY":
        raise ValueError("Decision analysis currently supports BUY exposure only")
    if intent.quote_asset not in {"USDC", "USDT", "USD1", "U"}:
        raise ValueError("Analysis requires a supported USD quote asset")
    policy = request.policy.model_copy(deep=True)
    if "maxPremiumBps" in intent.constraints:
        policy.max_premium_bps = min(policy.max_premium_bps, Decimal(intent.constraints["maxPremiumBps"]))
    if "maxSlippageBps" in intent.constraints:
        policy.max_slippage_bps = min(policy.max_slippage_bps, Decimal(intent.constraints["maxSlippageBps"]))
    return intent, policy


def analyze(snapshot: MarketSnapshot, intent: EquityIntent, policy: DecisionPolicy) -> dict:
    if snapshot.ticker != intent.ticker or intent.notional is None or intent.notional <= 0:
        raise ValueError("snapshot ticker and positive intent must match")
    if intent.side.value != "BUY":
        raise ValueError("only BUY analysis is supported")
    rows: list[dict] = []
    seen: set[str] = set()
    for rep in snapshot.representations:
        key = rep.token_address.lower()
        if key in seen or rep.underlying_ticker != snapshot.ticker or rep.chain_id != 56:
            raise ValueError("snapshot contains duplicate, cross-asset or non-BSC representations")
        seen.add(key)
        price = rep.implied_share_price_usd
        ref = rep.reference_price_usd
        independent = bool(ref and ref > 0 and rep.reference_price_source != "kline:close")
        parity = premium_bps(price, ref) if price and price > 0 and independent and ref else None
        checks: list[dict] = []

        def check(rule: str, passed: bool, detail: str, target: list = checks) -> None:
            target.append({"rule": rule, "status": "PASS" if passed else "FAIL", "detail": detail})

        check("issuer", rep.platform.value in policy.allowed_platforms, f"Issuer: {rep.platform.value}")
        check("price", price is not None and price > 0, "Positive normalized price required")
        check(
            "reference",
            independent,
            "Independent underlying reference required; token candles cannot qualify",
        )
        check(
            "premium",
            parity is not None and parity <= policy.max_premium_bps,
            f"Maximum premium: {policy.max_premium_bps} bps",
        )
        check(
            "parity",
            parity is not None and abs(parity) <= policy.max_parity_deviation_bps,
            f"Maximum absolute deviation: {policy.max_parity_deviation_bps} bps (discounts included)",
        )
        check(
            "market",
            rep.market_state not in {MarketState.HALTED, MarketState.UNKNOWN}
            and (policy.allow_closed_market or rep.market_state != MarketState.CLOSED),
            f"Underlying market: {rep.market_state.value}",
        )
        if policy.require_attestation:
            check(
                "attestation",
                rep.attestation.supported,
                "Issuer report link available; report contents/backing are not independently verified",
            )
        if policy.min_liquidity_usd > 0:
            check(
                "liquidity",
                False,
                "Executable depth unavailable; market cap and volume do not prove liquidity",
            )
        blockers = [c["rule"] for c in checks if c["status"] == "FAIL"]
        volume = None
        if rep.liquidity.volume_24h_buy_usd is not None and rep.liquidity.volume_24h_sell_usd is not None:
            volume = rep.liquidity.volume_24h_buy_usd + rep.liquidity.volume_24h_sell_usd
        rows.append(
            {
                "platform": rep.platform.value,
                "symbol": rep.token_symbol,
                "tokenAddress": rep.token_address,
                "tokenPriceUsd": rep.token_price_usd,
                "sharesPerToken": rep.shares_per_token,
                "sharePriceUsd": price,
                "referencePriceUsd": ref,
                "referenceSource": rep.reference_price_source,
                "premiumBps": parity,
                "marketState": rep.market_state.value,
                "indicativeShares": intent.notional / price if price and price > 0 else None,
                "volume24hUsd": volume,
                "executableLiquidityUsd": None,
                "allInCostUsd": None,
                "status": "SHORTLISTED" if not blockers else "REJECTED",
                "checks": checks,
                "blockers": blockers,
                "sourceEvidence": rep.source_evidence,
                "attestation": rep.attestation.model_dump(mode="json"),
            }
        )
    rows.sort(
        key=lambda r: (bool(r["blockers"]), r["sharePriceUsd"] or Decimal("Infinity"), r["tokenAddress"])
    )
    viable = [r for r in rows if not r["blockers"]]
    selected = viable[0] if viable else None
    prices = [r["sharePriceUsd"] for r in rows if r["sharePriceUsd"] and r["sharePriceUsd"] > 0]
    dispersion = (max(prices) / min(prices) - 1) * 10000 if len(prices) > 1 else None
    explanation = "No representation satisfies the requested market-data policy. No route is recommended."
    if selected:
        explanation = (
            f"{selected['symbol']} has the lowest displayed cost per underlying share among "
            f"{len(viable)} representations passing observed checks. "
            "This is a research shortlist, pending executable quotes and simulation."
        )
    comparison = None
    if len(viable) > 1 and selected is not None:
        next_best = viable[1]
        comparison = {
            "against": next_best["symbol"],
            "displayedPriceAdvantageBps": (next_best["sharePriceUsd"] / selected["sharePriceUsd"] - 1)
            * 10000,
        }
    result: dict[str, Any] = {
        "state": "ANALYSIS_READY" if selected else "NO_VALID_ROUTE",
        "selected": selected["tokenAddress"] if selected else None,
        "explanation": explanation,
        "comparison": comparison,
        "routes": rows,
        "dispersionBps": dispersion,
        "execution": {
            "status": "NOT_EXECUTED",
            "txHash": None,
            "blockers": ["RECORDED_DATA"] if snapshot.data_label == "RECORDED" else [],
        },
        "limitations": [
            "Displayed prices exclude gas, swap fees and market impact",
            "Executable depth and slippage are unknown until a size-specific quote",
            "Reference price timestamp is unverified; retrieval time is not price freshness",
            "Attestation links are evidence pointers, not verified backing or redemption rights",
        ],
    }
    result["execution"]["blockers"] += [
        "EXECUTABLE_QUOTE_REQUIRED",
        "REFERENCE_FRESHNESS_UNVERIFIED",
        "BOUND_SWAP_SIMULATION_REQUIRED",
        "HUMAN_AUTHORIZATION_REQUIRED",
    ]
    return json.loads(canonical_json(result))


def build_decision(snapshot: MarketSnapshot, intent: EquityIntent, policy: DecisionPolicy) -> dict:
    result = analyze(snapshot, intent, policy)
    body = {
        "version": VERSION,
        "kind": "EXPOSURE_DECISION",
        "dataLabel": snapshot.data_label,
        "snapshot": snapshot.model_dump(mode="json"),
        "intent": intent.model_dump(mode="json"),
        "policy": policy.model_dump(mode="json"),
        "decision": result,
    }
    body["receiptHash"] = receipt_hash(body)
    return body


def decide(request: DecisionRequest, settings: Settings | None = None) -> dict:
    intent, policy = compile_request(request)
    return build_decision(capture(intent.ticker, request.mode, settings), intent, policy)


def replay(receipt: dict) -> dict:
    if receipt.get("version") != VERSION or receipt.get("kind") != "EXPOSURE_DECISION":
        raise ValueError("unsupported decision receipt version")
    snapshot = MarketSnapshot.model_validate(receipt["snapshot"])
    intent = EquityIntent.model_validate(receipt["intent"])
    policy = DecisionPolicy.model_validate(receipt["policy"])
    expected = build_decision(snapshot, intent, policy)
    return {
        "hashMatch": receipt_hash(receipt) == receipt.get("receiptHash"),
        "decisionMatch": expected["decision"] == receipt.get("decision"),
        "provenanceMatch": receipt.get("dataLabel") == snapshot.data_label,
        "method": VERSION,
        "authenticity": "NOT_ATTESTED",
        "note": "Integrity and deterministic replay do not authenticate upstream data or prove a trade",
    }


def compare(receipt: dict, policy: DecisionPolicy) -> dict:
    verified = replay(receipt)
    if not all(verified[k] for k in ("hashMatch", "decisionMatch", "provenanceMatch")):
        raise ValueError("receipt failed integrity/replay checks")
    snapshot = MarketSnapshot.model_validate(receipt["snapshot"])
    intent = EquityIntent.model_validate(receipt["intent"])
    # An explicit what-if replaces the market policy, but intent limits persist.
    _, effective = compile_request(DecisionRequest(text=intent.raw, policy=policy))
    revised = build_decision(snapshot, intent, effective)
    previous = {r["tokenAddress"]: r for r in receipt["decision"]["routes"]}
    changes = [
        {
            "symbol": r["symbol"],
            "before": previous[r["tokenAddress"]]["status"],
            "after": r["status"],
            "blockers": r["blockers"],
        }
        for r in revised["decision"]["routes"]
        if r["status"] != previous[r["tokenAddress"]]["status"]
    ]
    return {
        "receipt": revised,
        "previousHash": receipt["receiptHash"],
        "sameSnapshot": True,
        "changes": changes,
    }
