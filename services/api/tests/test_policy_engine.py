from decimal import Decimal

from equitymux.domain.models import (
    EquityIntent,
    MarketState,
    SimulationRecord,
)
from equitymux.policy.engine import DeterministicPolicyEngine, PortfolioState
from equitymux.policy.schema import PortfolioConstitution
from tests.conftest import cand

BASE_STATE = PortfolioState(quote_balance=Decimal(100),
                            total_value_usd=Decimal(200))


def eng(**kw):
    return DeterministicPolicyEngine(PortfolioConstitution(**kw),
                                     __import__("equitymux.config", fromlist=["Settings"])
                                     .Settings(demo_mode=True))


def intent(notional="10"):
    return EquityIntent(raw="t", ticker="NVDA", notional=Decimal(notional),
                        quote_asset="USDC")


class TestReserve:
    def test_passes_when_reserve_kept(self, rep_ondo):
        e = eng(reserve={"min_quote_reserve": Decimal(50)})
        ev = e.evaluate(intent("10"), cand(rep_ondo, premium=10, slippage=10), BASE_STATE)
        r = next(x for x in ev.results if x.rule == "reserve.min_quote_reserve")
        assert r.status == "PASS"

    def test_fails_when_reserve_breached(self, rep_ondo):
        e = eng(reserve={"min_quote_reserve": Decimal(50)})
        ev = e.evaluate(intent("60"), cand(rep_ondo, premium=10), BASE_STATE)
        r = next(x for x in ev.results if x.rule == "reserve.min_quote_reserve")
        assert r.status == "FAIL"
        assert not ev.eligible


class TestPremium:
    def test_premium_within_cap(self, rep_ondo):
        e = eng(execution={"max_premium_bps": Decimal(40)})
        ev = e.evaluate(intent(), cand(rep_ondo, premium=20), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "execution.max_premium").status == "PASS"

    def test_premium_over_cap_fails(self, rep_ondo):
        e = eng(execution={"max_premium_bps": Decimal(40)})
        ev = e.evaluate(intent(), cand(rep_ondo, premium=62), BASE_STATE)
        r = next(x for x in ev.results if x.rule == "execution.max_premium")
        assert r.status == "FAIL"
        assert "62" in r.detail

    def test_closed_market_uses_tighter_cap(self, rep_xstocks):
        e = eng(execution={"max_premium_bps": Decimal(40)},
                market_hours={"max_premium_bps_when_closed": Decimal(20)})
        ev = e.evaluate(intent(), cand(rep_xstocks, premium=30), BASE_STATE)
        r = next(x for x in ev.results if x.rule == "execution.max_premium")
        assert r.status == "FAIL" and "20" in r.detail


class TestSlippage:
    def test_slippage_cap(self, rep_ondo):
        e = eng(execution={"max_slippage_bps": Decimal(30)})
        ev = e.evaluate(intent(), cand(rep_ondo, slippage=45), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "execution.max_slippage").status == "FAIL"


class TestConcentration:
    def test_concentration_fail(self, rep_ondo):
        e = eng(concentration={"max_single_underlying_pct": Decimal(20)})
        st = PortfolioState(quote_balance=Decimal(500), total_value_usd=Decimal(100),
                            underlying_exposure_usd={"NVDA": Decimal(15)})
        ev = e.evaluate(intent("10"), cand(rep_ondo), st)
        assert next(x for x in ev.results if "concentration" in x.rule).status == "FAIL"


class TestMarketHours:
    def test_closed_requires_confirm(self, rep_xstocks):
        e = eng()
        ev = e.evaluate(intent(), cand(rep_xstocks), BASE_STATE)
        r = next(x for x in ev.results if x.rule == "market_hours.confirm_when_closed")
        assert r.status == "REQUIRES_CONFIRMATION" and ev.requires_confirmation

    def test_closed_blocked_when_disallowed(self, rep_xstocks):
        e = eng(market_hours={"allow_when_closed": False})
        ev = e.evaluate(intent(), cand(rep_xstocks), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "market_hours.allow_when_closed").status == "FAIL"

    def test_halted_blocked(self, rep_ondo):
        rep_ondo.market_state = MarketState.HALTED
        rep_ondo.market_reason_code = "ASSET_PAUSED"
        rep_ondo.market_reason_msg = "stock_split"
        e = eng()
        ev = e.evaluate(intent(), cand(rep_ondo), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "market_hours.block_when_halted").status == "FAIL"
        assert "stock_split" in ev.results[0].detail or any("stock_split" in x.detail for x in ev.results)


class TestStaleness:
    def test_stale_reference_fails(self, rep_ondo):
        e = eng(reference={"max_reference_age_s": 60})
        ev = e.evaluate(intent(), cand(rep_ondo, age=300), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "reference.max_age").status == "FAIL"

    def test_missing_reference_fails(self, rep_ondo):
        rep_ondo.reference_price_usd = None
        e = eng()
        ev = e.evaluate(intent(), cand(rep_ondo), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "reference.require_reference_price").status == "FAIL"


class TestRepresentation:
    def test_platform_not_allowed(self, rep_xstocks):
        e = eng(representation={"allowed_platforms": ["ondo"]})
        ev = e.evaluate(intent(), cand(rep_xstocks), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "representation.allowed_platforms").status == "FAIL"

    def test_contract_not_allowed(self, rep_ondo):
        e = eng(representation={"allowed_contracts": ["0xdead"]})
        ev = e.evaluate(intent(), cand(rep_ondo), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "representation.allowed_contracts").status == "FAIL"

    def test_attestation_required(self, rep_ondo):
        rep_ondo.attestation.supported = False
        e = eng(representation={"require_attestation": True})
        ev = e.evaluate(intent(), cand(rep_ondo), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "representation.require_attestation").status == "FAIL"


class TestSimulation:
    def test_failed_sim_fails(self, rep_ondo):
        c = cand(rep_ondo)
        c.simulation = SimulationRecord(status="FAIL", method="eth_call",
                                        timestamp="2026-01-01T00:00:00Z", detail="revert")
        e = eng()
        ev = e.evaluate(intent(), c, BASE_STATE)
        assert next(x for x in ev.results if x.rule == "execution.require_simulation").status == "FAIL"


class TestSystemCeilings:
    def test_system_notional_cap_beats_constitution(self, rep_ondo):
        e = eng(execution={"max_notional_usd": Decimal(500)})
        ev = e.evaluate(intent("30"), cand(rep_ondo), BASE_STATE)  # system default 25
        assert next(x for x in ev.results if x.rule == "system.max_notional").status == "FAIL"
        assert not ev.eligible

    def test_wrong_chain_fails(self, rep_ondo):
        rep_ondo.chain_id = 1
        e = eng()
        ev = e.evaluate(intent(), cand(rep_ondo), BASE_STATE)
        assert next(x for x in ev.results if x.rule == "system.chain_id").status == "FAIL"


class TestConfirmation:
    def test_confirm_above_threshold(self, rep_ondo):
        e = eng(confirmation={"confirm_above_usd": Decimal(5)})
        ev = e.evaluate(intent("10"), cand(rep_ondo), BASE_STATE)
        assert ev.requires_confirmation


def test_eligible_route(rep_ondo):
    e = eng(execution={"max_premium_bps": Decimal(50), "max_slippage_bps": Decimal(50)})
    c = cand(rep_ondo, premium=10, slippage=10)
    from equitymux.domain.models import SimulationRecord
    c.simulation = SimulationRecord(status="PASS", method="x", timestamp="t")
    ev = e.evaluate(intent(), c, BASE_STATE)
    assert ev.eligible
    assert ev.constitution_hash.startswith("0x")
