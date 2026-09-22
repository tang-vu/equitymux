"""Contract tests against recorded live fixtures (fetched 2026-09-17)."""

from pathlib import Path

import pytest

FIX = Path(__file__).resolve().parents[3] / "fixtures" / "rwa"

pytestmark = pytest.mark.skipif(not FIX.exists(), reason="fixtures not fetched")


def test_stock_list_fixture_shapes(fixture_payloads):
    for t in (1, 2, 3):
        d = fixture_payloads(f"stock-list-type{t}.json")
        assert d["code"] == "000000" and isinstance(d["data"], list)
        for item in d["data"]:
            assert {"chainId", "contractAddress", "symbol", "ticker", "type", "multiplier"} <= set(item)
            assert item["type"] == t


def test_nvda_on_all_platforms(fixture_payloads):
    found = {}
    for t in (1, 2, 3):
        d = fixture_payloads(f"stock-list-type{t}.json")
        nvda = [i for i in d["data"] if i["ticker"] == "NVDA" and str(i["chainId"]) == "56"]
        if nvda:
            found[t] = nvda[0]["contractAddress"]
    # verified live on 2026-09-17
    assert found.get(1) == "0xa9ee28c80f960b889dfbd1902055218cba016f75"
    assert found.get(3) == "0x02fca66c1d1afb4e2a7884261eb00f63598a7436"
    if 2 in found:
        assert found[2] == "0xc845b2894dbddd03858fd2d643b4ef725fe0849d"


def test_multiplier_present_and_not_one(fixture_payloads):
    d = fixture_payloads("stock-list-type1.json")
    nvda = next(i for i in d["data"] if i["ticker"] == "NVDA")
    from decimal import Decimal

    assert Decimal(nvda["multiplier"]) != Decimal(1)


def test_market_status_fixture_shape(fixture_payloads):
    d = fixture_payloads("market-status.json")
    assert "openState" in d["data"] and "marketStatus" in d["data"]
