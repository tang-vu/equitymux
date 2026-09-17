"""Canonical Equity Graph — normalize every tokenized representation of an
underlying into one comparable shape.

Adapter interface: discover(ticker) -> enrich(asset). Adding a new platform is
a new adapter, never an engine rewrite.
"""
from __future__ import annotations

import time
from abc import ABC
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation

from equitymux.domain.mathx import dec
from equitymux.domain.models import (
    PLATFORM_TYPE_ID,
    Attestation,
    LiquiditySnapshot,
    MarketState,
    Platform,
    TokenizedRepresentation,
)
from equitymux.providers.binance_public import BinancePublicClient
from equitymux.providers.errors import ProviderError

BSC = 56
STATIC_HOST = "https://bin.bnbstatic.com"

_MARKET_STATUS_MAP = {
    "regular": MarketState.REGULAR,
    "premarket": MarketState.EXTENDED,
    "postmarket": MarketState.EXTENDED,
    "overnight": MarketState.EXTENDED,
    "closed": MarketState.CLOSED,
    "pause": MarketState.HALTED,
}

_REASON_TO_STATE = {
    "TRADING": None,  # defer to marketStatus
    "MARKET_CLOSED": MarketState.CLOSED,
    "MARKET_PAUSED": MarketState.HALTED,
    "ASSET_PAUSED": MarketState.HALTED,
    "ASSET_LIMITED": MarketState.EXTENDED,
    "MARKET_MAINTENANCE": MarketState.HALTED,
    "UNSUPPORTED": MarketState.UNKNOWN,
}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _dec_or_none(v) -> Decimal | None:
    try:
        return dec(v) if v not in (None, "") else None
    except (InvalidOperation, ValueError):
        return None


def _market_state(status: dict) -> tuple[MarketState, str | None]:
    code = status.get("reasonCode")
    mapped = _REASON_TO_STATE.get(code or "", None)
    if mapped is not None:
        return mapped, code
    return _MARKET_STATUS_MAP.get(str(status.get("marketStatus") or "").lower(),
                                  MarketState.UNKNOWN), code


class RepresentationAdapter(ABC):
    """One per tokenized-stock platform. All use the same verified RWA surface;
    the adapter boundary exists so a non-Binance venue can be added cleanly."""

    platform: Platform

    def __init__(self, client: BinancePublicClient):
        self.client = client

    @property
    def type_id(self) -> int:
        return PLATFORM_TYPE_ID[self.platform]

    def discover(self, ticker: str, chain_id: int = BSC) -> list[TokenizedRepresentation]:
        out = []
        for item in self.client.stock_list(self.type_id):
            if item.get("ticker", "").upper() != ticker.upper():
                continue
            if str(item.get("chainId")) != str(chain_id):
                continue
            out.append(self._base(item))
        return out

    def _base(self, item: dict) -> TokenizedRepresentation:
        return TokenizedRepresentation(
            underlying_ticker=item["ticker"].upper(),
            platform=self.platform,
            chain_id=int(item["chainId"]),
            token_address=item["contractAddress"],
            token_symbol=item.get("symbol", ""),
            decimals=int(item.get("d", 18)),
            shares_per_token=dec(item.get("multiplier")) or Decimal(1),
            source_evidence=[f"rwa/stock/detail/list?type={self.type_id}"],
        )

    def enrich(self, rep: TokenizedRepresentation) -> TokenizedRepresentation:
        """Attach price/reference/market/issuer/liquidity evidence.

        The four upstream calls are independent and one of them
        (token/dynamic/info) is 4-10s — run them concurrently (DX issue #3).
        """
        out: dict[str, dict] = {}

        def fetch(name: str, fn):
            try:
                out[name] = fn()
            except ProviderError:
                out[name] = {}

        cid, addr = rep.chain_id, rep.token_address
        with ThreadPoolExecutor(max_workers=4) as ex:
            futs = [
                ex.submit(fetch, "dyn", lambda: self.client.rwa_dynamic(cid, addr)),
                ex.submit(fetch, "status", lambda: self.client.asset_market_status(cid, addr)),
                ex.submit(fetch, "meta", lambda: self.client.rwa_meta(cid, addr)),
                ex.submit(fetch, "tokdyn", lambda: self.client.token_dynamic(cid, addr)),
            ]
            for f in futs:
                f.result()

        dyn = out.get("dyn") or {}
        if dyn:
            rep.source_evidence.append("rwa/dynamic/v2")
        token_info = dyn.get("tokenInfo") or {}
        stock_info = dyn.get("stockInfo") or {}
        status_info = dyn.get("statusInfo") or {}
        limit_info = dyn.get("limitInfo") or {}

        rep.token_price_usd = _dec_or_none(token_info.get("price"))
        rep.reference_price_usd = _dec_or_none(stock_info.get("price"))
        if rep.reference_price_usd is not None:
            rep.reference_price_source = "stockInfo"
        rep.reference_observed_at = _now_iso()
        mult = _dec_or_none(token_info.get("sharesMultiplier"))
        if mult and mult > 0:
            rep.shares_per_token = mult
        rep.max_order_notional_usd = _dec_or_none(limit_info.get("maxActiveNotionalValue"))
        rep.liquidity = LiquiditySnapshot(
            holders=int(token_info["totalHolders"]) if token_info.get("totalHolders") else None,
            circulating_supply=_dec_or_none(token_info.get("circulatingSupply")),
            market_cap_usd=_dec_or_none(token_info.get("marketCap")),
        )
        state, code = _market_state(status_info)
        if state is not MarketState.UNKNOWN or not rep.market_reason_code:
            rep.market_state = state
            rep.market_reason_code = code
            rep.market_reason_msg = status_info.get("reasonMsg")
            rep.next_open_time = status_info.get("nextOpenTime")
            rep.next_close_time = status_info.get("nextCloseTime")

        # per-asset status is authoritative over the dynamic bundle when present
        st = out.get("status") or {}
        if st:
            rep.source_evidence.append("rwa/asset/market/status")
            state2, code2 = _market_state(st)
            rep.market_state = state2
            rep.market_reason_code = code2 or rep.market_reason_code
            rep.market_reason_msg = st.get("reasonMsg") or rep.market_reason_msg
            rep.next_open_time = st.get("nextOpenTime") or rep.next_open_time
            rep.next_close_time = st.get("nextCloseTime") or rep.next_close_time
            rep.issuer_status = code2

        # issuer metadata + attestation
        meta = out.get("meta") or {}
        if meta:
            rep.source_evidence.append("rwa/meta")
        if meta:
            rep.underlying_name = (meta.get("companyInfo") or {}).get("companyName") or meta.get("name")
            daily, monthly = meta.get("dailyAttestationReports"), meta.get("monthlyAttestationReports")
            rep.attestation = Attestation(
                supported=bool(daily or monthly),
                daily_url=f"{STATIC_HOST}{daily}" if daily else None,
                monthly_url=f"{STATIC_HOST}{monthly}" if monthly else None,
                observed_at=_now_iso(),
            )

        # on-chain liquidity evidence (best-effort; endpoint is slow)
        td = out.get("tokdyn") or {}
        if td:
            rep.source_evidence.append("market/token/dynamic/info")
            rep.liquidity.volume_24h_buy_usd = _dec_or_none(td.get("volume24hBuy"))
            rep.liquidity.volume_24h_sell_usd = _dec_or_none(td.get("volume24hSell"))
        return rep

    def get_reference(self, rep: TokenizedRepresentation) -> Decimal | None:
        return rep.reference_price_usd

    def get_market_state(self, rep: TokenizedRepresentation) -> MarketState:
        return rep.market_state

    def get_issuer_evidence(self, rep: TokenizedRepresentation) -> dict:
        return {"attestation": rep.attestation.model_dump(), "issuerStatus": rep.issuer_status}


class OndoAdapter(RepresentationAdapter):
    platform = Platform.ONDO


class XStocksAdapter(RepresentationAdapter):
    platform = Platform.XSTOCKS


class BStockAdapter(RepresentationAdapter):
    platform = Platform.BSTOCK


ADAPTERS: dict[Platform, type[RepresentationAdapter]] = {
    Platform.ONDO: OndoAdapter,
    Platform.XSTOCKS: XStocksAdapter,
    Platform.BSTOCK: BStockAdapter,
}


class CanonicalEquityGraph:
    def __init__(self, client: BinancePublicClient | None = None,
                 platforms: set[str] | None = None):
        self.client = client or BinancePublicClient()
        allowed = platforms or {p.value for p in Platform}
        self.adapters = [ADAPTERS[p](self.client) for p in Platform if p.value in allowed]

    def discover(self, ticker: str, chain_id: int = BSC,
                 enrich: bool = True) -> list[TokenizedRepresentation]:
        """Discover + enrich representations across all adapters in parallel.

        After enrichment, representations missing a reference price inherit the
        same-ticker peer's reference (the underlying price is shared across
        wrappers) — provenance is marked `peer:<platform>`; a rep with no peer
        reference stays None and fails `require_reference_price` closed.
        """
        reps: list[TokenizedRepresentation] = []

        def _one(adapter) -> list[TokenizedRepresentation]:
            try:
                found = adapter.discover(ticker, chain_id)
                if not enrich:
                    return found
                with ThreadPoolExecutor(max_workers=4) as ex:
                    return list(ex.map(adapter.enrich, found))
            except ProviderError:
                return []

        with ThreadPoolExecutor(max_workers=len(self.adapters) or 1) as ex:
            for batch in ex.map(_one, self.adapters):
                reps.extend(batch)

        if enrich:
            ref = next((r for r in reps if r.reference_price_usd is not None), None)
            if ref:
                for r in reps:
                    if r.reference_price_usd is None:
                        r.reference_price_usd = ref.reference_price_usd
                        r.reference_price_source = f"peer:{ref.platform.value}"
                        r.source_evidence.append(
                            f"peer-reference:{ref.token_address}")
            for r in reps:
                if r.reference_price_usd is None:
                    self._kline_reference(r, chain_id)
        return reps

    def _kline_reference(self, rep: TokenizedRepresentation, chain_id: int) -> None:
        """Last-resort reference: the token's own daily kline close.

        Weaker than an equity reference (it measures the token's last trade,
        not the underlying stock) — provenance `kline:close` keeps that honest.
        """
        try:
            data = self.client.token_kline(chain_id, rep.token_address, interval="1d", limit=2)
        except (ProviderError, KeyError, TypeError):
            return
        infos = data.get("klineInfos") or []
        if not infos:
            return
        close = _dec_or_none(infos[-1][4] if len(infos[-1]) > 4 else None)
        if close is not None:
            rep.reference_price_usd = close
            rep.reference_price_source = "kline:close"
            rep.reference_observed_at = _now_iso()
            rep.source_evidence.append("kline-reference:1d-close")

    def underlyings(self, chain_id: int = BSC) -> list[dict]:
        """All BSC-listed underlyings across platforms — for the explorer index."""
        by_ticker: dict[str, dict] = {}
        for adapter in self.adapters:
            try:
                for item in self.client.stock_list(adapter.type_id):
                    if str(item.get("chainId")) != str(chain_id):
                        continue
                    t = item.get("ticker", "").upper()
                    e = by_ticker.setdefault(t, {"ticker": t, "name": item.get("name"),
                                                 "platforms": {}, "count": 0})
                    e["platforms"][adapter.platform.value] = {
                        "symbol": item.get("symbol"),
                        "tokenAddress": item.get("contractAddress")}
                    e["count"] += 1
            except ProviderError:
                continue
        return sorted(by_ticker.values(), key=lambda e: (-e["count"], e["ticker"]))

    def underlying_market(self) -> dict:
        return self.client.market_status()

    def reference_age_seconds(self, rep: TokenizedRepresentation) -> int | None:
        if not rep.reference_observed_at:
            return None
        try:
            ts = datetime.fromisoformat(rep.reference_observed_at)
            return max(0, int(time.time() - ts.timestamp()))
        except ValueError:
            return None
