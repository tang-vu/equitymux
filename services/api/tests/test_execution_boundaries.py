from datetime import UTC, datetime, timedelta
from decimal import Decimal

from equitymux.domain.models import SimulationRecord
from equitymux.policy.engine import DeterministicPolicyEngine
from equitymux.services.pipeline import Pipeline
from equitymux.services.receipts import freshness_ok
from tests.conftest import cand


def test_quote_is_not_a_simulation(settings, intent, rep_ondo):
    sim = Pipeline(settings)._simulate(intent, cand(rep_ondo))
    assert sim.status == "SKIP" and sim.calldata_hash is None


def test_direct_execution_cannot_bypass_kill_switch(settings, intent, rep_ondo):
    p = Pipeline(settings)
    p.wallet.swap = lambda *a, **kw: (_ for _ in ()).throw(AssertionError("must not sign"))
    sim = SimulationRecord(status="PASS", method="test", timestamp=datetime.now(UTC).isoformat())
    assert p._execute(intent, cand(rep_ondo), sim)["status"] == "FAILED"


def test_future_simulation_is_not_fresh():
    assert not freshness_ok((datetime.now(UTC) + timedelta(days=1)).isoformat(), 60)


def test_intent_cannot_loosen_or_bypass_policy(settings, intent, rep_ondo, state, constitution):
    intent.constraints = {"maxPremiumBps": 5, "maxSlippageBps": 10}
    ev = DeterministicPolicyEngine(constitution, settings).evaluate(intent, cand(rep_ondo, 20, 20), state)
    assert {r.rule for r in ev.results if r.status == "FAIL"} >= {
        "execution.max_premium",
        "execution.max_slippage",
    }


def test_platform_and_daily_limits(settings, intent, rep_ondo, state, constitution):
    constitution.concentration.max_single_platform_pct = Decimal(2)
    constitution.automation.max_autonomous_daily_usd = Decimal(5)
    ev = DeterministicPolicyEngine(constitution, settings).evaluate(intent, cand(rep_ondo), state)
    assert {r.rule for r in ev.results if r.status == "FAIL"} >= {
        "concentration.max_single_platform",
        "automation.max_daily",
    }


def test_simulation_preserves_sender_value_and_block(monkeypatch):
    from equitymux.providers.bsc_rpc import BscRpc

    rpc = BscRpc()
    calls = []
    rpc.block_number = lambda: 42

    def call(method, params):
        calls.append((method, params))
        return "0x"

    rpc._call = call
    rpc.simulate_call("0xabc", "0x1234", value_wei=100, from_addr="0xdef")
    assert calls == [
        ("eth_call", [{"to": "0xabc", "data": "0x1234", "value": "0x64", "from": "0xdef"}, "0x2a"])
    ]
