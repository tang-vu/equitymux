"""Binance Web3 public API client (the `bapi` surface used by Wallet Skills).

Verified live on 2026-09-17 — see docs/research/integration-matrix.md.
All endpoints used here are PUBLIC (no API key). Success is determined by the
business `code` field ("000000") in the body, never by HTTP status alone.

In demo_mode the client serves recorded fixtures from fixtures/rwa/ instead of
hitting the network — and callers can always tell, because every model carries
`source_evidence` entries marked LIVE or RECORDED.
"""
from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any

import httpx

from equitymux.config import FIXTURES_DIR, Settings, get_settings
from equitymux.dx.recorder import record_event
from equitymux.providers.errors import (
    BinanceBusinessError,
    FixtureMissingError,
    RateLimitError,
    UpstreamHTTPError,
)

RWA_LIST = "/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai"
RWA_META = "/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/meta/ai"
RWA_MARKET_STATUS = "/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/market/status/ai"
RWA_ASSET_STATUS = "/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/asset/market/status/ai"
RWA_DYNAMIC_V2 = "/bapi/defi/v2/public/wallet-direct/buw/wallet/market/token/rwa/dynamic/ai"
TOKEN_KLINE = "/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/kline/ai"
TOKEN_DYNAMIC = "/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info/ai"
TOKEN_SEARCH = "/bapi/defi/v5/public/wallet-direct/buw/wallet/market/token/search/ai"
TOKEN_AUDIT = "/bapi/defi/v1/public/wallet-direct/security/token/audit"

WWW_PATHS = {RWA_LIST, RWA_META, RWA_MARKET_STATUS, RWA_ASSET_STATUS, RWA_DYNAMIC_V2, TOKEN_KLINE}


class BinancePublicClient:
    def __init__(self, settings: Settings | None = None):
        self.s = settings or get_settings()
        self._fixtures = FIXTURES_DIR / "rwa"

    # ---------- transport ----------
    def _get(self, path: str, params: dict[str, Any] | None = None, *, module: str) -> dict:
        base = self.s.binance_www_base if path in WWW_PATHS else self.s.binance_web3_base
        url = base + path
        headers = {"Accept-Encoding": "identity", "User-Agent": self.s.user_agent}
        last_err: Exception | None = None
        for attempt in range(self.s.http_max_retries):
            t0 = time.perf_counter()
            try:
                r = httpx.get(url, params=params, headers=headers, timeout=self.s.http_timeout_s)
                latency = (time.perf_counter() - t0) * 1000
                if r.status_code == 429:
                    retry_after = float(r.headers.get("retry-after", 2**attempt))
                    record_event(module=module, endpoint=path, operation="GET", method="GET",
                                 request_shape=params, http_status=429, latency_ms=latency,
                                 retry_count=attempt, success=False, error_class="RateLimitError")
                    time.sleep(min(retry_after, 30))
                    last_err = RateLimitError("rate limited", 429, url)
                    continue
                if r.status_code >= 400:
                    record_event(module=module, endpoint=path, operation="GET", method="GET",
                                 request_shape=params, http_status=r.status_code, latency_ms=latency,
                                 retry_count=attempt, success=False, error_class="UpstreamHTTPError",
                                 error_message=r.text[:300])
                    raise UpstreamHTTPError(f"HTTP {r.status_code} on {path}", r.status_code, url)
                payload = r.json()
                code = str(payload.get("code", ""))
                ok = code == "000000" or payload.get("success") is True
                record_event(module=module, endpoint=path, operation="GET", method="GET",
                             request_shape=params, http_status=r.status_code, business_code=code,
                             latency_ms=latency, retry_count=attempt, success=ok,
                             error_message=None if ok else json.dumps(payload)[:300])
                if not ok:
                    raise BinanceBusinessError(f"business code {code} on {path}", code, url)
                return payload
            except (httpx.TimeoutException, httpx.NetworkError) as e:
                latency = (time.perf_counter() - t0) * 1000
                last_err = UpstreamHTTPError(str(e), None, url)
                record_event(module=module, endpoint=path, operation="GET", method="GET",
                             request_shape=params, http_status=None, latency_ms=latency,
                             retry_count=attempt, success=False, error_class=type(e).__name__,
                             error_message=str(e)[:300])
                time.sleep(min(2**attempt, 8))
        raise last_err or UpstreamHTTPError("request failed", None, url)

    def _post_json(self, path: str, body: dict[str, Any], *, module: str) -> dict:
        url = self.s.binance_web3_base + path
        headers = {"Content-Type": "application/json", "Accept-Encoding": "identity",
                   "User-Agent": self.s.user_agent, "source": "agent"}
        t0 = time.perf_counter()
        r = httpx.post(url, json=body, headers=headers, timeout=self.s.http_timeout_s)
        latency = (time.perf_counter() - t0) * 1000
        payload = r.json() if r.content else {}
        code = str(payload.get("code", ""))
        ok = r.status_code < 400 and (code == "000000" or payload.get("success") is True)
        record_event(module=module, endpoint=path, operation="POST", method="POST",
                     request_shape={k: v for k, v in body.items() if k != "requestId"},
                     http_status=r.status_code, business_code=code, latency_ms=latency,
                     success=ok, error_message=None if ok else json.dumps(payload)[:300])
        if r.status_code == 429:
            raise RateLimitError("rate limited", 429, url)
        if not ok:
            raise BinanceBusinessError(f"business code {code or r.status_code} on {path}", code, url)
        return payload

    def _fixture(self, name: str) -> dict:
        p = self._fixtures / name
        if not p.exists():
            raise FixtureMissingError(f"recorded fixture missing: {p.name}")
        return json.loads(p.read_text(encoding="utf-8"))

    # ---------- RWA surface ----------
    def stock_list(self, platform_type: int | None = None) -> list[dict]:
        """All tokenized-stock representations. type: 1=Ondo 2=xStocks 3=bStock."""
        if self.s.demo_mode:
            if platform_type is not None:
                return self._fixture(f"stock-list-type{platform_type}.json").get("data") or []
            out: list[dict] = []
            for t in (1, 2, 3):
                try:
                    out += self._fixture(f"stock-list-type{t}.json").get("data") or []
                except FixtureMissingError:
                    pass
            return out
        params = {} if platform_type is None else {"type": platform_type}
        return (self._get(RWA_LIST, params, module="rwa").get("data")) or []

    def rwa_meta(self, chain_id: int, contract: str) -> dict:
        if self.s.demo_mode:
            return self._fixture_by_suffix("rwa-meta-", contract).get("data") or {}
        return self._get(RWA_META, {"chainId": str(chain_id), "contractAddress": contract},
                         module="rwa").get("data") or {}

    def market_status(self) -> dict:
        if self.s.demo_mode:
            return self._fixture("market-status.json").get("data") or {}
        return self._get(RWA_MARKET_STATUS, module="rwa").get("data") or {}

    def asset_market_status(self, chain_id: int, contract: str) -> dict:
        if self.s.demo_mode:
            return self._fixture_by_suffix("asset-status-", contract).get("data") or {}
        return self._get(RWA_ASSET_STATUS, {"chainId": str(chain_id), "contractAddress": contract},
                         module="rwa").get("data") or {}

    def rwa_dynamic(self, chain_id: int, contract: str) -> dict:
        if self.s.demo_mode:
            return self._fixture_by_suffix("rwa-dynamic-", contract).get("data") or {}
        return self._get(RWA_DYNAMIC_V2, {"chainId": str(chain_id), "contractAddress": contract},
                         module="rwa").get("data") or {}

    def token_kline(self, chain_id: int, contract: str, interval: str = "1d", limit: int = 30) -> dict:
        if self.s.demo_mode:
            return self._fixture_by_suffix("kline-", contract).get("data") or {}
        return self._get(TOKEN_KLINE, {"chainId": str(chain_id), "contractAddress": contract,
                                       "interval": interval, "limit": limit},
                         module="market").get("data") or {}

    def token_dynamic(self, chain_id: int, contract: str) -> dict:
        if self.s.demo_mode:
            try:
                return self._fixture_by_suffix("token-dynamic-", contract).get("data") or {}
            except FixtureMissingError:
                return {}
        return self._get(TOKEN_DYNAMIC, {"chainId": str(chain_id), "contractAddress": contract},
                         module="market").get("data") or {}

    def token_search(self, chain_id: int, keyword: str) -> dict:
        if self.s.demo_mode:
            try:
                return self._fixture(f"token-search-{keyword}.json").get("data") or {}
            except FixtureMissingError:
                return {}
        return self._get(TOKEN_SEARCH, {"chainId": str(chain_id), "keyword": keyword},
                         module="market").get("data") or {}

    def token_audit(self, chain_id: int, contract: str) -> dict:
        if self.s.demo_mode:
            try:
                return self._fixture_by_suffix("token-audit-", contract).get("data") or {}
            except FixtureMissingError:
                return {"hasResult": False, "isSupported": False}
        body = {"binanceChainId": str(chain_id), "contractAddress": contract,
                "requestId": str(uuid.uuid4())}
        return self._post_json(TOKEN_AUDIT, body, module="security").get("data") or {}

    def _fixture_by_suffix(self, prefix: str, contract: str) -> dict:
        c = contract.lower()
        for p in self._fixtures.glob(f"{prefix}*.json"):
            if c in p.name.lower():
                return json.loads(p.read_text(encoding="utf-8"))
        raise FixtureMissingError(f"no fixture matching {prefix}*{contract}")
