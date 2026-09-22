"""Portfolio Constitution — typed policy schema.

Layer A (compiler) produces this JSON from natural language.
Layer B (engine) evaluates it deterministically. The LLM may propose a
constitution; it may never bypass the engine.
"""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

POLICY_COMPILER_VERSION = "equitymux-policy-compiler/1.0"


class ReserveRules(BaseModel):
    min_quote_reserve: Decimal | None = None  # e.g. keep >= $50 USDC
    quote_asset: str = "USDC"


class ConcentrationRules(BaseModel):
    max_single_underlying_pct: Decimal | None = None  # % of portfolio in one company
    max_single_platform_pct: Decimal | None = None


class ExecutionRules(BaseModel):
    max_notional_usd: Decimal | None = None
    max_premium_bps: Decimal | None = None  # vs reference price
    max_slippage_bps: Decimal | None = None  # expected slippage ceiling
    require_simulation: bool = True
    allow_unlimited_approval: bool = False


class RepresentationRules(BaseModel):
    allowed_platforms: list[str] = Field(default_factory=lambda: ["ondo", "xstocks", "bstock"])
    allowed_contracts: list[str] = Field(default_factory=list)  # empty = any discovered
    require_attestation: bool = False
    require_security_audit: bool = False


class MarketHoursRules(BaseModel):
    max_premium_bps_when_closed: Decimal | None = None
    allow_extended_hours: bool = True
    allow_when_closed: bool = True
    confirm_when_closed: bool = True
    block_when_halted: bool = True


class ReferenceRules(BaseModel):
    max_reference_age_s: int | None = None  # reject stale reference data
    require_reference_price: bool = True


class AutomationRules(BaseModel):
    max_autonomous_daily_usd: Decimal | None = None
    allow_autonomous_rebalance: bool = False


class ConfirmationRules(BaseModel):
    confirm_above_usd: Decimal | None = None  # ask before tx over $X
    always_confirm: bool = False


class PortfolioConstitution(BaseModel):
    version: str = "1"
    reserve: ReserveRules = Field(default_factory=ReserveRules)
    concentration: ConcentrationRules = Field(default_factory=ConcentrationRules)
    execution: ExecutionRules = Field(default_factory=ExecutionRules)
    representation: RepresentationRules = Field(default_factory=RepresentationRules)
    market_hours: MarketHoursRules = Field(default_factory=MarketHoursRules)
    reference: ReferenceRules = Field(default_factory=ReferenceRules)
    automation: AutomationRules = Field(default_factory=AutomationRules)
    confirmation: ConfirmationRules = Field(default_factory=ConfirmationRules)


def canonical_json(obj: Any) -> str:
    """Deterministic JSON: sorted keys, no whitespace, Decimals as strings."""

    def default(o):
        if isinstance(o, Decimal):
            return format(o.normalize(), "f")
        if hasattr(o, "model_dump"):
            return o.model_dump(mode="json")
        raise TypeError(type(o).__name__)

    return json.dumps(obj, sort_keys=True, separators=(",", ":"), default=default, ensure_ascii=True)


def constitution_hash(c: PortfolioConstitution) -> str:
    return "0x" + hashlib.sha256(canonical_json(c.model_dump(mode="json")).encode()).hexdigest()
