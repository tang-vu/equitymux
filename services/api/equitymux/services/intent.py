"""Intent compiler — deterministic parse of natural-language equity intent into
EquityIntent. An LLM may draft intents elsewhere; this compiler is the authority
for what actually enters the pipeline (it never signs anything).
"""

from __future__ import annotations

import re
from decimal import Decimal

from equitymux.domain.models import EquityIntent, Side

_KNOWN_TICKERS = {
    "NVIDIA": "NVDA",
    "NVDA": "NVDA",
    "APPLE": "AAPL",
    "AAPL": "AAPL",
    "TESLA": "TSLA",
    "TSLA": "TSLA",
    "MICROSOFT": "MSFT",
    "MSFT": "MSFT",
    "AMAZON": "AMZN",
    "AMZN": "AMZN",
    "GOOGLE": "GOOGL",
    "ALPHABET": "GOOGL",
    "GOOGL": "GOOGL",
    "META": "META",
    "AMD": "AMD",
    "CIRCLE": "CRCL",
    "CRCL": "CRCL",
    "COINBASE": "COIN",
    "COIN": "COIN",
    "SPY": "SPY",
    "QQQ": "QQQ",
    "MICROSTRATEGY": "MSTR",
    "MSTR": "MSTR",
    "SNDK": "SNDK",
    "SANDISK": "SNDK",
    "MU": "MU",
    "MICRON": "MU",
    "INTC": "INTC",
    "INTEL": "INTC",
    "AVGO": "AVGO",
    "BROADCOM": "AVGO",
    "PLTR": "PLTR",
    "PALANTIR": "PLTR",
    "HOOD": "HOOD",
    "ROBINHOOD": "HOOD",
}

_QUOTE_ASSETS = {"USDC", "USDT", "USD1", "U", "BNB"}

# Uppercase words that are never ticker symbols.
_STOP_WORDS = {
    "BUY",
    "SELL",
    "OF",
    "THE",
    "AND",
    "FOR",
    "WITH",
    "USD",
    "USDC",
    "USDT",
    "USD1",
    "BNB",
    "BSC",
    "MAX",
    "BPS",
    "NOT",
}


def parse_intent(text: str) -> EquityIntent:
    t = text.strip()
    side = Side.SELL if re.search(r"\b(sell|reduce|exit|trim)\b", t, re.IGNORECASE) else Side.BUY

    ticker = None
    for word in re.findall(r"[A-Za-z]{2,7}", t):
        w = word.upper()
        if w in _KNOWN_TICKERS:
            ticker = _KNOWN_TICKERS[w]
            break
        # platform-suffixed symbols: NVDAon / NVDAx / NVDAB -> NVDA
        stem = re.sub(r"(?:ON|X|B)$", "", w)
        if stem != w and stem in _KNOWN_TICKERS.values():
            ticker = stem
            break
    if ticker is None:
        # Any plausible symbol: $NFLX or a bare uppercase word. Unknown tickers
        # reach discovery and fail closed there — never silently zeroed.
        m = re.search(r"\$([A-Z]{1,6})\b|\b([A-Z]{2,6})\b", t)
        if m:
            cand = m.group(1) or m.group(2)
            if cand not in _STOP_WORDS:
                # Platform suffixes (NVDAon / NVDAx / NVDAB) resolve to the
                # underlying only when the stem is a known ticker.
                stem = re.sub(r"(?:on|x|B)$", "", cand)
                ticker = stem if stem in _KNOWN_TICKERS.values() else cand

    notional = None
    m = re.search(r"\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)", t) or re.search(
        r"(\d+(?:\.\d+)?)\s*(?:usdc|usdt|usd1|u\b|dollars?)", t, re.IGNORECASE
    )
    if m:
        notional = Decimal(m.group(1).replace(",", ""))

    quote_asset = "USDC"
    m = re.search(r"\b(USDC|USDT|USD1|BNB|U)\b", t)
    if m and m.group(1).upper() in _QUOTE_ASSETS:
        quote_asset = m.group(1).upper()

    constraints: dict = {}
    m = re.search(r"(?:no more than|max(?:imum)?|under)\s*(\d+(?:\.\d+)?)\s*bps", t, re.IGNORECASE)
    if m:
        constraints["maxPremiumBps"] = int(Decimal(m.group(1)))
    m = re.search(r"slippage\s*(\d+(?:\.\d+)?)\s*bps", t, re.IGNORECASE) or re.search(
        r"(\d+(?:\.\d+)?)\s*bps\s+slippage", t, re.IGNORECASE
    )
    if m:
        constraints["maxSlippageBps"] = int(Decimal(m.group(1)))

    return EquityIntent(
        raw=text,
        ticker=ticker or "",
        side=side,
        notional=notional,
        quote_asset=quote_asset,
        constraints=constraints,
    )
