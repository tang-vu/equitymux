import copy
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from equitymux.services.decisions import (
    DecisionPolicy,
    DecisionRequest,
    MarketSnapshot,
    analyze,
    build_decision,
    compare,
    compile_request,
    decide,
    replay,
)
from equitymux.services.receipts import receipt_hash


def test_recorded_decision_is_deterministic_and_offline(monkeypatch):
    import httpx

    def forbidden(*args, **kwargs):
        raise AssertionError("recorded analysis must never touch the network")

    monkeypatch.setattr(httpx, "get", forbidden)
    monkeypatch.setattr(httpx, "post", forbidden)
    request = DecisionRequest(text="Buy $10 of NVDA")
    first, second = decide(request), decide(request)
    assert first == second
    assert first["dataLabel"] == "RECORDED"
    assert len(first["decision"]["routes"]) == 3
    assert first["decision"]["execution"]["txHash"] is None
    assert replay(first)["decisionMatch"]
    assert replay(first)["hashMatch"]
    assert all(r["allInCostUsd"] is None for r in first["decision"]["routes"])


def test_min_liquidity_fails_closed_and_does_not_change_snapshot():
    receipt = decide(DecisionRequest(text="Buy $10 of NVDA"))
    revised = compare(receipt, DecisionPolicy(min_liquidity_usd=Decimal(1000)))
    assert revised["receipt"]["snapshot"] == receipt["snapshot"]
    assert revised["receipt"]["decision"]["state"] == "NO_VALID_ROUTE"
    assert all("liquidity" in r["blockers"] for r in revised["receipt"]["decision"]["routes"])


def test_hash_and_replay_are_independent_tamper_checks():
    receipt = decide(DecisionRequest(text="Buy $10 of NVDA"))
    bad = copy.deepcopy(receipt)
    bad["decision"]["selected"] = "invented"
    assert not replay(bad)["hashMatch"]
    bad["receiptHash"] = receipt_hash(bad)
    assert replay(bad)["hashMatch"]
    assert not replay(bad)["decisionMatch"]
    with pytest.raises(ValueError):
        compare(bad, DecisionPolicy())


def test_normalization_and_discount_risk(rep_ondo, rep_bstock, intent):
    rep_ondo.reference_price_source = rep_bstock.reference_price_source = "stockInfo"
    rep_ondo.shares_per_token = Decimal(2)
    rep_ondo.token_price_usd = Decimal(360)
    rep_bstock.token_price_usd = Decimal(90)
    snap = MarketSnapshot(ticker="NVDA", data_label="RECORDED", representations=[rep_bstock, rep_ondo])
    decision = analyze(snap, intent, DecisionPolicy())
    assert decision["selected"] == rep_ondo.token_address
    assert decision["routes"][0]["sharePriceUsd"] == "180"
    assert "parity" in decision["routes"][1]["blockers"]


def test_permutation_does_not_change_ranking(rep_ondo, rep_bstock, intent):
    snap = MarketSnapshot(ticker="NVDA", data_label="RECORDED", representations=[rep_bstock, rep_ondo])
    first = analyze(snap, intent, DecisionPolicy())
    snap.representations.reverse()
    assert first == analyze(snap, intent, DecisionPolicy())


def test_candle_cannot_validate_parity(rep_ondo, intent):
    rep_ondo.reference_price_source = "kline:close"
    snap = MarketSnapshot(ticker="NVDA", data_label="RECORDED", representations=[rep_ondo])
    result = analyze(snap, intent, DecisionPolicy())
    assert result["selected"] is None
    assert "reference" in result["routes"][0]["blockers"]


def test_unknown_or_nonfinite_policy_rejected():
    for policy in ({"min_liquidity_usd": "NaN"}, {"max_premium_bps": -1}, {"approve": True}):
        with pytest.raises(ValueError):
            DecisionPolicy.model_validate(policy)


def test_intent_limits_and_thousands():
    intent, policy = compile_request(DecisionRequest(text="Buy $1,000 of NVDA with maximum 30 bps slippage"))
    assert intent.notional == Decimal(1000)
    assert policy.max_slippage_bps == Decimal(30)


def test_forged_provenance_is_detected():
    receipt = decide(DecisionRequest(text="Buy $10 of NVDA"))
    receipt["dataLabel"] = "LIVE"
    receipt["receiptHash"] = receipt_hash(receipt)
    assert not replay(receipt)["provenanceMatch"]


def test_cross_asset_snapshot_rejected(rep_ondo, intent):
    rep_ondo.underlying_ticker = "TSLA"
    snap = MarketSnapshot(ticker="NVDA", data_label="RECORDED", representations=[rep_ondo])
    with pytest.raises(ValueError):
        build_decision(snap, intent, DecisionPolicy())


def test_rest_flow():
    from equitymux.api.main import app

    client = TestClient(app)
    response = client.post("/api/decisions", json={"text": "Buy $10 of NVDA"})
    assert response.status_code == 200
    receipt = response.json()
    assert client.post("/api/decisions/replay", json={"receipt": receipt}).json()["hashMatch"]
    revised = client.post(
        "/api/decisions/compare", json={"receipt": receipt, "policy": {"allowed_platforms": []}}
    )
    assert revised.status_code == 200
    assert revised.json()["receipt"]["decision"]["state"] == "NO_VALID_ROUTE"
    assert client.post("/api/decisions", json={"text": "Sell $10 of NVDA"}).status_code == 422
    assert client.post("/api/decisions/replay", json={"receipt": {}}).status_code == 422
