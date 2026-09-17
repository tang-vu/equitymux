from decimal import Decimal

from equitymux.domain.models import RouteStatus, SimulationRecord
from equitymux.policy.engine import DeterministicPolicyEngine, PortfolioState
from equitymux.policy.schema import PortfolioConstitution
from equitymux.services.tournament import RouteTournament
from tests.conftest import cand


def test_candidates_get_premium_bps(intent, rep_ondo):
    t = RouteTournament.__new__(RouteTournament)
    t.graph = type("G", (), {"reference_age_seconds": lambda s, r: 5})()
    out = t.build_candidates(intent, [rep_ondo])
    assert out[0].premium_bps is not None
    # implied share ~180.19 vs ref 180.20 -> slight discount, small |bps|
    assert abs(out[0].premium_bps) < Decimal("10")


def test_rejected_route_not_eligible(intent, rep_ondo, rep_bstock):
    t = RouteTournament.__new__(RouteTournament)
    c1 = cand(rep_ondo, premium=10, slippage=5)
    c2 = cand(rep_bstock, premium=500, slippage=5)  # way over cap
    c1.simulation = SimulationRecord(status="PASS", method="m", timestamp="t")
    c2.simulation = SimulationRecord(status="PASS", method="m", timestamp="t")
    engine = DeterministicPolicyEngine(PortfolioConstitution(
        execution={"max_premium_bps": Decimal("40")}))
    # stub scoring deps
    t.s = engine.s
    out = t.evaluate(intent, [c1, c2], engine,
                     PortfolioState(quote_balance=Decimal("100")))
    by_sym = {c.representation.token_symbol: c for c in out}
    assert by_sym["NVDAB"].status == RouteStatus.REJECTED
    assert "execution.max_premium" in by_sym["NVDAB"].reason_codes


def test_scoring_prefers_cheaper(intent, rep_ondo, rep_bstock):
    t = RouteTournament.__new__(RouteTournament)
    t.s = __import__("equitymux.config", fromlist=["Settings"]).Settings(demo_mode=True)
    c1 = cand(rep_ondo, premium=5, slippage=5)
    c2 = cand(rep_bstock, premium=30, slippage=30)
    for c in (c1, c2):
        c.simulation = SimulationRecord(status="PASS", method="m", timestamp="t")
    engine = DeterministicPolicyEngine(PortfolioConstitution(
        execution={"max_premium_bps": Decimal("100"),
                   "max_slippage_bps": Decimal("100")}))
    out = t.evaluate(intent, [c2, c1], engine,
                     PortfolioState(quote_balance=Decimal("100")))
    assert out[0].representation.token_symbol == "NVDAon"
    assert out[0].score > out[1].score


def test_closed_market_candidate_flagged(intent, rep_xstocks):
    t = RouteTournament.__new__(RouteTournament)
    t.graph = type("G", (), {"reference_age_seconds": lambda s, r: 9999})()
    c = t.build_candidates(intent, [rep_xstocks])[0]
    assert "MARKET_CLOSED_REFERENCE_IS_LAST_CLOSE" in c.reason_codes
