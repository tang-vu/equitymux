"""Layer B: deterministic policy engine.

Input: typed constitution + current state + candidate route.
Output: PASS / FAIL / REQUIRES_CONFIRMATION per rule — fully explainable.

The engine also applies system-level ceilings from Settings; a permissive
constitution can never exceed them.
"""
from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel

from equitymux.config import Settings, get_settings
from equitymux.domain.mathx import dec
from equitymux.domain.models import (
    CandidateRoute,
    EquityIntent,
    MarketState,
    PolicyEvaluation,
    RuleResult,
)
from equitymux.policy.schema import PortfolioConstitution, constitution_hash


class PortfolioState(BaseModel):
    quote_asset: str = "USDC"
    quote_balance: Decimal = Decimal(0)
    total_value_usd: Decimal = Decimal(0)
    underlying_exposure_usd: dict[str, Decimal] = {}
    platform_exposure_usd: dict[str, Decimal] = {}
    autonomous_spent_today_usd: Decimal = Decimal(0)


class DeterministicPolicyEngine:
    def __init__(self, constitution: PortfolioConstitution, settings: Settings | None = None):
        self.c = constitution
        self.s = settings or get_settings()

    def evaluate(self, intent: EquityIntent, candidate: CandidateRoute,
                 state: PortfolioState) -> PolicyEvaluation:
        r: list[RuleResult] = []
        rep = candidate.representation

        # ---- system ceilings (always on) ----
        notional = intent.notional or Decimal(0)
        sys_max = dec(self.s.max_mainnet_notional_usd) or Decimal(0)
        if notional > sys_max:
            r.append(RuleResult(rule="system.max_notional", status="FAIL",
                                detail=f"notional ${notional} exceeds system ceiling ${sys_max}"))
        if rep.chain_id not in self.s.chain_ids:
            r.append(RuleResult(rule="system.chain_id", status="FAIL",
                                detail=f"chainId {rep.chain_id} not in ALLOWED_CHAIN_IDS"))
        if rep.platform.value not in self.s.platforms:
            r.append(RuleResult(rule="system.platform", status="FAIL",
                                detail=f"platform {rep.platform.value} not in ALLOWED_TOKEN_PLATFORMS"))
        if intent.quote_asset.upper() not in self.s.quote_assets:
            r.append(RuleResult(rule="system.quote_asset", status="FAIL",
                                detail=f"{intent.quote_asset} not in ALLOWED_QUOTE_ASSETS"))

        # ---- reserve ----
        if self.c.reserve.min_quote_reserve is not None:
            remaining = state.quote_balance - notional
            ok = remaining >= self.c.reserve.min_quote_reserve
            r.append(RuleResult(
                rule="reserve.min_quote_reserve", status="PASS" if ok else "FAIL",
                detail=f"spend ${notional} leaves ${remaining} {state.quote_asset}; "
                       f"minimum ${self.c.reserve.min_quote_reserve}"))

        # ---- concentration ----
        pct = self.c.concentration.max_single_underlying_pct
        if pct is not None and state.total_value_usd > 0:
            after = state.underlying_exposure_usd.get(rep.underlying_ticker, Decimal(0)) + notional
            share = after / state.total_value_usd * 100
            ok = share <= pct
            r.append(RuleResult(rule="concentration.max_single_underlying",
                                status="PASS" if ok else "FAIL",
                                detail=f"{rep.underlying_ticker} would be {share:.1f}% of portfolio; max {pct}%"))

        # ---- execution limits ----
        if self.c.execution.max_notional_usd is not None and notional > self.c.execution.max_notional_usd:
            r.append(RuleResult(rule="execution.max_notional", status="FAIL",
                                detail=f"notional ${notional} exceeds constitution max ${self.c.execution.max_notional_usd}"))

        if candidate.premium_bps is not None:
            cap = self.c.execution.max_premium_bps
            closed_cap = self.c.market_hours.max_premium_bps_when_closed
            if rep.market_state in (MarketState.CLOSED, MarketState.EXTENDED) and closed_cap is not None:
                cap = min(cap, closed_cap) if cap is not None else closed_cap
            hard = Decimal(self.s.max_premium_bps_hard)
            cap = min(cap, hard) if cap is not None else hard
            if candidate.premium_bps > cap:
                r.append(RuleResult(rule="execution.max_premium", status="FAIL",
                                    detail=f"premium {candidate.premium_bps:.1f} bps exceeds {cap} bps cap"))
            else:
                r.append(RuleResult(rule="execution.max_premium", status="PASS",
                                    detail=f"premium {candidate.premium_bps:.1f} bps within {cap} bps cap"))

        if candidate.expected_slippage_bps is not None:
            cap = self.c.execution.max_slippage_bps
            hard = Decimal(self.s.max_slippage_bps_hard)
            cap = min(cap, hard) if cap is not None else hard
            if candidate.expected_slippage_bps > cap:
                r.append(RuleResult(rule="execution.max_slippage", status="FAIL",
                                    detail=f"slippage {candidate.expected_slippage_bps} bps exceeds {cap} bps"))
            else:
                r.append(RuleResult(rule="execution.max_slippage", status="PASS",
                                    detail=f"slippage {candidate.expected_slippage_bps} bps within {cap} bps"))

        # ---- representation rules ----
        if rep.platform.value not in [p.lower() for p in self.c.representation.allowed_platforms]:
            r.append(RuleResult(rule="representation.allowed_platforms", status="FAIL",
                                detail=f"{rep.platform.value} not in allowed platforms {self.c.representation.allowed_platforms}"))
        if self.c.representation.allowed_contracts:
            if rep.token_address.lower() not in [a.lower() for a in self.c.representation.allowed_contracts]:
                r.append(RuleResult(rule="representation.allowed_contracts", status="FAIL",
                                    detail=f"{rep.token_address} is not an approved contract"))
        if self.c.representation.require_attestation and not rep.attestation.supported:
            r.append(RuleResult(rule="representation.require_attestation", status="FAIL",
                                detail="no attestation evidence available"))
        if self.c.representation.require_security_audit:
            if not (rep.audit and rep.audit.get("hasResult") and rep.audit.get("isSupported")):
                r.append(RuleResult(rule="representation.require_security_audit", status="FAIL",
                                    detail="security audit unavailable or unsupported for this token"))

        # ---- market hours ----
        if rep.market_state == MarketState.HALTED and self.c.market_hours.block_when_halted:
            r.append(RuleResult(rule="market_hours.block_when_halted", status="FAIL",
                                detail=f"asset halted ({rep.market_reason_code}: {rep.market_reason_msg or 'n/a'})"))
        if rep.market_state == MarketState.CLOSED:
            if not self.c.market_hours.allow_when_closed:
                r.append(RuleResult(rule="market_hours.allow_when_closed", status="FAIL",
                                    detail="constitution forbids trading while underlying market is closed"))
            elif self.c.market_hours.confirm_when_closed:
                r.append(RuleResult(rule="market_hours.confirm_when_closed",
                                    status="REQUIRES_CONFIRMATION",
                                    detail="underlying market is closed — explicit confirmation required"))
        if rep.market_state == MarketState.EXTENDED and not self.c.market_hours.allow_extended_hours:
            r.append(RuleResult(rule="market_hours.allow_extended_hours", status="FAIL",
                                detail=f"extended-hours session ({rep.market_reason_code}) not allowed"))

        # ---- reference freshness ----
        if self.c.reference.require_reference_price and rep.reference_price_usd is None:
            r.append(RuleResult(rule="reference.require_reference_price", status="FAIL",
                                detail="no reference price for underlying"))
        max_age = self.c.reference.max_reference_age_s or self.s.max_reference_age_s
        if candidate.reference_age_s is not None and candidate.reference_age_s > max_age:
            r.append(RuleResult(rule="reference.max_age", status="FAIL",
                                detail=f"reference age {candidate.reference_age_s}s exceeds {max_age}s"))

        # ---- simulation requirement ----
        if self.c.execution.require_simulation or self.s.require_simulation:
            sim = candidate.simulation
            if sim is None:
                r.append(RuleResult(rule="execution.require_simulation",
                                    status="REQUIRES_CONFIRMATION",
                                    detail="simulation not yet performed"))
            elif sim.status == "FAIL":
                r.append(RuleResult(rule="execution.require_simulation", status="FAIL",
                                    detail=f"simulation failed: {sim.detail}"))

        # ---- confirmation thresholds ----
        if self.c.confirmation.always_confirm:
            r.append(RuleResult(rule="confirmation.always", status="REQUIRES_CONFIRMATION",
                                detail="constitution requires confirmation for every transaction"))
        elif self.c.confirmation.confirm_above_usd is not None and notional > self.c.confirmation.confirm_above_usd:
            r.append(RuleResult(rule="confirmation.threshold", status="REQUIRES_CONFIRMATION",
                                detail=f"notional ${notional} exceeds confirmation threshold ${self.c.confirmation.confirm_above_usd}"))
        if self.s.require_confirmation:
            r.append(RuleResult(rule="system.require_confirmation", status="REQUIRES_CONFIRMATION",
                                detail="system flag REQUIRE_CONFIRMATION=true"))

        fails = [x for x in r if x.status == "FAIL"]
        confirms = [x for x in r if x.status == "REQUIRES_CONFIRMATION"]
        return PolicyEvaluation(
            constitution_hash=constitution_hash(self.c),
            results=r,
            eligible=not fails,
            requires_confirmation=bool(confirms),
        )
