import copy
from decimal import Decimal

from equitymux.services.receipts import build_receipt, receipt_hash
from tests.conftest import cand


def _receipt(rep_ondo, intent):
    c = cand(rep_ondo, premium=Decimal(12), slippage=Decimal(5))
    return build_receipt(
        intent=intent,
        constitution_hash="0xabc",
        policy_checks=[{"rule": "x", "status": "PASS"}],
        market_context={"marketState": "REGULAR"},
        candidates=[c],
        selected=c,
        simulation={"status": "PASS", "timestamp": "t"},
        authorization={"equityMuxPolicy": "PASS"},
        execution={"chainId": 56},
        agent={},
        transitions=[],
        state="READY",
    )


def test_receipt_hash_deterministic(rep_ondo, intent):
    r1 = _receipt(rep_ondo, intent)
    r2 = _receipt(rep_ondo, intent)
    r2["receiptId"] = r1["receiptId"]
    r2["createdAt"] = r1["createdAt"]
    assert receipt_hash(r1) == receipt_hash(r2)


def test_receipt_hash_tamper_evident(rep_ondo, intent):
    r = _receipt(rep_ondo, intent)
    tampered = copy.deepcopy(r)
    tampered["execution"]["txHash"] = "0xdead"
    assert receipt_hash(r) != receipt_hash(tampered)


def test_receipt_has_no_secrets(rep_ondo, intent):
    r = _receipt(rep_ondo, intent)
    blob = str(r).lower()
    for bad in ("private", "secret", "password", "seed", "mnemonic", "api_key"):
        assert bad not in blob


def test_candidate_view_shape(rep_ondo, intent):
    r = _receipt(rep_ondo, intent)
    c = r["candidates"][0]
    for k in ("platform", "tokenAddress", "premiumBps", "marketState", "status", "reasonCodes", "score"):
        assert k in c


def test_candidate_view_carries_reference_provenance(rep_ondo, intent):
    rep_ondo.reference_price_source = "peer:xstocks"
    r = _receipt(rep_ondo, intent)
    assert r["candidates"][0]["referencePriceSource"] == "peer:xstocks"


def test_data_label_inside_hashed_body(rep_ondo, intent):
    """dataLabel must be hash-bound — appended post-hash breaks verification."""
    live = _receipt(rep_ondo, intent)
    recorded = _receipt(rep_ondo, intent)
    recorded["receiptId"], recorded["createdAt"] = live["receiptId"], live["createdAt"]
    assert live["dataLabel"] == "LIVE"
    assert receipt_hash(live) != receipt_hash({**recorded, "dataLabel": "RECORDED"})
