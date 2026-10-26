from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from bastion_core.canonical import hash_object
from bastion_core.config import ensure_dirs, settings
from bastion_core.crypto import ensure_keypair, key_id, load_private_key, sign_bytes
from bastion_core.signing import checkpoint_signing_input

SERVICE = "witness"
app = FastAPI(title="BastionLoop witness")
_s = ensure_dirs(settings())
if _s.allow_key_gen:
    ensure_keypair("witness", _s.keys_dir, _s.pinned_dir)
try:
    WITNESS_KEY = load_private_key(_s.keys_dir / "witness.pem")
except Exception as exc:  # pragma: no cover
    raise RuntimeError(f"witness key unavailable: {exc}") from exc
WITNESS_KEY_ID = key_id(WITNESS_KEY.public_key())
STATE_PATH: Path = _s.data_dir / "witness" / "state.json"
STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
_lock = threading.Lock()


class CheckpointRequest(BaseModel):
    checkpoint: dict[str, Any]


def _last_counter() -> int:
    if not STATE_PATH.exists():
        return 0
    try:
        return int(json.loads(STATE_PATH.read_text(encoding="utf-8")).get("last_counter", 0))
    except (ValueError, KeyError):
        return 0


@app.get("/v1/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": SERVICE,
        "key_id": WITNESS_KEY_ID,
        "last_witnessed_counter": _last_counter(),
    }


@app.post("/v1/witness/checkpoint")
def witness_checkpoint(request: CheckpointRequest) -> dict[str, Any]:
    checkpoint = request.checkpoint
    core = {
        "counter": checkpoint.get("counter"),
        "upto_seq": checkpoint.get("upto_seq"),
        "last_hash": checkpoint.get("last_hash"),
        "merkle_root": checkpoint.get("merkle_root"),
        "created_at": checkpoint.get("created_at"),
    }
    if None in core.values():
        raise HTTPException(status_code=400, detail="checkpoint is missing required fields")
    if hash_object(core) != checkpoint.get("checkpoint_hash"):
        raise HTTPException(status_code=400, detail="checkpoint hash is not self-consistent")
    counter = int(checkpoint["counter"])
    with _lock:
        last = _last_counter()
        if counter <= last:
            raise HTTPException(
                status_code=409,
                detail=f"witness already cosigned counter {counter} (last {last}); refusing rollback",
            )
        signature = sign_bytes(WITNESS_KEY, checkpoint_signing_input(checkpoint))
        STATE_PATH.write_text(
            json.dumps({"last_counter": counter, "last_checkpoint_hash": checkpoint["checkpoint_hash"]}, indent=2),
            encoding="utf-8",
        )
    return {
        "key_id": WITNESS_KEY_ID,
        "signature": signature,
        "algorithm": "ed25519",
        "domain": "bastionloop-checkpoint-v1",
        "counter": counter,
    }
