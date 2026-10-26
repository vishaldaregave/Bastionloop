from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from bastion_core.ledger import GENESIS_HASH, Ledger, event_hash


def test_hash_chain_and_genesis(tmp_path: Path):
    ledger = Ledger(tmp_path / "ledger.db")
    first = ledger.append("test.one", {"n": 1}, run_id="run_1", tenant_id="red")
    second = ledger.append("test.two", {"n": 2}, run_id="run_1", tenant_id="red")
    assert first["prev_hash"] == GENESIS_HASH
    assert second["prev_hash"] == first["event_hash"]
    record = {
        "event_id": second["event_id"],
        "ts": second["ts"],
        "run_id": second["run_id"],
        "tenant_id": second["tenant_id"],
        "event_type": second["event_type"],
        "policy_version": second["policy_version"],
        "metadata": second["metadata"],
        "prev_hash": second["prev_hash"],
    }
    assert second["event_hash"] == event_hash(second["prev_hash"], record)
    assert ledger.event_count() == 2


def test_append_only_triggers(tmp_path: Path):
    ledger = Ledger(tmp_path / "ledger.db")
    ledger.append("test", {"ok": True})
    with pytest.raises(sqlite3.DatabaseError):
        ledger.connection.execute("UPDATE events SET metadata = '{}' WHERE seq = 1")
    with pytest.raises(sqlite3.DatabaseError):
        ledger.connection.execute("DELETE FROM events WHERE seq = 1")


def test_dropping_triggers_is_explicitly_for_disposable_ledgers(tmp_path: Path):
    ledger = Ledger(tmp_path / "ledger.db")
    ledger.append("test", {"ok": True})
    ledger.drop_append_only_triggers()
    ledger.connection.execute("UPDATE events SET metadata = '{\"tampered\":true}' WHERE seq = 1")
    ledger.connection.commit()
    rows = ledger.events()
    assert rows[0]["metadata"] == {"tampered": True}
