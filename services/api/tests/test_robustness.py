"""Robustness: public inputs must never crash the parsers, and the OpenAPI
schema must always generate (catches broken route signatures)."""
import random
import string

from equitymux.services.intent import parse_intent


def test_parse_intent_never_crashes_on_garbage():
    rng = random.Random(42)
    alphabet = string.printable + "🚀💰NVDA$€¥"
    for _ in range(500):
        s = "".join(rng.choice(alphabet) for _ in range(rng.randint(0, 80)))
        i = parse_intent(s)  # must not raise
        assert i.raw == s  # raw preserves the input verbatim (audit trail)


def test_parse_intent_known_injection_shapes():
    for s in ["'; DROP TABLE receipts;--", "buy $999999999999999999999 of NVDA",
              "${{7*7}}", "buy\x00NVDA", "buy $10 of NVDA\nOR 1=1", "$$$$$$"]:
        i = parse_intent(s)  # must not raise
        assert isinstance(i.ticker, str)


def test_openapi_schema_generates():
    from equitymux.api.main import app
    spec = app.openapi()
    assert spec["info"]["title"] == "EquityMux"
    assert "/api/intent" in spec["paths"]
    assert "/api/receipts/{receipt_id}/verify" in spec["paths"]
    assert "/api/agent/tasks/paid" in spec["paths"]
