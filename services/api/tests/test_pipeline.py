"""Pipeline end-to-end: state transitions must stay inside the declared
state machine, on every path — including eligible candidates.

Regression: QUOTING -> SIMULATING used to skip POLICY_EVALUATION and crash
with InvalidTransition once any candidate survived evaluation.
"""

from decimal import Decimal

from equitymux.domain.models import (
    EquityIntent,
    ExecutableQuote,
    RouteStatus,
    Side,
    SimulationRecord,
)
from equitymux.services.pipeline import Pipeline, _iso


def _attach_quote(intent, candidates):
    from equitymux.services.tournament import QUOTE_ASSET_ADDR

    for c in candidates:
        c.quote = ExecutableQuote(
            from_token=QUOTE_ASSET_ADDR["USDC"],
            to_token=c.representation.token_address,
            from_symbol="USDC",
            to_symbol=c.representation.token_symbol,
            from_amount=intent.notional or Decimal(10),
            to_amount=Decimal("0.05"),
            slippage_bps=30,
            obtained_at=_iso(),
            source="test",
            raw={},
        )


def _stub_sim(intent, c):
    return SimulationRecord(status="PASS", method="test", timestamp=_iso(), detail="stub simulation")


def test_eligible_path_reaches_kill_switch(settings, rep_ondo, intent, state, constitution):
    p = Pipeline(settings)
    p.graph.discover = lambda ticker, enrich=True: [rep_ondo]
    p.tournament.quote_candidates = _attach_quote
    p._simulate = _stub_sim

    result = p.run(intent, constitution, state, confirm=True)
    assert result["state"] == "POLICY_REJECTED"  # EXECUTION_ENABLED=false
    states = [t["state"] for t in result["receipt"]["transitions"]]
    # legal path: QUOTING -> POLICY_EVALUATION -> SIMULATING -> POLICY_REJECTED
    assert states.index("QUOTING") < states.index("POLICY_EVALUATION") < states.index("SIMULATING")


def test_no_notional_marks_no_quote_not_eligible(settings, rep_ondo, state, constitution):
    p = Pipeline(settings)
    p.graph.discover = lambda ticker, enrich=True: [rep_ondo]
    intent = EquityIntent(
        raw="buy NVDA exposure", ticker="NVDA", side=Side.BUY, notional=None, quote_asset="USDC"
    )
    result = p.run(intent, constitution, state)
    assert result["state"] == "NO_VALID_ROUTE"
    cand = result["candidates"][0]
    assert cand["status"] == RouteStatus.NO_QUOTE.value
    assert "NO_NOTIONAL" in cand["reason_codes"]

    sell = EquityIntent(
        raw="sell NVDA", ticker="NVDA", side=Side.SELL, notional=Decimal(10), quote_asset="USDC"
    )
    r2 = p.run(sell, constitution, state)
    assert "SELL_UNIMPLEMENTED" in r2["candidates"][0]["reason_codes"]


def test_no_representations_terminal(settings, intent, state, constitution):
    p = Pipeline(settings)
    p.graph.discover = lambda ticker, enrich=True: []
    result = p.run(intent, constitution, state)
    assert result["state"] == "NO_VALID_ROUTE"
    assert result["receipt"]["receiptHash"].startswith("0x")
