"""Route Tournament — build CandidateRoute per representation, evaluate policy,
simulate, score survivors transparently.
"""
from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from equitymux.config import Settings, get_settings
from equitymux.domain.mathx import premium_bps, score_route
from equitymux.domain.models import (
    CandidateRoute,
    EquityIntent,
    ExecutableQuote,
    RouteStatus,
    TokenizedRepresentation,
)
from equitymux.policy.engine import DeterministicPolicyEngine, PortfolioState
from equitymux.providers.baw import AgenticWallet
from equitymux.providers.errors import ProviderError
from equitymux.services.graph import CanonicalEquityGraph

# BSC quote asset addresses (from baw Common Token Addresses table, verified)
QUOTE_ASSET_ADDR = {
    "USDT": "0x55d398326f99059fF775485246999027B3197955",
    "USDC": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    "U": "0xcE24439F2D9C6a2289F741120FE202248B666666",
    "USD1": "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d",
    "BNB": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
}


class RouteTournament:
    def __init__(self, graph: CanonicalEquityGraph | None = None,
                 wallet: AgenticWallet | None = None,
                 settings: Settings | None = None):
        self.s = settings or get_settings()
        if graph is None:
            from equitymux.providers.binance_public import BinancePublicClient
            graph = CanonicalEquityGraph(client=BinancePublicClient(self.s),
                                         platforms=self.s.platforms)
        self.graph = graph
        self.wallet = wallet or AgenticWallet(self.s)

    def build_candidates(self, intent: EquityIntent,
                         reps: list[TokenizedRepresentation]) -> list[CandidateRoute]:
        out: list[CandidateRoute] = []
        for rep in reps:
            c = CandidateRoute(representation=rep)
            if rep.implied_share_price_usd is not None and rep.reference_price_usd:
                try:
                    c.premium_bps = premium_bps(rep.implied_share_price_usd,
                                                rep.reference_price_usd)
                except ValueError:
                    pass
            c.reference_age_s = self.graph.reference_age_seconds(rep)
            if rep.market_state.value in ("CLOSED",) and c.reference_age_s is not None:
                # reference is a *last close* price; mark staleness accordingly
                c.reason_codes.append("MARKET_CLOSED_REFERENCE_IS_LAST_CLOSE")
            out.append(c)
        return out

    def quote_candidates(self, intent: EquityIntent,
                         candidates: list[CandidateRoute]) -> None:
        """Attach executable quotes via the Agentic Wallet boundary."""
        if intent.notional is None or intent.side.value != "BUY":
            reason = ("SELL_UNIMPLEMENTED" if intent.side.value != "BUY"
                      else "NO_NOTIONAL")
            for c in candidates:
                c.status = RouteStatus.NO_QUOTE
                c.reason_codes.append(reason)
            return
        from_token = QUOTE_ASSET_ADDR.get(intent.quote_asset.upper())
        if not from_token:
            for c in candidates:
                c.status = RouteStatus.NO_QUOTE
                c.reason_codes.append("UNSUPPORTED_QUOTE_ASSET")
            return
        if not self.wallet.available():
            for c in candidates:
                c.status = RouteStatus.NO_QUOTE
                c.reason_codes.append("BAW_CLI_UNAVAILABLE")
            return
        try:
            if self.wallet.status() != "CONNECTED":
                for c in candidates:
                    c.status = RouteStatus.NO_QUOTE
                    c.reason_codes.append("WALLET_UNCONNECTED")
                return
        except ProviderError:
            for c in candidates:
                c.status = RouteStatus.NO_QUOTE
                c.reason_codes.append("WALLET_UNCONNECTED")
            return
        for c in candidates:
            try:
                q = self.wallet.quote(from_token, c.representation.token_address,
                                      str(intent.notional), "56")
                to_amt = Decimal(str(q.get("toCoinAmount", "0")))
                c.quote = ExecutableQuote(
                    from_token=from_token, to_token=c.representation.token_address,
                    from_symbol=q.get("fromCoinSymbol", intent.quote_asset),
                    to_symbol=q.get("toCoinSymbol", c.representation.token_symbol),
                    from_amount=Decimal(str(q.get("fromCoinAmount", intent.notional))),
                    to_amount=to_amt,
                    slippage_bps=int(Decimal(str(q.get("slippage", 0))) * 100)
                    if q.get("slippage") is not None else None,
                    obtained_at=datetime.now(UTC).isoformat(),
                    source="baw market-order quote", raw=q,
                )
                c.expected_slippage_bps = (
                    Decimal(c.quote.slippage_bps)
                    if c.quote.slippage_bps is not None else None)
            except ProviderError as e:
                c.status = RouteStatus.NO_QUOTE
                c.reason_codes.append(f"QUOTE_FAILED:{e}")

    def evaluate(self, intent: EquityIntent, candidates: list[CandidateRoute],
                 engine: DeterministicPolicyEngine,
                 state: PortfolioState) -> list[CandidateRoute]:
        for c in candidates:
            if c.status != RouteStatus.ELIGIBLE:
                continue
            ev = engine.evaluate(intent, c, state)
            c.policy = ev
            if not ev.eligible:
                c.status = RouteStatus.REJECTED
                c.reason_codes += [r.rule for r in ev.results if r.status == "FAIL"]
            elif ev.requires_confirmation:
                c.status = RouteStatus.REQUIRES_CONFIRMATION
            if (c.reference_age_s or 0) > (engine.c.reference.max_reference_age_s
                                         or self.s.max_reference_age_s):
                c.status = RouteStatus.STALE_REFERENCE
                c.reason_codes.append("STALE_REFERENCE")
        self._score(candidates)
        return sorted(candidates, key=lambda c: (c.status != RouteStatus.ELIGIBLE
                                                 and c.status != RouteStatus.REQUIRES_CONFIRMATION,
                                                 -(c.score or Decimal(0))))

    def _score(self, candidates: list[CandidateRoute]) -> None:
        for c in candidates:
            if c.status in (RouteStatus.ELIGIBLE, RouteStatus.REQUIRES_CONFIRMATION):
                score, breakdown = score_route(
                    premium=c.premium_bps or Decimal(0),
                    slippage=c.expected_slippage_bps or Decimal(0),
                    reference_age_s=c.reference_age_s or 0,
                    liquidity_usd=c.representation.liquidity.market_cap_usd,
                )
                c.score = score
                c.score_breakdown = breakdown
