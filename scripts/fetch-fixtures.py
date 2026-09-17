#!/usr/bin/env python3
"""Fetch sanitized public RWA API fixtures from Binance Web3 public endpoints.

All endpoints are public (no auth). Saves raw JSON into fixtures/rwa/ for tests
and recorded-demo mode. Records each call into dx/raw/api-events.jsonl.
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "fixtures" / "rwa"
EVENTS = ROOT / "dx" / "raw" / "api-events.jsonl"
UA = {"Accept-Encoding": "identity", "User-Agent": "binance-web3/1.1 (Skill)"}

BASE_WWW = "https://www.binance.com"
BASE_WEB3 = "https://web3.binance.com"

CALLS = [
    ("rwa-stock-list", "GET", f"{BASE_WWW}/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai?type={{t}}", "stock-list-type{t}.json"),
    ("rwa-market-status", "GET", f"{BASE_WWW}/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/market/status/ai", "market-status.json"),
    ("rwa-meta", "GET", f"{BASE_WWW}/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/meta/ai?chainId={{c}}&contractAddress={{a}}", "rwa-meta-{a}.json"),
    ("rwa-asset-status", "GET", f"{BASE_WWW}/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/asset/market/status/ai?chainId={{c}}&contractAddress={{a}}", "asset-status-{a}.json"),
    ("rwa-dynamic-v2", "GET", f"{BASE_WWW}/bapi/defi/v2/public/wallet-direct/buw/wallet/market/token/rwa/dynamic/ai?chainId={{c}}&contractAddress={{a}}", "rwa-dynamic-{a}.json"),
    ("token-kline", "GET", f"{BASE_WWW}/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/kline/ai?chainId={{c}}&contractAddress={{a}}&interval=1d&limit=5", "kline-{a}.json"),
    ("token-search", "GET", f"{BASE_WEB3}/bapi/defi/v5/public/wallet-direct/buw/wallet/market/token/search/ai?chainId={{c}}&keyword={{k}}", "token-search-{k}.json"),
    ("token-dynamic", "GET", f"{BASE_WEB3}/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info/ai?chainId={{c}}&contractAddress={{a}}", "token-dynamic-{a}.json"),
    ("token-audit", "GET", f"{BASE_WEB3}/bapi/defi/v1/public/wallet-direct/security/token/audit?chainId={{c}}&contractAddress={{a}}", "token-audit-{a}.json"),
]


def record(module, endpoint, http_status, code, latency_ms, success, error=None):
    EVENTS.parent.mkdir(parents=True, exist_ok=True)
    ev = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "module": module,
        "endpoint": endpoint.split("?")[0],
        "method": "GET",
        "httpStatus": http_status,
        "businessCode": code,
        "latencyMs": round(latency_ms, 1),
        "success": success,
        "error": error,
        "docsSection": "binance-skills-hub/binance-tokenized-securities-info",
    }
    with EVENTS.open("a", encoding="utf-8") as f:
        f.write(json.dumps(ev) + "\n")


def fetch(name, url, out_name):
    req = urllib.request.Request(url, headers=UA)
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read()
            latency = (time.perf_counter() - t0) * 1000
            status = r.status
    except Exception as e:
        latency = (time.perf_counter() - t0) * 1000
        record(name, url, None, None, latency, False, str(e))
        print(f"  {name}: FAILED {e}")
        return None
    try:
        payload = json.loads(body)
        code = payload.get("code")
        ok = code == "000000" or payload.get("success") is True
    except Exception:
        payload, code, ok = None, None, False
    record(name, url, status, code, latency, ok)
    if payload is not None:
        (FIXTURES / out_name).write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"  {name}: code={code} -> {out_name} ({latency:.0f}ms)")
    else:
        print(f"  {name}: non-JSON body ({len(body)} bytes)")
    return payload


def main():
    FIXTURES.mkdir(parents=True, exist_ok=True)
    # 1) stock lists for all platform types
    lists = {}
    for t in (1, 2, 3):
        p = fetch("rwa-stock-list", CALLS[0][2].format(t=t), f"stock-list-type{t}.json")
        if p and p.get("data"):
            lists[t] = p["data"]

    # 2) overall market status
    fetch("rwa-market-status", CALLS[1][2], "market-status.json")

    # 3) per-asset data for NVDA on BSC for each type that has it
    for t, items in lists.items():
        nvda = [i for i in items if i.get("ticker") == "NVDA" and str(i.get("chainId")) == "56"]
        for item in nvda[:1]:
            a = item["contractAddress"]
            tag = f"type{t}"
            fetch("rwa-meta", CALLS[2][2].format(c=56, a=a), f"rwa-meta-{tag}-{a}.json")
            fetch("rwa-asset-status", CALLS[3][2].format(c=56, a=a), f"asset-status-{tag}-{a}.json")
            fetch("rwa-dynamic-v2", CALLS[4][2].format(c=56, a=a), f"rwa-dynamic-{tag}-{a}.json")
            fetch("token-kline", CALLS[5][2].format(c=56, a=a), f"kline-{tag}-{a}.json")
            fetch("token-dynamic", CALLS[7][2].format(c=56, a=a), f"token-dynamic-{tag}-{a}.json")
            fetch("token-audit", CALLS[8][2].format(c=56, a=a), f"token-audit-{tag}-{a}.json")

    # 4) token search sanity check
    fetch("token-search", CALLS[6][2].format(c=56, k="NVDA"), "token-search-NVDA.json")


if __name__ == "__main__":
    sys.exit(main())
