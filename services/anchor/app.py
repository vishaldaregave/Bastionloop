from __future__ import annotations

import json
import os
import threading
from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from bastion_core.canonical import utcnow
from bastion_core.config import ensure_dirs, settings
from bastion_core.ledger import GENESIS_HASH
from bastion_core.service_auth import require_internal
from bastion_core.signing import anchor_entry_hash

SERVICE = "anchor"
app = FastAPI(title="BastionLoop external anchor")
_s = ensure_dirs(settings())
ANCHOR_PATH = _s.anchor_file
ANCHOR_PATH.parent.mkdir(parents=True, exist_ok=True)
_lock = threading.Lock()


class AnchorRecord(BaseModel):
    counter: int
    upto_seq: int
    last_hash: str
    merkle_root: str
    checkpoint_hash: str
    anchored_at: str | None = None


def _load() -> list[dict[str, Any]]:
    if not ANCHOR_PATH.exists():
        return []
    entries = []
    for line in ANCHOR_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            entries.append(json.loads(line))
    return entries


def _append(entry: dict[str, Any]) -> None:
    with ANCHOR_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, sort_keys=True) + "\n")
        handle.flush()
        os.fsync(handle.fileno())


def _valid_hash(value: str) -> bool:
    if not isinstance(value, str) or len(value) != 64:
        return False
    try:
        bytes.fromhex(value)
    except ValueError:
        return False
    return True


@app.get("/v1/health")
def health() -> dict[str, Any]:
    entries = _load()
    return {
        "status": "ok",
        "service": SERVICE,
        "entries": len(entries),
        "latest_counter": entries[-1]["counter"] if entries else 0,
    }


@app.get("/v1/anchor")
def list_anchors() -> dict[str, Any]:
    entries = _load()
    return {"entries": entries, "count": len(entries)}


@app.get("/v1/anchor/{counter}")
def get_anchor(counter: int) -> dict[str, Any]:
    for entry in _load():
        if int(entry["counter"]) == counter:
            return entry
    raise HTTPException(status_code=404, detail="anchor entry not found")


@app.post("/v1/anchor")
def write_anchor(record: AnchorRecord, _: None = Depends(require_internal)) -> dict[str, Any]:
    if record.counter < 1 or record.upto_seq < 1:
        raise HTTPException(status_code=400, detail="anchor counter and upto_seq must be positive")
    if not all(_valid_hash(value) for value in (record.last_hash, record.merkle_root, record.checkpoint_hash)):
        raise HTTPException(status_code=400, detail="anchor hashes must be 64-character hex digests")
    with _lock:
        entries = _load()
        existing = [e for e in entries if int(e["counter"]) == record.counter]
        if existing:
            entry = existing[0]
            same = (
                entry.get("upto_seq") == record.upto_seq
                and entry.get("last_hash") == record.last_hash
                and entry.get("merkle_root") == record.merkle_root
                and entry.get("checkpoint_hash") == record.checkpoint_hash
            )
            if not same:
                raise HTTPException(status_code=409, detail="anchor counter already binds a different checkpoint")
            return entry
        expected = (entries[-1]["counter"] + 1) if entries else 1
        if record.counter != expected:
            raise HTTPException(
                status_code=409,
                detail=f"anchor counter {record.counter} is not the next expected counter {expected}",
            )
        prev_hash = entries[-1]["anchor_hash"] if entries else GENESIS_HASH
        entry = {
            "counter": record.counter,
            "upto_seq": record.upto_seq,
            "last_hash": record.last_hash,
            "merkle_root": record.merkle_root,
            "checkpoint_hash": record.checkpoint_hash,
            "anchored_at": record.anchored_at or utcnow(),
            "prev_anchor_hash": prev_hash,
        }
        entry["anchor_hash"] = anchor_entry_hash(entry)
        _append(entry)
    return entry
