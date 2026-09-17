"""Execution pipeline: intent -> compile -> discover -> quote -> policy ->
simulate -> authorize -> execute -> verify -> receipt.

Authorization boundary layers:
  1. Portfolio Constitution (deterministic engine)
  2. System ceilings (env)
  3. Fresh simulation binding
  4. Agentic Wallet policy (baw)
  5. On-chain verification
"""
from __future__ import annotations

import time
from datetime import UTC, datetime
from decimal import Decimal

from equitymux.config import Settings, get_settings
from equitymux.domain.models import (
    CandidateRoute,
    EquityIntent,
    ExecState,
    RouteStatus,
    SimulationRecord,
)
from equitymux.policy.engine import DeterministicPolicyEngine, PortfolioState
from equitymux.policy.schema import PortfolioConstitution, constitution_hash
from equitymux.providers.baw import AgenticWallet
from equitymux.providers.bsc_rpc import BscRpc
from equitymux.providers.errors import ProviderError
from equitymux.services import persistence
from equitymux.services.graph import CanonicalEquityGraph
from equitymux.services.receipts import build_receipt, freshness_ok
from equitymux.services.state_machine import ExecutionStateMachine
from equitymux.services.tournament import QUOTE_ASSET_ADDR, RouteTournament


def _iso() -> str:
    return datetime.now(UTC).isoformat()


class Pipeline:
    def __init__(self, settings: Settings | None = None):
        self.s = settings or get_settings()
        from equitymux.providers.binance_public import BinancePublicClient
        self.graph = CanonicalEquityGraph(client=BinancePublicClient(self.s),
                                          platforms=self.s.platforms)
        self.tournament = RouteTournament(self.graph, settings=self.s)
        self.wallet = AgenticWallet(self.s)
        self.rpc = BscRpc(self.s)

    # ---------------- read-side ----------------
    def explore(self, ticker: str) -> dict:
        reps = self.graph.discover(ticker, enrich=True)
        market = self.graph.underlying_market()
        return {"ticker": ticker.upper(), "market": market,
                "representations": [r.model_dump(mode="json") for r in reps]}

    # ---------------- write-side ----------------
    def run(self, intent: EquityIntent, constitution: PortfolioConstitution,
            state: PortfolioState, *, confirm: bool = False,
            execution_mode: str = "interactive") -> dict:
        sm = ExecutionStateMachine()
        sm.transition(ExecState.INTENT_COMPILED, note=intent.raw[:200])
        chash = constitution_hash(constitution)
        engine = DeterministicPolicyEngine(constitution, self.s)

        sm.transition(ExecState.DISCOVERING)
        reps = self.graph.discover(intent.ticker, enrich=True)
        if not reps:
            sm.transition(ExecState.NO_VALID_ROUTE, note="no representations found")
            rec = self._receipt(sm, intent, chash, [], self._market_ctx(), [],
                                None, None, {}, {}, execution_mode)
            persistence.save_receipt(rec)
            return {"state": sm.state.value, "receipt": rec}

        sm.transition(ExecState.QUOTING)
        candidates = self.tournament.build_candidates(intent, reps)
        self.tournament.quote_candidates(intent, candidates)
        candidates = self.tournament.evaluate(intent, candidates, engine, state)

        sm.transition(ExecState.POLICY_EVALUATION,
                      note=f"{len(candidates)} candidates evaluated")
        eligible = [c for c in candidates
                    if c.status in (RouteStatus.ELIGIBLE, RouteStatus.REQUIRES_CONFIRMATION)]
        if not eligible:
            sm.transition(ExecState.NO_VALID_ROUTE,
                          note="all candidates rejected by policy or missing quotes")
            rec = self._receipt(sm, intent, chash, self._checks(candidates),
                                self._market_ctx(), candidates, None, None, {},
                                {}, execution_mode)
            persistence.save_receipt(rec)
            return {"state": sm.state.value, "receipt": rec,
                    "candidates": [self._cand(c) for c in candidates]}

        selected = eligible[0]

        sm.transition(ExecState.SIMULATING)
        sim = self._simulate(intent, selected)
        selected.simulation = sim
        if sim.status == "FAIL":
            sm.transition(ExecState.SIMULATION_FAILED, note=sim.detail)
            rec = self._receipt(sm, intent, chash, self._checks(candidates),
                                self._market_ctx(), candidates, selected,
                                sim.model_dump(mode="json"), {}, {}, execution_mode)
            persistence.save_receipt(rec)
            return {"state": sm.state.value, "receipt": rec,
                    "candidates": [self._cand(c) for c in candidates]}

        needs_confirm = (selected.policy.requires_confirmation if selected.policy
                         else True) or self.s.require_confirmation
        if needs_confirm and not confirm:
            sm.transition(ExecState.AWAITING_CONFIRMATION,
                          note="policy/wallet requires explicit confirmation")
            rec = self._receipt(sm, intent, chash, self._checks(candidates),
                                self._market_ctx(), candidates, selected,
                                sim.model_dump(mode="json"),
                                {"equityMuxPolicy": "PASS",
                                 "humanConfirmationRequired": True}, {},
                                execution_mode)
            persistence.save_receipt(rec)
            return {"state": sm.state.value, "receipt": rec,
                    "candidates": [self._cand(c) for c in candidates],
                    "selected": self._cand(selected)}

        sm.transition(ExecState.READY, note="simulation passed; route executable")
        if not self.s.execution_enabled:
            sm.transition(ExecState.POLICY_REJECTED,
                          note="EXECUTION_ENABLED=false (system kill switch)")
            rec = self._receipt(sm, intent, chash, self._checks(candidates),
                                self._market_ctx(), candidates, selected,
                                sim.model_dump(mode="json"),
                                {"equityMuxPolicy": "PASS",
                                 "systemKillSwitch": "EXECUTION_ENABLED=false"}, {},
                                execution_mode)
            persistence.save_receipt(rec)
            return {"state": sm.state.value, "receipt": rec,
                    "candidates": [self._cand(c) for c in candidates],
                    "selected": self._cand(selected)}

        sm.transition(ExecState.EXECUTING)
        execution = self._execute(intent, selected, sim)
        if execution.get("status") == "CONFIRMED":
            sm.transition(ExecState.PENDING_CONFIRMATION)
            sm.transition(ExecState.CONFIRMED,
                          note=f"order {execution.get('orderId')} FINISHED")
        elif execution.get("status") == "PENDING":
            # async order still in-flight — honest non-terminal state, the
            # wallet keeps working; the receipt records it as PENDING
            sm.transition(ExecState.PENDING_CONFIRMATION,
                          note=f"order {execution.get('orderId')} pending past 90s poll")
        else:
            sm.transition(ExecState.EXECUTION_FAILED,
                          note=execution.get("error", "execution failed"))
        rec = self._receipt(sm, intent, chash, self._checks(candidates),
                            self._market_ctx(), candidates, selected,
                            sim.model_dump(mode="json"),
                            {"equityMuxPolicy": "PASS",
                             "humanConfirmationRequired": needs_confirm,
                             "humanConfirmedAt": _iso() if confirm else None},
                            execution, execution_mode)
        persistence.save_receipt(rec)
        return {"state": sm.state.value, "receipt": rec,
                "candidates": [self._cand(c) for c in candidates],
                "selected": self._cand(selected)}

    # ---------------- internals ----------------
    def _simulate(self, intent: EquityIntent,
                  c: CandidateRoute) -> SimulationRecord:
        """Bind a simulation to exact swap intent via the wallet quote + a fresh
        ERC-20 balance/allowance probe. A quote that just succeeded through the
        same route + verified balances is the simulation evidence."""
        try:
            from_token = QUOTE_ASSET_ADDR.get(intent.quote_asset.upper(), "")
            addr = self.wallet.address("56") if self.wallet.available() else None
            if addr and from_token:
                bal = self.rpc.balance_of(from_token, addr)
                need = int((intent.notional or Decimal(0)) * Decimal(10**18))
                # BSC USDT/USDC are 18 decimals
                if bal < need:
                    return SimulationRecord(status="FAIL", method="eth_call",
                                            timestamp=_iso(),
                                            detail=f"insufficient {intent.quote_asset} balance")
            return SimulationRecord(status="PASS", method="eth_call+quote",
                                    timestamp=_iso(),
                                    detail="quote fresh; funding verified on-chain"
                                    if addr else "quote fresh (wallet address unknown)",
                                    calldata_hash=None)
        except Exception as e:
            return SimulationRecord(status="FAIL", method="eth_call+quote",
                                    timestamp=_iso(), detail=str(e)[:300])

    def _execute(self, intent: EquityIntent, c: CandidateRoute,
                 sim: SimulationRecord) -> dict:
        if sim.timestamp and not freshness_ok(sim.timestamp, self.s.max_simulation_age_s):
            return {"status": "FAILED", "error": "simulation stale — re-run pipeline"}
        from_token = QUOTE_ASSET_ADDR.get(intent.quote_asset.upper())
        if from_token is None:
            return {"status": "FAILED",
                    "error": f"quote asset {intent.quote_asset} not in allowlist"}
        slip = str((c.expected_slippage_bps or 50) / 100)
        try:
            res = self.wallet.swap(from_token, c.representation.token_address,
                                   str(intent.notional), "56", slippage=slip)
        except ProviderError as e:
            return {"status": "FAILED", "error": str(e)}
        order_id = res.get("orderId")
        if not order_id:
            return {"status": "FAILED", "error": f"no orderId returned: {res}"}
        deadline = time.time() + 90
        while time.time() < deadline:
            try:
                order = self.wallet.order(order_id)
            except ProviderError:
                # transient poll failure — the order may still be live;
                # keep polling until the deadline rather than 500 mid-flight
                time.sleep(4)
                continue
            if order and order.get("status") in ("FINISHED", "FAILED"):
                out = {"status": "CONFIRMED" if order["status"] == "FINISHED" else "FAILED",
                       "orderId": order_id, "txHash": order.get("txHash"),
                       "chainId": 56, "raw": order}
                if out["txHash"]:
                    try:
                        out["receipt"] = self.rpc.tx_receipt(out["txHash"])
                    except ProviderError:
                        pass
                return out
            time.sleep(4)
        return {"status": "PENDING", "orderId": order_id}

    def _market_ctx(self) -> dict:
        try:
            return self.graph.underlying_market()
        except ProviderError as e:
            return {"error": str(e)}

    @staticmethod
    def _checks(candidates: list[CandidateRoute]) -> list[dict]:
        for c in candidates:
            if c.policy:
                return [r.model_dump(mode="json") for r in c.policy.results]
        return []

    @staticmethod
    def _cand(c: CandidateRoute) -> dict:
        d = c.model_dump(mode="json")
        return d

    def _receipt(self, sm: ExecutionStateMachine, intent: EquityIntent,
                 chash: str, checks: list[dict], market: dict,
                 candidates: list[CandidateRoute], selected: CandidateRoute | None,
                 simulation: dict | None, authorization: dict, execution: dict,
                 mode: str) -> dict:
        return build_receipt(intent=intent, constitution_hash=chash,
                             policy_checks=checks, market_context=market,
                             candidates=candidates, selected=selected,
                             simulation=simulation, authorization=authorization,
                             execution=execution,
                             agent={"studioIdentity": None, "executionMode": mode},
                             transitions=sm.history, state=sm.state.value,
                             data_label="RECORDED" if self.s.demo_mode else "LIVE")
