from __future__ import annotations

import json
import threading
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from bastion_core.canonical import utcnow
from bastion_core.config import ensure_dirs, settings
from bastion_core.ledger import GENESIS_HASH
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
def write_anchor(record: AnchorRecord) -> dict[str, Any]:
    with _lock:
        entries = _load()
        existing = [e for e in entries if int(e["counter"]) == record.counter]
        if existing:
            if existing[0]["checkpoint_hash"] != record.checkpoint_hash:
                raise HTTPException(status_code=409, detail="anchor counter already binds a different checkpoint")
            return existing[0]
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
