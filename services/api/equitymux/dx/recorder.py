"""DX evidence recorder — every Binance/BNB integration interaction lands in
dx/raw/api-events.jsonl. Never records secrets; sensitive fields are redacted.
"""
from __future__ import annotations

import json
import re
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from equitymux.config import DX_DIR

_LOCK = threading.Lock()
_SESSION_ID = uuid.uuid4().hex[:12]
_EVENTS = DX_DIR / "raw" / "api-events.jsonl"
_ISSUES = DX_DIR / "evidence" / "issues.jsonl"

_REDACT_KEYS = re.compile(
    r"(api[-_]?key|secret|signature|authorization|cookie|private[-_]?key|seed|mnemonic|session|password|token[-_]?secret)",
    re.IGNORECASE,
)


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: ("<redacted>" if _REDACT_KEYS.search(str(k)) else _redact(v)) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_redact(v) for v in value]
    return value


def session_id() -> str:
    return _SESSION_ID


def record_event(
    *,
    module: str,
    endpoint: str,
    operation: str,
    method: str = "GET",
    request_shape: Any = None,
    http_status: int | None = None,
    business_code: str | int | None = None,
    latency_ms: float | None = None,
    retry_count: int = 0,
    success: bool = False,
    error_class: str | None = None,
    error_message: str | None = None,
    docs_section: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    ev = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.", time.gmtime())
        + f"{int((time.time() % 1) * 1000):03d}Z",
        "sessionId": _SESSION_ID,
        "module": module,
        "endpoint": endpoint,
        "operation": operation,
        "method": method,
        "requestShape": _redact(request_shape),
        "httpStatus": http_status,
        "businessCode": str(business_code) if business_code is not None else None,
        "latencyMs": round(latency_ms, 1) if latency_ms is not None else None,
        "retryCount": retry_count,
        "success": bool(success),
        "errorClass": error_class,
        "errorMessage": (error_message or "")[:500] or None,
        "docsSection": docs_section,
        "notes": notes,
    }
    _append(_EVENTS, ev)
    return ev


def record_issue(
    *,
    category: str,
    component: str,
    docs_location: str,
    expected: str,
    observed: str,
    reproduction: list[str],
    sanitized_evidence_path: str | None = None,
    impact: str = "",
    workaround: str = "",
    suggested_fix: str = "",
) -> dict[str, Any]:
    issue = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "category": category,
        "component": component,
        "docsLocation": docs_location,
        "expected": expected,
        "observed": observed,
        "reproduction": reproduction,
        "sanitizedEvidencePath": sanitized_evidence_path,
        "impact": impact,
        "workaround": workaround,
        "suggestedFix": suggested_fix,
    }
    _append(_ISSUES, issue)
    return issue


def _append(path: Path, obj: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(obj, separators=(",", ":"), default=str)
    with _LOCK, path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")
