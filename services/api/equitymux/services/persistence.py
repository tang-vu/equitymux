"""SQLite persistence for constitutions, receipts, transitions, audit log."""
from __future__ import annotations

import json
import sqlite3
import threading
from datetime import UTC, datetime
from pathlib import Path

from equitymux.config import DB_PATH

_LOCK = threading.Lock()
_DB = Path(DB_PATH)


def _conn() -> sqlite3.Connection:
    _DB.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(str(_DB), check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def init_db() -> None:
    with _LOCK, _conn() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS constitutions (
            hash TEXT PRIMARY KEY,
            nl_text TEXT NOT NULL,
            canonical_json TEXT NOT NULL,
            compiler_version TEXT NOT NULL,
            approved_at TEXT,
            created_at TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 0,
            revision INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS receipts (
            receipt_id TEXT PRIMARY KEY,
            receipt_hash TEXT NOT NULL,
            state TEXT NOT NULL,
            intent_json TEXT NOT NULL,
            receipt_json TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS transitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receipt_id TEXT NOT NULL,
            state TEXT NOT NULL,
            at TEXT NOT NULL,
            note TEXT
        );
        CREATE TABLE IF NOT EXISTS agent_tasks (
            task_id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            input_json TEXT NOT NULL,
            status TEXT NOT NULL,
            output_json TEXT,
            created_at TEXT NOT NULL,
            completed_at TEXT
        );
        """)


def save_constitution(nl_text: str, canonical: dict, compiler_version: str,
                      chash: str, approved: bool) -> None:
    now = datetime.now(UTC).isoformat()
    with _LOCK, _conn() as c:
        prev = c.execute("SELECT MAX(revision) r FROM constitutions").fetchone()["r"] or 0
        if approved:
            c.execute("UPDATE constitutions SET active=0")
        c.execute(
            "INSERT OR REPLACE INTO constitutions(hash,nl_text,canonical_json,compiler_version,approved_at,created_at,active,revision)"
            " VALUES(?,?,?,?,?,?,?,?)",
            (chash, nl_text, json.dumps(canonical, sort_keys=True, default=str),
             compiler_version, now if approved else None, now,
             1 if approved else 0, prev + 1))


def active_constitution() -> dict | None:
    with _LOCK, _conn() as c:
        row = c.execute(
            "SELECT * FROM constitutions WHERE active=1 ORDER BY created_at DESC LIMIT 1"
        ).fetchone()
        return dict(row) if row else None


def constitution_history() -> list[dict]:
    with _LOCK, _conn() as c:
        return [dict(r) for r in c.execute(
            "SELECT hash,compiler_version,approved_at,created_at,active,revision,nl_text"
            " FROM constitutions ORDER BY revision DESC").fetchall()]


def save_receipt(rec: dict) -> None:
    now = datetime.now(UTC).isoformat()
    with _LOCK, _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO receipts(receipt_id,receipt_hash,state,intent_json,receipt_json,created_at)"
            " VALUES(?,?,?,?,?,?)",
            (rec["receiptId"], rec["receiptHash"], rec["state"],
             json.dumps(rec["intent"], default=str),
             json.dumps(rec, default=str), now))
        for t in rec.get("transitions", []):
            c.execute("INSERT INTO transitions(receipt_id,state,at,note) VALUES(?,?,?,?)",
                      (rec["receiptId"], t["state"], t["at"], t.get("note")))


def list_receipts(limit: int = 50) -> list[dict]:
    with _LOCK, _conn() as c:
        return [dict(r) for r in c.execute(
            "SELECT receipt_id,receipt_hash,state,created_at,intent_json FROM receipts"
            " ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()]


def get_receipt(receipt_id: str) -> dict | None:
    with _LOCK, _conn() as c:
        row = c.execute("SELECT receipt_json FROM receipts WHERE receipt_id=?",
                        (receipt_id,)).fetchone()
        return json.loads(row["receipt_json"]) if row else None


def save_task(task_id: str, kind: str, inp: dict) -> None:
    with _LOCK, _conn() as c:
        c.execute(
            "INSERT OR REPLACE INTO agent_tasks(task_id,kind,input_json,status,created_at)"
            " VALUES(?,?,?,?,?)",
            (task_id, kind, json.dumps(inp, default=str), "QUEUED",
             datetime.now(UTC).isoformat()))


def finish_task(task_id: str, output: dict, status: str = "SUCCEEDED") -> None:
    with _LOCK, _conn() as c:
        c.execute("UPDATE agent_tasks SET status=?, output_json=?, completed_at=? WHERE task_id=?",
                  (status, json.dumps(output, default=str),
                   datetime.now(UTC).isoformat(), task_id))


def list_tasks(limit: int = 50) -> list[dict]:
    with _LOCK, _conn() as c:
        return [dict(r) for r in c.execute(
            "SELECT * FROM agent_tasks ORDER BY created_at DESC LIMIT ?",
            (limit,)).fetchall()]
