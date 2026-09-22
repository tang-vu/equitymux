"""Portable CLI for market analysis and offline receipt replay; never signs."""

import argparse
import json
from pathlib import Path

from equitymux.providers.errors import ProviderError
from equitymux.services.decisions import DecisionRequest, decide, replay


def main() -> None:
    parser = argparse.ArgumentParser(prog="equitymux")
    sub = parser.add_subparsers(dest="command", required=True)
    plan = sub.add_parser("plan", help="Compare exposure; default uses recorded market evidence")
    plan.add_argument("text")
    plan.add_argument("--live", action="store_true")
    plan.add_argument("--out", type=Path)
    verify = sub.add_parser("replay", help="Recompute a downloaded decision without network access")
    verify.add_argument("receipt", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "plan":
            result = decide(DecisionRequest(text=args.text, mode="live" if args.live else "recorded"))
        else:
            result = replay(json.loads(args.receipt.read_text(encoding="utf-8")))
        output = json.dumps(result, indent=2, ensure_ascii=True)
        if args.command == "plan" and args.out:
            args.out.write_text(output + "\n", encoding="utf-8")
        print(output)
        if args.command == "replay" and not all(
            result[k] for k in ("hashMatch", "decisionMatch", "provenanceMatch")
        ):
            raise SystemExit(1)
    except (ValueError, KeyError, OSError, ProviderError) as e:
        parser.exit(2, f"equitymux: {e}\n")


if __name__ == "__main__":
    main()
