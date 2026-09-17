from decimal import Decimal

from equitymux.policy.compiler import compile_policy, compile_with_report, uncovered_fragments
from equitymux.policy.schema import constitution_hash, canonical_json, PortfolioConstitution

TEXT = """
My Constitution:
Never spend my last $100 USDC.
Never put more than 20% of the portfolio into one company.
Never pay more than 50 basis points over reference price.
Maximum expected slippage 30 basis points.
Every transaction must simulate successfully.
When the underlying stock market is closed, maximum premium is 20 basis points.
Reject stale reference data older than 10 minutes.
Only trade approved platforms: ondo and bstocks.
Never execute unknown contract addresses.
Ask me before any transaction over $100.
Autonomous rebalances may spend at most $50 per day.
"""


def test_full_example_compiles():
    c, applied = compile_policy(TEXT)
    assert c.reserve.min_quote_reserve == Decimal("100")
    assert c.concentration.max_single_underlying_pct == Decimal("20")
    assert c.execution.max_premium_bps == Decimal("50")
    assert c.execution.max_slippage_bps == Decimal("30")
    assert c.execution.require_simulation is True
    assert c.market_hours.max_premium_bps_when_closed == Decimal("20")
    assert c.reference.max_reference_age_s == 600
    assert set(c.representation.allowed_platforms) == {"ondo", "bstock"}
    assert c.representation.require_security_audit is True
    assert c.confirmation.confirm_above_usd == Decimal("100")
    assert c.automation.max_autonomous_daily_usd == Decimal("50")
    assert len(applied) >= 10


def test_uncompiled_sentences_reported():
    report = compile_with_report("Buy the dip aggressively. Never spend my last $50 USDC.")
    assert any("Buy the dip" in s for s in report["uncompiledSentences"])
    assert report["constitution"]["reserve"]["min_quote_reserve"] in ("50", "50.0")


def test_hash_stable_and_canonical():
    c, _ = compile_policy(TEXT)
    h1 = constitution_hash(c)
    h2 = constitution_hash(PortfolioConstitution.model_validate(c.model_dump(mode="json")))
    assert h1 == h2 and h1.startswith("0x") and len(h1) == 66


def test_hash_changes_on_edit():
    c1 = PortfolioConstitution()
    c2 = PortfolioConstitution(execution={"max_premium_bps": Decimal("1")})
    assert constitution_hash(c1) != constitution_hash(c2)


def test_canonical_json_sorted():
    a = canonical_json({"b": 1, "a": 2})
    assert a == '{"a":2,"b":1}'
