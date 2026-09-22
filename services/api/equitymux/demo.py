"""One-command judge loop with real recorded data, no wallet and no network."""

import json
from decimal import Decimal
from pathlib import Path

from equitymux.config import REPO_ROOT
from equitymux.services.decisions import DecisionPolicy, DecisionRequest, compare, decide, replay


def main() -> None:
    original = decide(DecisionRequest(text="Buy $10 of NVDA"))
    print("RECORDED MARKET DATA / NO TRANSACTION / NO SIMULATED SETTLEMENT")
    print(original["decision"]["explanation"])
    for route in original["decision"]["routes"]:
        print(
            f"  {route['symbol']:8} {route['status']:12} share price={route['sharePriceUsd']} "
            f"blockers={','.join(route['blockers']) or 'none in observed checks'}"
        )
    revised = compare(original, DecisionPolicy(min_liquidity_usd=Decimal(100000)))
    assert revised["receipt"]["decision"]["state"] == "NO_VALID_ROUTE"
    assert revised["receipt"]["snapshot"] == original["snapshot"]
    print("\nPOLICY CHALLENGE: require $100,000 executable depth -> NO_VALID_ROUTE")
    print("Same snapshot. Unknown liquidity cannot satisfy a required minimum.")
    for bundle in (original, revised["receipt"]):
        result = replay(bundle)
        assert all(result[k] for k in ("hashMatch", "decisionMatch", "provenanceMatch"))
    output: Path = REPO_ROOT / "data" / "judge-demo"
    output.mkdir(parents=True, exist_ok=True)
    (output / "baseline.json").write_text(json.dumps(original, indent=2) + "\n", encoding="utf-8")
    (output / "strict.json").write_text(json.dumps(revised["receipt"], indent=2) + "\n", encoding="utf-8")
    print(f"\nPASS: both receipts replay. Files: {output}")


if __name__ == "__main__":
    main()
