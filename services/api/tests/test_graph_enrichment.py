"""Graph enrichment: parallel discovery, peer reference fallback, underlyings."""

from decimal import Decimal

from equitymux.domain.models import MarketState, Platform
from equitymux.services.graph import CanonicalEquityGraph


class FakeClient:
    """Deterministic stand-in for BinancePublicClient — no network."""

    def __init__(self, missing_ref_platforms=(), kline_close=None):
        self.missing_ref = set(missing_ref_platforms)
        self.kline_close = kline_close
        self.calls = {"rwa_dynamic": 0}

    def stock_list(self, type_id):
        data = {
            1: [
                {
                    "ticker": "NVDA",
                    "symbol": "NVDAon",
                    "chainId": 56,
                    "contractAddress": "0xa9ee28c80f960b889dfbd1902055218cba016f75",
                    "multiplier": "1.0017",
                    "name": "NVIDIA",
                }
            ],
            2: [
                {
                    "ticker": "NVDA",
                    "symbol": "NVDAx",
                    "chainId": 56,
                    "contractAddress": "0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
                    "multiplier": "1",
                    "name": "NVIDIA",
                }
            ],
            3: [
                {
                    "ticker": "NVDA",
                    "symbol": "NVDAB",
                    "chainId": 56,
                    "contractAddress": "0x02fca66c1d1afb4e2a7884261eb00f63598a7436",
                    "multiplier": "1.0007",
                    "name": "NVIDIA",
                }
            ],
        }
        return data.get(type_id, [])

    def rwa_dynamic(self, chain_id, contract):
        self.calls["rwa_dynamic"] += 1
        stock_price = None if contract == "0x02fca66c1d1afb4e2a7884261eb00f63598a7436" else "180.20"
        if "bstock" in self.missing_ref:
            stock_price = None
        return {
            "tokenInfo": {"price": "180.50", "sharesMultiplier": "1.001", "totalHolders": "42"},
            "stockInfo": {"price": stock_price},
            "statusInfo": {"marketStatus": "regular"},
            "limitInfo": {},
        }

    def asset_market_status(self, chain_id, contract):
        return {"reasonCode": "TRADING", "marketStatus": "regular"}

    def rwa_meta(self, chain_id, contract):
        return {"companyInfo": {"companyName": "NVIDIA Corporation"}}

    def token_dynamic(self, chain_id, contract):
        return {"volume24hBuy": "1000", "volume24hSell": "900"}

    def market_status(self):
        return {"marketStatus": "regular"}

    def token_kline(self, chain_id, contract, interval="1d", limit=30):
        if self.kline_close is None:
            return {}
        return {"klineInfos": [[1, "1", "2", "0.5", str(self.kline_close), "10", 2]], "decimals": 18}


def test_discover_all_platforms_parallel():
    g = CanonicalEquityGraph(client=FakeClient())
    reps = g.discover("NVDA")
    platforms = {r.platform for r in reps}
    assert platforms == {Platform.ONDO, Platform.XSTOCKS, Platform.BSTOCK}
    for r in reps:
        assert r.market_state == MarketState.REGULAR


def test_peer_reference_fallback_marks_provenance():
    g = CanonicalEquityGraph(client=FakeClient())
    reps = g.discover("NVDA")
    bstock = next(r for r in reps if r.platform == Platform.BSTOCK)
    assert bstock.reference_price_usd == Decimal("180.20")
    assert bstock.reference_price_source == "peer:ondo"
    assert any(s.startswith("peer-reference:") for s in bstock.source_evidence)


def test_no_peer_reference_stays_none():
    g = CanonicalEquityGraph(client=FakeClient(missing_ref_platforms={"bstock"}), platforms={"bstock"})
    reps = g.discover("NVDA")
    assert reps[0].reference_price_usd is None
    assert reps[0].reference_price_source is None


def test_kline_reference_last_resort():
    g = CanonicalEquityGraph(
        client=FakeClient(missing_ref_platforms={"bstock"}, kline_close="179.90"), platforms={"bstock"}
    )
    reps = g.discover("NVDA")
    assert reps[0].reference_price_usd == Decimal("179.90") / reps[0].shares_per_token
    assert reps[0].reference_observed_at is None
    assert reps[0].reference_price_source == "kline:close"
    assert "kline-reference:1d-close" in reps[0].source_evidence


def test_stockinfo_source_marked():
    g = CanonicalEquityGraph(client=FakeClient(), platforms={"ondo"})
    reps = g.discover("NVDA")
    assert reps[0].reference_price_source == "stockInfo"


def test_underlyings_index():
    g = CanonicalEquityGraph(client=FakeClient())
    idx = g.underlyings()
    nvda = next(e for e in idx if e["ticker"] == "NVDA")
    assert nvda["count"] == 3
    assert set(nvda["platforms"]) == {"ondo", "xstocks", "bstock"}


def test_adapter_exception_isolated():
    """A non-ProviderError crash in one adapter must not kill discovery."""

    class CrashingClient(FakeClient):
        def stock_list(self, type_id):
            if type_id == 2:  # xStocks adapter explodes unexpectedly
                raise RuntimeError("adapter bug")
            return super().stock_list(type_id)

    g = CanonicalEquityGraph(client=CrashingClient())
    reps = g.discover("NVDA")
    platforms = {r.platform for r in reps}
    assert Platform.XSTOCKS not in platforms
    assert platforms == {Platform.ONDO, Platform.BSTOCK}


def test_ttl_cache_avoids_repeat_calls():
    from equitymux.providers.binance_public import _TTLCache

    c = _TTLCache()
    c.set("k", {"v": 1}, ttl_s=60)
    assert c.get("k") == {"v": 1}
    c.set("k2", {"v": 2}, ttl_s=-1)
    assert c.get("k2") is None
