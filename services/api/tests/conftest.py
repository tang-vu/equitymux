import json
from decimal import Decimal
from pathlib import Path

import pytest

from equitymux.config import Settings
from equitymux.domain.models import (
    CandidateRoute,
    EquityIntent,
    MarketState,
    Platform,
    TokenizedRepresentation,
)
from equitymux.policy.engine import PortfolioState
from equitymux.policy.schema import PortfolioConstitution

FIX = Path(__file__).resolve().parents[3] / "fixtures" / "rwa"


@pytest.fixture
def settings():
    return Settings(demo_mode=True, execution_enabled=False)


@pytest.fixture
def rep_ondo() -> TokenizedRepresentation:
    return TokenizedRepresentation(
        underlying_ticker="NVDA", underlying_name="NVIDIA Corporation",
        platform=Platform.ONDO, chain_id=56,
        token_address="0xa9ee28c80f960b889dfbd1902055218cba016f75",
        token_symbol="NVDAon", decimals=18,
        shares_per_token=Decimal("1.0017152487959898"),
        token_price_usd=Decimal("180.50"), reference_price_usd=Decimal("180.20"),
        market_state=MarketState.REGULAR, market_reason_code="TRADING",
    )


@pytest.fixture
def rep_xstocks() -> TokenizedRepresentation:
    return TokenizedRepresentation(
        underlying_ticker="NVDA", platform=Platform.XSTOCKS, chain_id=56,
        token_address="0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
        token_symbol="NVDAx", decimals=18, shares_per_token=Decimal(1),
        token_price_usd=Decimal("181.10"), reference_price_usd=Decimal("180.20"),
        market_state=MarketState.CLOSED, market_reason_code="MARKET_CLOSED",
    )


@pytest.fixture
def rep_bstock() -> TokenizedRepresentation:
    return TokenizedRepresentation(
        underlying_ticker="NVDA", platform=Platform.BSTOCK, chain_id=56,
        token_address="0x02fca66c1d1afb4e2a7884261eb00f63598a7436",
        token_symbol="NVDAB", decimals=18,
        shares_per_token=Decimal("1.000778223752807865"),
        token_price_usd=Decimal("180.30"), reference_price_usd=Decimal("180.20"),
        market_state=MarketState.REGULAR, market_reason_code="TRADING",
    )


@pytest.fixture
def intent() -> EquityIntent:
    return EquityIntent(raw="Buy $10 of NVIDIA", ticker="NVDA",
                        notional=Decimal(10), quote_asset="USDC")


@pytest.fixture
def state() -> PortfolioState:
    return PortfolioState(quote_balance=Decimal(100),
                          total_value_usd=Decimal(200))


@pytest.fixture
def constitution() -> PortfolioConstitution:
    return PortfolioConstitution()


def cand(rep, premium=None, slippage=None, age=5):
    c = CandidateRoute(representation=rep)
    c.premium_bps = Decimal(str(premium)) if premium is not None else None
    c.expected_slippage_bps = Decimal(str(slippage)) if slippage is not None else None
    c.reference_age_s = age
    return c


@pytest.fixture
def fixture_payloads():
    def load(name):
        return json.loads((FIX / name).read_text(encoding="utf-8"))
    return load
