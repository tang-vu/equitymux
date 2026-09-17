"""Verify receipt provenance: dataLabel inside hashed body, hash recomputable.

Usage: python scripts/check-receipt-provenance.py [base_url]
"""
import hashlib
import json
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001"


def post(path, body):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    return json.load(urllib.request.urlopen(req))


def get(path):
    return json.load(urllib.request.urlopen(BASE + path))


def canon(d):
    return json.dumps(d, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


health = get("/api/health")
print("health.demoMode:", health["demoMode"])

try:
    res = post("/api/intent", {"text": "buy $10 of NVDA", "mode": "auto"})
except urllib.error.HTTPError as e:
    detail = e.read().decode()[:300]
    print(f"intent failed: HTTP {e.code} {detail}")
    if "constitution" in detail:
        print("hint: approve a constitution first — POST /api/constitution/compile "
              "then /api/constitution/approve (or use the /constitution page)")
    sys.exit(1)
receipt = res["receipt"]
rid = receipt["receiptId"]
print("receiptId:", rid)
print("dataLabel:", receipt.get("dataLabel"))
assert receipt.get("dataLabel") == ("RECORDED" if health["demoMode"] else "LIVE"), "dataLabel mismatch"

# server-side verify
v = get(f"/api/receipts/{rid}/verify")
print("server verify:", v)

# client-side recompute (same canonical rules as apps/web/lib/canonical.ts)
body = {k: val for k, val in receipt.items() if k not in ("receiptHash", "receipt_hash")}
h = "0x" + hashlib.sha256(canon(body).encode()).hexdigest()
print("client recompute:", h)
print("receiptHash    :", receipt["receiptHash"])
assert h == receipt["receiptHash"], "HASH MISMATCH"
print("PROVENANCE OK: dataLabel is inside the hashed body and the hash recomputes")
