"""`verify:mainnet-execution` — REAL mainnet transaction path.

Requires --i-understand-mainnet flag, a CONNECTED Agentic Wallet, and
EXECUTION_ENABLED=true in env. Executes the smallest possible swap through the
full pipeline and produces a verifiable receipt. This is the human-gated proof
step — it is never run by CI and never runs silently.
"""
from __future__ import annotations

import sys
from decimal import Decimal

from equitymux.config import get_settings
from equitymux.domain.models import EquityIntent, Side
from equitymux.policy.engine import PortfolioState
from equitymux.policy.schema import PortfolioConstitution
from equitymux.providers.errors import ProviderError, WalletNotConnectedError
from equitymux.services import persistence
from equitymux.services.pipeline import Pipeline


def main() -> int:
    if "--i-understand-mainnet" not in sys.argv:
        print("Refusing: pass --i-understand-mainnet. This executes a REAL BSC mainnet swap.")
        return 2
    s = get_settings()
    if not s.execution_enabled:
        print("Refusing: EXECUTION_ENABLED=false (system kill switch).")
        return 2
    if s.demo_mode:
        print("Refusing: DEMO_MODE=true — recorded mode cannot execute.")
        return 2

    pipeline = Pipeline(s)
    try:
        if pipeline.wallet.status() != "CONNECTED":
            raise WalletNotConnectedError("Agentic Wallet not connected — run baw auth signin first")
    except ProviderError as e:
        print(f"BLOCKED: {e}")
        return 2

    notional = Decimal(5)  # smallest sane proof trade
    if notional > Decimal(s.max_mainnet_notional_usd):
        print(f"Refusing: notional ${notional} exceeds MAX_MAINNET_NOTIONAL_USD")
        return 2

    print("=== EquityMux mainnet execution proof ===")
    print(f"Buying ${notional} of NVDA exposure on BSC chainId 56.")
    print("Type exactly 'EXECUTE' to continue: ", end="", flush=True)
    if input().strip() != "EXECUTE":
        print("Aborted by user.")
        return 2

    constitution = PortfolioConstitution()  # defaults + system ceilings still apply
    # Real wallet balances — policy math must never run on fabricated numbers.
    # If balances can't be read we fail closed: quote_balance 0 makes reserve
    # rules FAIL rather than pass on a pretend portfolio.
    try:
        bals = pipeline.wallet.balances("56")
        quote_balance = Decimal(0)
        total_value = Decimal(0)
        for b in bals if isinstance(bals, list) else []:
            usd = Decimal(str(b.get("valueUsd") or b.get("usdValue")
                              or b.get("value_usd") or 0))
            total_value += usd
            if str(b.get("asset") or b.get("symbol") or "").upper() == "USDT":
                quote_balance += Decimal(str(b.get("amount") or b.get("qty")
                                             or b.get("balance") or usd))
        state = PortfolioState(quote_asset="USDT", quote_balance=quote_balance,
                               total_value_usd=total_value)
        print(f"wallet: USDT balance ${quote_balance}, total ${total_value}")
    except ProviderError as e:
        print(f"warning: balances unreadable ({e}) — policy sees zero state")
        state = PortfolioState(quote_asset="USDT")
    intent = EquityIntent(raw="mainnet proof trade", ticker="NVDA",
                          side=Side.BUY, notional=notional, quote_asset="USDT")
    result = pipeline.run(intent, constitution, state, confirm=True)
    rec = result["receipt"]
    print(f"\nstate: {result['state']}")
    print(f"receipt: {rec['receiptId']}  hash: {rec['receiptHash']}")
    if rec["execution"].get("txHash"):
        print(f"tx: https://bscscan.com/tx/{rec['execution']['txHash']}")
    return 0 if result["state"] == "CONFIRMED" else 1


if __name__ == "__main__":
    persistence.init_db()
    sys.exit(main())
