"""Layer A: natural-language -> typed PortfolioConstitution.

This is a deterministic rule-based compiler (no LLM required). An LLM MAY be
used to draft the same JSON, but the compiled output is validated by pydantic
and hashed — interpretation is frozen at approval time.
"""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Any

from equitymux.policy.schema import (
    POLICY_COMPILER_VERSION,
    PortfolioConstitution,
)

_NUM = r"(\d+(?:\.\d+)?)"

_PATTERNS: list[tuple[re.Pattern[str], Any]] = []


def _p(regex: str):
    def wrap(fn):
        _PATTERNS.append((re.compile(regex, re.IGNORECASE), fn))
        return fn

    return wrap


@_p(
    r"(?:never spend (?:my )?last|keep at least|reserve(?: of)?|leave)\s*\$?"
    + _NUM
    + r"\s*(usdc|usdt|usd1|u|dollars)?"
)
def _reserve(c: PortfolioConstitution, m: re.Match):
    c.reserve.min_quote_reserve = Decimal(m.group(1))
    if m.group(2) and m.group(2).lower() != "dollars":
        c.reserve.quote_asset = m.group(2).upper()


@_p(
    r"(?:no more than|never put more than|max(?:imum)?)\s*"
    + _NUM
    + r"\s*%\s*(?:of (?:the |my )?portfolio )?(?:in(?:to)?|per)\s*(?:one|a single|each)\s*(?:company|stock|ticker|underlying)"
)
def _concentration(c: PortfolioConstitution, m: re.Match):
    c.concentration.max_single_underlying_pct = Decimal(m.group(1))


@_p(
    r"(?:no more than|never put more than|max(?:imum)?)\s*"
    + _NUM
    + r"\s*%\s*(?:of (?:the |my )?portfolio )?(?:in(?:to)?|per)\s*(?:one|a single|each)\s*(?:platform|issuer|provider)"
)
def _concentration_platform(c: PortfolioConstitution, m: re.Match):
    c.concentration.max_single_platform_pct = Decimal(m.group(1))


@_p(
    r"(?:never pay more than|pay no more than|max(?:imum)? premium(?: of)?|no more than)\s*"
    + _NUM
    + r"\s*(?:bps|basis points)\s*(?:over|above|premium)?"
)
def _premium(c: PortfolioConstitution, m: re.Match):
    c.execution.max_premium_bps = Decimal(m.group(1))


@_p(r"max(?:imum)?(?: expected)? slippage\s*(?:of)?\s*" + _NUM + r"\s*(?:bps|basis points)?")
def _slippage(c: PortfolioConstitution, m: re.Match):
    c.execution.max_slippage_bps = Decimal(m.group(1))


@_p(
    r"when (?:the )?(?:underlying )?(?:stock )?market is closed[^.]*?max(?:imum)? premium\s*(?:of|is)?\s*"
    + _NUM
    + r"\s*(?:bps|basis points)"
)
def _closed_premium(c: PortfolioConstitution, m: re.Match):
    c.market_hours.max_premium_bps_when_closed = Decimal(m.group(1))


@_p(r"(?:never trade|do not trade|don't trade|block)[^.]*when (?:the )?market is closed")
def _no_closed(c: PortfolioConstitution, m: re.Match):
    c.market_hours.allow_when_closed = False


@_p(r"(?:always )?(?:ask|confirm|require confirmation)[^.]*(?:over|above|more than)\s*\$?" + _NUM)
def _confirm_above(c: PortfolioConstitution, m: re.Match):
    c.confirmation.confirm_above_usd = Decimal(m.group(1))


@_p(r"(?:ask me|require confirmation|confirm)[^.]*every transaction(?!\s*(?:over|above|more than)\s*\$?\d)")
def _confirm_always(c: PortfolioConstitution, m: re.Match):
    c.confirmation.always_confirm = True


@_p(r"(?:every transaction|all transactions|each trade) must simulate")
def _sim_required(c: PortfolioConstitution, m: re.Match):
    c.execution.require_simulation = True


@_p(r"(?:reject|stale)[^.]*?(?:older than|stale(?:r)? than)\s*" + _NUM + r"\s*(seconds?|minutes?|hours?)")
def _stale(c: PortfolioConstitution, m: re.Match):
    mult = {"second": 1, "minute": 60, "hour": 3600}[m.group(2).rstrip("s")]
    c.reference.max_reference_age_s = int(Decimal(m.group(1)) * mult)


@_p(
    r"only trade (?:approved )?(?:platforms?|issuers?)\s*:?\s*([a-z,\s]+)"
    r"|only\s+(?:(?:use|trade|on|via)\s+)?((?:ondo|xstocks?|bstocks?)\b[a-z,\s]*)"
)
def _platforms(c: PortfolioConstitution, m: re.Match):
    src = m.group(1) or m.group(2)
    names = [
        n.strip().lower()
        for n in re.split(r"[,\s]+and\s+|,\s*|\s+and\s+|\s+", src)
        if n.strip().rstrip(".") in {"ondo", "xstocks", "xstock", "bstocks", "bstock"}
    ]
    if names:
        norm = {"xstock": "xstocks", "bstock": "bstock", "bstocks": "bstock"}
        c.representation.allowed_platforms = sorted({norm.get(n, n) for n in names})


@_p(r"(?:never|do not|don't) (?:execute|trade|use)[^.]*unknown contract")
def _no_unknown(c: PortfolioConstitution, m: re.Match):
    c.representation.require_security_audit = True


@_p(r"require (?:issuer )?attestation")
def _attestation(c: PortfolioConstitution, m: re.Match):
    c.representation.require_attestation = True


@_p(r"autonomous[^.]*?(?:at most|up to|max(?:imum)?)\s*\$?" + _NUM + r"\s*(?:per day|daily|a day)")
def _autonomous(c: PortfolioConstitution, m: re.Match):
    c.automation.max_autonomous_daily_usd = Decimal(m.group(1))
    c.automation.allow_autonomous_rebalance = True


@_p(
    r"(?:never spend more than|max(?:imum)?(?: single)? (?:transaction|trade|order)(?: size)?(?: of)?|per transaction)\s*\$?"
    + _NUM
)
def _max_notional(c: PortfolioConstitution, m: re.Match):
    c.execution.max_notional_usd = Decimal(m.group(1))


@_p(r"(?:never|no) unlimited (?:approvals?|allowances?)")
def _no_unlimited(c: PortfolioConstitution, m: re.Match):
    c.execution.allow_unlimited_approval = False


def compile_policy(text: str) -> tuple[PortfolioConstitution, list[str]]:
    """Compile natural language into a typed constitution.

    Returns (constitution, matched_rule_descriptions). Unmatched sentences are
    reported so the user sees exactly what did NOT compile — never silently.
    """
    c = PortfolioConstitution()
    applied: list[str] = []
    covered = [False] * len(text)
    for pattern, fn in _PATTERNS:
        for m in pattern.finditer(text):
            fn(c, m)
            applied.append(m.group(0).strip())
            for i in range(m.start(), min(m.end(), len(text))):
                covered[i] = True
    return c, applied


def uncovered_fragments(text: str) -> list[str]:
    """Sentences that no rule matched — surfaced to the user verbatim."""
    out = []
    c = PortfolioConstitution()
    covered = [False] * len(text)
    for pattern, fn in _PATTERNS:
        for m in pattern.finditer(text):
            fn(c, m)
            for i in range(m.start(), m.end()):
                covered[i] = True
    for sent in re.split(r"(?<=[.!?\n])\s+", text):
        s = sent.strip()
        if not s:
            continue
        idx = text.find(s)
        if idx >= 0 and not any(covered[idx : idx + len(s)]):
            out.append(s)
    return out


def compile_with_report(text: str) -> dict:
    c, applied = compile_policy(text)
    return {
        "compilerVersion": POLICY_COMPILER_VERSION,
        "constitution": c.model_dump(mode="json"),
        "matchedRules": applied,
        "uncompiledSentences": uncovered_fragments(text),
    }
