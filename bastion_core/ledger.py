from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from pathlib import Path
from typing import Any

from .canonical import canonical_json, hash_object, sha256_hex, utcnow

GENESIS_HASH = sha256_hex(b"bastionloop:genesis:v1")

SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    ts TEXT NOT NULL,
    run_id TEXT,
    tenant_id TEXT,
    event_type TEXT NOT NULL,
    policy_version TEXT,
    metadata TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    event_hash TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE TABLE IF NOT EXISTS checkpoints (
    counter INTEGER PRIMARY KEY,
    upto_seq INTEGER NOT NULL,
    last_hash TEXT NOT NULL,
    merkle_root TEXT NOT NULL,
    checkpoint_hash TEXT NOT NULL UNIQUE,
    signer_key_id TEXT,
    signer_sig TEXT,
    witness_key_id TEXT,
    witness_sig TEXT,
    anchor_ref TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS events_no_update
BEFORE UPDATE ON events
BEGIN
    SELECT RAISE(ABORT, 'append-only ledger: UPDATE denied');
END;
CREATE TRIGGER IF NOT EXISTS events_no_delete
BEFORE DELETE ON events
BEGIN
    SELECT RAISE(ABORT, 'append-only ledger: DELETE denied');
END;
CREATE TRIGGER IF NOT EXISTS checkpoints_no_delete
BEFORE DELETE ON checkpoints
BEGIN
    SELECT RAISE(ABORT, 'append-only ledger: checkpoint DELETE denied');
END;
"""


class LedgerError(RuntimeError):
    pass


def event_hash(prev_hash: str, record: dict[str, Any]) -> str:
    return sha256_hex(prev_hash.encode("ascii") + canonical_json(record))


def build_checkpoint(counter: int, upto_seq: int, last_hash: str, root: str) -> dict[str, Any]:
    core = {
        "counter": counter,
        "upto_seq": upto_seq,
        "last_hash": last_hash,
        "merkle_root": root,
        "created_at": utcnow(),
    }
    return {**core, "checkpoint_hash": hash_object(core)}


class Ledger:
    def __init__(self, db_path: Path | str):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False, timeout=30)
        self._conn.row_factory = sqlite3.Row
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL")
            self._conn.execute("PRAGMA synchronous=FULL")
            self._conn.executescript(SCHEMA)
            self._conn.commit()
            self._conn.execute(
                "INSERT OR IGNORE INTO meta(key, value) VALUES ('genesis_hash', ?)",
                (GENESIS_HASH,),
            )
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    @property
    def connection(self) -> sqlite3.Connection:
        return self._conn

    def _last(self) -> tuple[int, str]:
        row = self._conn.execute(
            "SELECT seq, event_hash FROM events ORDER BY seq DESC LIMIT 1"
        ).fetchone()
        if row is None:
            return 0, GENESIS_HASH
        return int(row["seq"]), row["event_hash"]

    def append(
        self,
        event_type: str,
        metadata: dict[str, Any] | None = None,
        run_id: str | None = None,
        tenant_id: str | None = None,
        policy_version: str | None = None,
        event_id: str | None = None,
        ts: str | None = None,
    ) -> dict[str, Any]:
        meta = metadata or {}
        with self._lock:
            last_seq, prev_hash = self._last()
            record = {
                "event_id": event_id or f"evt_{uuid.uuid4().hex}",
                "ts": ts or utcnow(),
                "run_id": run_id,
                "tenant_id": tenant_id,
                "event_type": event_type,
                "policy_version": policy_version,
                "metadata": meta,
                "prev_hash": prev_hash,
            }
            digest = event_hash(prev_hash, record)
            cursor = self._conn.execute(
                """INSERT INTO events
                (event_id, ts, run_id, tenant_id, event_type, policy_version, metadata, prev_hash, event_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    record["event_id"],
                    record["ts"],
                    run_id,
                    tenant_id,
                    event_type,
                    policy_version,
                    canonical_json(meta).decode("utf-8"),
                    prev_hash,
                    digest,
                ),
            )
            self._conn.commit()
            seq = int(cursor.lastrowid)
        return {**record, "seq": seq, "event_hash": digest, "prev_seq": last_seq}

    def events(self, since: int = 0, limit: int = 1000) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM events WHERE seq > ? ORDER BY seq ASC LIMIT ?",
                (since, limit),
            ).fetchall()
        out = []
        for row in rows:
            item = dict(row)
            item["metadata"] = json.loads(item["metadata"])
            out.append(item)
        return out

    def event_count(self) -> int:
        with self._lock:
            row = self._conn.execute("SELECT COUNT(*) AS n FROM events").fetchone()
        return int(row["n"])

    def hashes(self, upto_seq: int | None = None) -> list[str]:
        with self._lock:
            if upto_seq is None:
                rows = self._conn.execute("SELECT event_hash FROM events ORDER BY seq ASC").fetchall()
            else:
                rows = self._conn.execute(
                    "SELECT event_hash FROM events WHERE seq <= ? ORDER BY seq ASC", (upto_seq,)
                ).fetchall()
        return [r["event_hash"] for r in rows]

    def latest_checkpoint(self) -> dict[str, Any] | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM checkpoints ORDER BY counter DESC LIMIT 1"
            ).fetchone()
        return dict(row) if row else None

    def checkpoints(self) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute("SELECT * FROM checkpoints ORDER BY counter ASC").fetchall()
        return [dict(r) for r in rows]

    def save_checkpoint(self, checkpoint: dict[str, Any]) -> None:
        with self._lock:
            self._conn.execute(
                """INSERT INTO checkpoints
                (counter, upto_seq, last_hash, merkle_root, checkpoint_hash,
                 signer_key_id, signer_sig, witness_key_id, witness_sig, anchor_ref, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    checkpoint["counter"],
                    checkpoint["upto_seq"],
                    checkpoint["last_hash"],
                    checkpoint["merkle_root"],
                    checkpoint["checkpoint_hash"],
                    checkpoint.get("signer_key_id"),
                    checkpoint.get("signer_sig"),
                    checkpoint.get("witness_key_id"),
                    checkpoint.get("witness_sig"),
                    checkpoint.get("anchor_ref"),
                    checkpoint["created_at"],
                ),
            )
            self._conn.commit()

    def meta(self, key: str, default: str | None = None) -> str | None:
        with self._lock:
            row = self._conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else default

    def set_meta(self, key: str, value: str) -> None:
        with self._lock:
            self._conn.execute(
                "INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (key, value),
            )
            self._conn.commit()

    def export(self) -> dict[str, Any]:
        return {
            "genesis_hash": self.meta("genesis_hash", GENESIS_HASH),
            "db_path": str(self.db_path),
            "events": self.events(limit=10_000_000),
            "checkpoints": self.checkpoints(),
            "meta": {
                "event_count": self.event_count(),
                "latest_checkpoint": self.latest_checkpoint(),
            },
        }

    def drop_append_only_triggers(self) -> None:
        """Only for disposable demo ledgers that simulate a DB admin."""
        with self._lock:
            self._conn.executescript(
                """
                DROP TRIGGER IF EXISTS events_no_update;
                DROP TRIGGER IF EXISTS events_no_delete;
                DROP TRIGGER IF EXISTS checkpoints_no_delete;
                """
            )
            self._conn.commit()


def read_ledger_export(path: Path | str) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))
