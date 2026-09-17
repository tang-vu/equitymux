from decimal import Decimal

import pytest

from equitymux.domain.mathx import (
    implied_share_price,
    premium_bps,
    shares_for_notional,
    slippage_bps_from_quote,
    tokens_for_notional,
)


def test_premium_bps_positive():
    assert premium_bps(Decimal("181"), Decimal("180")) == pytest.approx(
        Decimal("55.55"), abs=Decimal("0.01"))


def test_premium_bps_discount():
    v = premium_bps(Decimal("179"), Decimal("180"))
    assert v < 0


def test_premium_rejects_zero_reference():
    with pytest.raises(ValueError):
        premium_bps(Decimal("1"), Decimal("0"))


def test_multiplier_math():
    # 1 token = 1.0017 shares; token $180.5 -> implied share ~180.19
    ip = implied_share_price(Decimal("180.50"), Decimal("1.0017152"))
    assert ip == pytest.approx(Decimal("180.19"), abs=Decimal("0.01"))


def test_multiplier_split_token():
    # 1 token = 10 shares -> implied share = token/10
    assert implied_share_price(Decimal("100"), Decimal("10")) == Decimal("10")


def test_notional_to_shares():
    assert shares_for_notional(Decimal("250"), Decimal("200")) == Decimal("1.25")


def test_slippage_from_quote():
    assert slippage_bps_from_quote(Decimal("100"), Decimal("99.5")) == Decimal("50")


def test_no_float_money():
    # Decimal preserves the ugly cases floats destroy
    v = premium_bps(Decimal("0.30000000000000004"), Decimal("0.3"))
    assert v > 0 and v < Decimal("1")
