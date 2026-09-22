"""Deterministic Decimal math for policy and route scoring. No floats for money."""

from decimal import ROUND_DOWN, Decimal

BPS = Decimal(10_000)
D0 = Decimal(0)


def dec(v) -> Decimal | None:
    if v is None:
        return None
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


def premium_bps(implied_share_price: Decimal, reference_price: Decimal) -> Decimal:
    """(implied - ref) / ref * 1e4. Positive = token trades above reference."""
    if reference_price <= 0:
        raise ValueError("reference price must be positive")
    return (implied_share_price - reference_price) / reference_price * BPS


def implied_share_price(token_price: Decimal, shares_per_token: Decimal) -> Decimal:
    if shares_per_token <= 0:
        raise ValueError("shares_per_token must be positive")
    return token_price / shares_per_token


def shares_for_notional(notional_usd: Decimal, reference_price: Decimal) -> Decimal:
    if reference_price <= 0:
        raise ValueError("reference price must be positive")
    return notional_usd / reference_price


def tokens_for_notional(notional_usd: Decimal, token_price: Decimal) -> Decimal:
    if token_price <= 0:
        raise ValueError("token price must be positive")
    return notional_usd / token_price


def slippage_bps_from_quote(expected_out: Decimal, actual_out: Decimal) -> Decimal:
    """Positive when actual < expected (worse than quoted)."""
    if expected_out <= 0:
        raise ValueError("expected output must be positive")
    return (expected_out - actual_out) / expected_out * BPS


def quant_usd(v: Decimal, places: int = 6) -> Decimal:
    return v.quantize(Decimal(1).scaleb(-places), rounding=ROUND_DOWN)


def score_route(
    *,
    premium: Decimal,
    slippage: Decimal,
    reference_age_s: int,
    liquidity_usd: Decimal | None,
    weights: dict[str, Decimal] | None = None,
) -> tuple[Decimal, dict[str, Decimal]]:
    """Transparent additive score, higher is better. 100 = perfect.

    Each component is a penalty in [0, 100] subtracted from 100.
    Weights are public and decomposable — no hidden AI score.
    """
    w = weights or {
        "premium": Decimal("1.0"),  # per bps over reference
        "slippage": Decimal("1.0"),  # per expected slippage bps
        "staleness": Decimal("0.05"),  # per second of reference age
        "illiquidity": Decimal(20),  # applied when liquidity unknown/thin
    }
    breakdown: dict[str, Decimal] = {}
    breakdown["premium"] = max(D0, premium) * w["premium"] / Decimal(10)
    breakdown["slippage"] = max(D0, slippage) * w["slippage"] / Decimal(10)
    breakdown["staleness"] = Decimal(reference_age_s) * w["staleness"] / Decimal(60)
    breakdown["illiquidity"] = D0 if (liquidity_usd or D0) > Decimal(1000) else w["illiquidity"]
    total_penalty = sum(breakdown.values())
    score = max(D0, Decimal(100) - total_penalty)
    return score, breakdown
