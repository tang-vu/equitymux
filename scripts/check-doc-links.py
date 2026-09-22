"""Check relative Markdown file links in maintained project documentation."""

import re
import subprocess
from pathlib import Path
from urllib.parse import unquote

root = Path(__file__).resolve().parents[1]
paths = subprocess.check_output(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "*.md"],
    cwd=root,
    text=True,
).splitlines()
failures = []
checked = 0
for name in set(paths):
    if "binance-skills-hub" in name or name.startswith("services/keeper/agent/"):
        continue  # Vendored sponsor documentation has its own source tree.
    path = root / name
    if not path.is_file():
        continue
    for match in re.finditer(r"\]\(([^\s)]+)(?:\s+[^)]*)?\)", path.read_text(encoding="utf-8-sig")):
        href = match[1].strip("<>")
        if href.startswith(("#", "/")) or ":" in href:
            continue
        target = unquote(href.split("#")[0].split("?")[0])
        if not target:
            continue
        checked += 1
        if not (path.parent / target).exists():
            failures.append(f"{name}: {href}")
print(f"Checked {checked} relative documentation links")
for failure in failures:
    print(f"BROKEN: {failure}")
raise SystemExit(bool(failures))
