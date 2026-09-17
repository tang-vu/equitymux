#!/usr/bin/env python3
"""Summarize real recorded DX events — never fabricated."""
import json
import sys
from pathlib import Path

DX = Path(__file__).resolve().parent.parent / "dx"


def load(path):
    if not path.exists():
        return []
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def main() -> int:
    issues = load(DX / "evidence" / "issues.jsonl")
    events = load(DX / "raw" / "api-events.jsonl")
    print(f"EquityMux DX summary — {len(issues)} recorded issues, {len(events)} raw events\n")
    for i, iss in enumerate(issues, 1):
        print(f"[{i}] {iss.get('category','?')} :: {iss.get('component','?')}")
        print(f"    expected: {iss.get('expected','')}")
        print(f"    observed: {iss.get('observed','')}")
        if iss.get("workaround"):
            print(f"    workaround: {iss['workaround']}")
        if iss.get("suggestedFix"):
            print(f"    suggested fix: {iss['suggestedFix']}")
        print()
    if not issues:
        print("No DX events recorded yet.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
