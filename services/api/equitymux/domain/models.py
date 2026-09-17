"""Domain model. Provider payloads never leak past the provider layer — everything
here is normalized, Decimal-typed, and serializable for receipts.
"""
from __future__ import annotations

from decimal import Decimal
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class Platform(str, Enum):
    ONDO = "ondo"
    XSTOCKS = "xstocks"
    BSTOCK = "bstock"


PLATFORM_TYPE_ID = {Platform.ONDO: 1, Platform.XSTOCKS: 2, Platform.BSTOCK: 3}
TYPE_ID_PLATFORM = {v: k for k, v in PLATFORM_TYPE_ID.items()}


class MarketState(str, Enum):
    REGULAR = "REGULAR"
    EXTENDED = "EXTENDED"  # premarket / postmarket / overnight
    CLOSED = "CLOSED"
    HALTED = "HALTED"
    UNKNOWN = "UNKNOWN"


class Side(str, Enum):
    BUY = "BUY"
    SELL = "SELL"


class EquityIntent(BaseModel):
    raw: str
    ticker: str
    side: Side = Side.BUY
    notional: Decimal | None = None  # in quote asset units
    quote_asset: str = "USDC"
    constraints: dict[str, Any] = Field(default_factory=dict)


class Attestation(BaseModel):
    supported: bool = False
    daily_url: str | None = None
    monthly_url: str | None = None
    observed_at: str | None = None


class LiquiditySnapshot(BaseModel):
    volume_24h_buy_usd: Decimal | None = None
    volume_24h_sell_usd: Decimal | None = None
    holders: int | None = None
    circulating_supply: Decimal | None = None
    market_cap_usd: Decimal | None = None


class TokenizedRepresentation(BaseModel):
    underlying_ticker: str
    underlying_name: str | None = None
    platform: Platform
    chain_id: int
    token_address: str
    token_symbol: str
    decimals: int = 18
    shares_per_token: Decimal  # `multiplier` — NEVER assume 1.0
    token_price_usd: Decimal | None = None  # on-chain price per token
    reference_price_usd: Decimal | None = None  # stock price per share
    reference_observed_at: str | None = None
    market_state: MarketState = MarketState.UNKNOWN
    market_reason_code: str | None = None
    market_reason_msg: str | None = None
    next_open_time: int | None = None  # ms epoch
    next_close_time: int | None = None
    issuer_status: str | None = None
    attestation: Attestation = Field(default_factory=Attestation)
    liquidity: LiquiditySnapshot = Field(default_factory=LiquiditySnapshot)
    max_order_notional_usd: Decimal | None = None
    source_evidence: list[str] = Field(default_factory=list)
    audit: dict[str, Any] | None = None

    @property
    def implied_share_price_usd(self) -> Decimal | None:
        if self.token_price_usd is None:
            return None
        return self.token_price_usd / self.shares_per_token


class ExecutableQuote(BaseModel):
    from_token: str
    to_token: str
    from_symbol: str
    to_symbol: str
    from_amount: Decimal
    to_amount: Decimal
    slippage_bps: int | None = None
    quote_id: str | None = None
    obtained_at: str
    source: str  # e.g. "baw market-order quote"
    raw: dict[str, Any] | None = None


class RuleResult(BaseModel):
    rule: str
    status: Literal["PASS", "FAIL", "REQUIRES_CONFIRMATION", "SKIP"]
    detail: str = ""


class PolicyEvaluation(BaseModel):
    constitution_hash: str
    results: list[RuleResult]
    eligible: bool
    requires_confirmation: bool = False


class SimulationRecord(BaseModel):
    status: Literal["PASS", "FAIL", "SKIP"]
    method: str  # "eth_call" | "baw contract-call preview" | "recorded"
    timestamp: str
    calldata_hash: str | None = None
    block_context: int | None = None
    detail: str = ""


class RouteStatus(str, Enum):
    ELIGIBLE = "ELIGIBLE"
    REJECTED = "REJECTED"
    REQUIRES_CONFIRMATION = "REQUIRES_CONFIRMATION"
    SIMULATION_FAILED = "SIMULATION_FAILED"
    STALE_REFERENCE = "STALE_REFERENCE"
    NO_QUOTE = "NO_QUOTE"


class CandidateRoute(BaseModel):
    representation: TokenizedRepresentation
    quote: ExecutableQuote | None = None
    premium_bps: Decimal | None = None
    expected_slippage_bps: Decimal | None = None
    reference_age_s: int | None = None
    gas_estimate_usd: Decimal | None = None
    policy: PolicyEvaluation | None = None
    simulation: SimulationRecord | None = None
    status: RouteStatus = RouteStatus.ELIGIBLE
    reason_codes: list[str] = Field(default_factory=list)
    score: Decimal | None = None
    score_breakdown: dict[str, Decimal] = Field(default_factory=dict)


class ExecState(str, Enum):
    INTENT_RECEIVED = "INTENT_RECEIVED"
    INTENT_COMPILED = "INTENT_COMPILED"
    AWAITING_POLICY_APPROVAL = "AWAITING_POLICY_APPROVAL"
    DISCOVERING = "DISCOVERING"
    QUOTING = "QUOTING"
    POLICY_EVALUATION = "POLICY_EVALUATION"
    NO_VALID_ROUTE = "NO_VALID_ROUTE"
    SIMULATING = "SIMULATING"
    SIMULATION_FAILED = "SIMULATION_FAILED"
    AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION"
    READY = "READY"
    EXECUTING = "EXECUTING"
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION"
    CONFIRMED = "CONFIRMED"
    EXECUTION_FAILED = "EXECUTION_FAILED"
    POLICY_REJECTED = "POLICY_REJECTED"


class ExecutionReceipt(BaseModel):
    version: str = "1"
    receipt_id: str
    created_at: str
    intent: dict[str, Any]
    policy: dict[str, Any]
    market_context: dict[str, Any]
    candidates: list[dict[str, Any]]
    selected_route: dict[str, Any] | None = None
    simulation: dict[str, Any] | None = None
    authorization: dict[str, Any] = Field(default_factory=dict)
    execution: dict[str, Any] = Field(default_factory=dict)
    agent: dict[str, Any] = Field(default_factory=dict)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    transitions: list[dict[str, Any]] = Field(default_factory=list)
    state: str = "DRAFT"
    receipt_hash: str | None = None
