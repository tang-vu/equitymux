"""API-surface tests: receipt verification + x402 challenge — TestClient, offline."""
import json
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from equitymux.config import Settings


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.setenv("EXECUTION_ENABLED", "false")
    monkeypatch.setenv("X402_PAYTO_ADDRESS", "0x1111111111111111111111111111111111111111")
    from equitymux.config import get_settings
    get_settings.cache_clear()
    import equitymux.api.main as m
    monkeypatch.setattr(m, "settings", Settings(
        demo_mode=True, x402_payto_address="0x1111111111111111111111111111111111111111"))
    import equitymux.services.persistence as p
    monkeypatch.setattr(p, "_DB", tmp_path / "test.db")
    p.init_db()
    return TestClient(m.app)


def test_receipt_verify_endpoint(api_client, rep_ondo, intent):
    from equitymux.services.receipts import build_receipt
    from tests.conftest import cand
    c = cand(rep_ondo, premium=Decimal(12), slippage=Decimal(5))
    rec = build_receipt(intent=intent, constitution_hash="0xabc",
                        policy_checks=[], market_context={}, candidates=[c],
                        selected=c, simulation=None, authorization={},
                        execution={}, agent={}, transitions=[], state="READY")
    r = api_client.post("/api/receipts/verify", json={"receipt": rec})
    assert r.status_code == 200
    assert r.json()["match"] is True


def test_receipt_verify_detects_tamper(api_client, rep_ondo, intent):
    from equitymux.services.receipts import build_receipt
    from tests.conftest import cand
    c = cand(rep_ondo, premium=Decimal(12), slippage=Decimal(5))
    rec = build_receipt(intent=intent, constitution_hash="0xabc",
                        policy_checks=[], market_context={}, candidates=[c],
                        selected=c, simulation=None, authorization={},
                        execution={"txHash": "0xabc"}, agent={}, transitions=[],
                        state="CONFIRMED")
    rec["execution"]["txHash"] = "0xdeadbeef"
    r = api_client.post("/api/receipts/verify", json={"receipt": rec})
    assert r.status_code == 200
    assert r.json()["match"] is False


def test_receipt_verify_requires_hash(api_client):
    r = api_client.post("/api/receipts/verify", json={"receipt": {"foo": 1}})
    assert r.status_code == 400


def test_x402_challenge_shape(api_client):
    r = api_client.post("/api/agent/tasks/paid",
                        json={"kind": "EVALUATE_EQUITY_INTENT",
                              "input": {"ticker": "NVDA"}})
    assert r.status_code == 402
    body = r.json()
    assert body["x402Version"] == 1
    acc = body["accepts"][0]
    assert acc["scheme"] == "exact" and acc["network"] == "bsc"
    assert acc["payTo"] == "0x1111111111111111111111111111111111111111"


def test_x402_501_without_payto(api_client, monkeypatch):
    import equitymux.api.main as m
    monkeypatch.setattr(m.settings, "x402_payto_address", "")
    r = api_client.post("/api/agent/tasks/paid",
                        json={"kind": "X", "input": {}})
    assert r.status_code == 501


def test_keeper_task_evaluate_intent_happy_path(api_client):
    r = api_client.post("/api/agent/tasks",
                        json={"kind": "EVALUATE_EQUITY_INTENT",
                              "input": {"ticker": "NVDA", "notional": "10"}})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "SUCCEEDED"
    cands = body["output"]["candidates"]
    assert len(cands) >= 1
    assert {c["platform"] for c in cands} <= {"ondo", "xstocks", "bstock"}
    assert body["output"]["note"] == "analysis only — no execution authority"


def test_keeper_task_unsupported_kind_fails_honestly(api_client):
    r = api_client.post("/api/agent/tasks",
                        json={"kind": "DO_A_CRIME", "input": {}})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "FAILED"
    assert "unsupported task kind" in body["output"]["error"]


def test_keeper_task_bad_input_no_orphan(api_client):
    """Malformed input must return 4xx AND mark the task row FAILED."""
    r = api_client.post("/api/agent/tasks",
                        json={"kind": "EVALUATE_EQUITY_INTENT",
                              "input": {"ticker": "NVDA", "notional": "garbage"}})
    assert r.status_code == 400
    tasks = api_client.get("/api/agent/tasks").json()["tasks"]
    assert tasks[0]["status"] == "FAILED"
    out = json.loads(tasks[0]["output_json"])
    assert "error" in out


def test_underlyings_index_endpoint(api_client):
    r = api_client.get("/api/underlyings")
    assert r.status_code == 200
    idx = r.json()["underlyings"]
    nvda = next(e for e in idx if e["ticker"] == "NVDA")
    assert nvda["count"] >= 1 and nvda["platforms"]


def test_explore_labels_recorded(api_client):
    r = api_client.get("/api/explore/NVDA")
    assert r.status_code == 200
    body = r.json()
    assert body["dataLabel"] == "RECORDED"
    reps = body["representations"]
    assert len(reps) >= 1
    for rep in reps:
        # provenance must be present on every representation
        assert "reference_price_source" in rep


def test_health_endpoint(api_client):
    r = api_client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["demoMode"] is True
    # service fingerprint — lets the web proxy detect a wrong backend
    assert body["service"] == "equitymux-api"
