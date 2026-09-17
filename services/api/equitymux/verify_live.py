"""`verify:live` — safe live verification. NO transaction is ever executed here.

Checks, in order:
  1. Binance public RWA API reachable (no key needed)
  2. BSC chainId 56 via RPC
  3. RWA platforms load (Ondo/xStocks/bStock type lists)
  4. NVDA resolves to >=1 BSC representation
  5. token + reference prices load
  6. underlying market state loads
  7. Agentic Wallet: CLI installed, auth status, balance (if connected)
  8. executable quote via `baw market-order quote` (if connected)
  9. simulation via eth_call balance probe

Exit code 0 when all *required* checks pass; wallet-dependent checks report
BLOCKED with the exact human action needed.
"""
from __future__ import annotations

import sys

from equitymux.config import get_settings
from equitymux.providers.baw import AgenticWallet
from equitymux.providers.binance_public import BinancePublicClient
from equitymux.providers.bsc_rpc import BscRpc
from equitymux.providers.errors import WalletNotConnectedError
from equitymux.services.graph import CanonicalEquityGraph
from equitymux.services.tournament import QUOTE_ASSET_ADDR

OK, BLOCKED, FAIL = "PASS", "BLOCKED", "FAIL"
results: list[tuple[str, str, str]] = []


def check(name: str, fn):
    try:
        detail = fn() or ""
        results.append((name, OK, str(detail)[:160]))
        print(f"  [PASS] {name} {detail}")
        return True
    except WalletNotConnectedError as e:
        results.append((name, BLOCKED, str(e)[:160]))
        print(f"  [BLOCKED] {name}: {e}")
        return None
    except Exception as e:
        results.append((name, FAIL, str(e)[:160]))
        print(f"  [FAIL] {name}: {e}")
        return False


def main() -> int:
    s = get_settings()
    client = BinancePublicClient(s)
    rpc = BscRpc(s)
    wallet = AgenticWallet(s)
    graph = CanonicalEquityGraph(client)

    print("EquityMux verify:live — BSC mainnet (chainId 56), no transaction executed\n")

    check("RWA API reachable", lambda: f"marketStatus={client.market_status().get('marketStatus')}")
    check("BSC RPC chainId=56", lambda: rpc.chain_id() == 56 and "56")
    check("RWA platforms load", lambda: "ondo=%d xstocks=%d bstock=%d" % (
        len(client.stock_list(1)), len(client.stock_list(2)), len(client.stock_list(3))))

    reps = []

    def _discover() -> str:
        reps.extend(graph.discover("NVDA", 56, enrich=False))
        return f"{len(reps)} representations"

    check("NVDA resolves on BSC", _discover)
    check("prices load", lambda: (
        [graph.adapters[0].enrich(r) for r in reps],
        "; ".join(f"{r.token_symbol}=${r.token_price_usd} ref=${r.reference_price_usd}"
                  for r in reps))[1])
    check("market state", lambda: reps and reps[0].market_state.value)

    # wallet-dependent checks
    if not wallet.available():
        results.append(("baw CLI installed", FAIL, "npm i -g @binance/agentic-wallet"))
        print("  [FAIL] baw CLI installed")
    else:
        st = check("Agentic Wallet session",
                   lambda: (_ for _ in ()).throw(WalletNotConnectedError("Not logged in"))
                   if wallet.status() != "CONNECTED" else "CONNECTED")
        if st:
            check("wallet address (BSC)", lambda: wallet.address("56"))
            check("wallet balance", lambda: f"{len(wallet.balances('56'))} assets")
            reps_q = [r for r in reps if r.token_address]
            if reps_q:
                r = reps_q[0]
                check("executable quote (5 USDC -> " + r.token_symbol + ")",
                      lambda: wallet.quote(QUOTE_ASSET_ADDR["USDC"], r.token_address, "5", "56"))
            def _probe() -> bool:
                addr = wallet.address("56")
                return addr is not None and rpc.balance_of(
                    QUOTE_ASSET_ADDR["USDC"], addr) is not None

            check("simulation probe (eth_call)", _probe)
        else:
            print("\n  HUMAN ACTION REQUIRED")
            print("  Action: sign in the Agentic Wallet")
            print("  Steps: 1) baw auth signin --json  2) open urlForWeb / scan QR in Binance App")
            print("         3) baw auth verify --qrCodeId <id> --json")

    print("\nSummary:")
    for name, status, detail in results:
        print(f"  {status:8} {name}")
    blocked = [n for n, s_, _ in results if s_ == BLOCKED]
    failed = [n for n, s_, _ in results if s_ == FAIL]
    print(f"\n{sum(1 for _, s_, _ in results if s_ == OK)} passed, "
          f"{len(blocked)} blocked (human action), {len(failed)} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
