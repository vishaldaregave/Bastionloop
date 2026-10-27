from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from bastion_core.canonical import hash_object
from bastion_core.config import ensure_dirs, settings
from bastion_core.crypto import ensure_keypair, key_id, load_private_key, sign_bytes
from bastion_core.service_auth import require_internal
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


def _load_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return {"last_counter": 0, "last_upto_seq": 0, "last_checkpoint_hash": None}
    try:
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=500,
            detail="witness state is corrupt; refusing to cosign until it is restored",
        ) from exc
    counter = state.get("last_counter") if isinstance(state, dict) else None
    upto = state.get("last_upto_seq", 0) if isinstance(state, dict) else None
    if isinstance(counter, int) and counter > 0 and "last_upto_seq" not in state:
        raise HTTPException(
            status_code=500,
            detail="witness state predates stale-checkpoint protection; restore the signed state backup before cosigning",
        )
    if (
        not isinstance(counter, int)
        or isinstance(counter, bool)
        or counter < 0
        or not isinstance(upto, int)
        or isinstance(upto, bool)
        or upto < 0
    ):
        raise HTTPException(
            status_code=500,
            detail="witness state is invalid; refusing to cosign until it is restored",
        )
    return state


def _last_counter() -> int:
    return int(_load_state()["last_counter"])


@app.get("/v1/health")
def health() -> dict[str, Any]:
    try:
        state = _load_state()
    except HTTPException as exc:
        return {"status": "error", "service": SERVICE, "key_id": WITNESS_KEY_ID, "detail": exc.detail}
    return {
        "status": "ok",
        "service": SERVICE,
        "key_id": WITNESS_KEY_ID,
        "last_witnessed_counter": int(state["last_counter"]),
        "last_witnessed_upto_seq": int(state.get("last_upto_seq", 0)),
    }


@app.post("/v1/witness/checkpoint")
def witness_checkpoint(request: CheckpointRequest, _: None = Depends(require_internal)) -> dict[str, Any]:
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
    if (
        not isinstance(core["counter"], int)
        or isinstance(core["counter"], bool)
        or core["counter"] < 1
        or not isinstance(core["upto_seq"], int)
        or isinstance(core["upto_seq"], bool)
        or core["upto_seq"] < 1
        or not isinstance(core["last_hash"], str)
        or not isinstance(core["merkle_root"], str)
        or not isinstance(core["created_at"], str)
    ):
        raise HTTPException(status_code=400, detail="checkpoint has invalid field types")
    if hash_object(core) != checkpoint.get("checkpoint_hash"):
        raise HTTPException(status_code=400, detail="checkpoint hash is not self-consistent")
    counter = int(checkpoint["counter"])
    upto = int(checkpoint["upto_seq"])
    with _lock:
        state = _load_state()
        last = int(state["last_counter"])
        last_upto = int(state.get("last_upto_seq", 0))
        if counter <= last:
            raise HTTPException(
                status_code=409,
                detail=f"witness already cosigned counter {counter} (last {last}); refusing rollback",
            )
        if upto <= last_upto:
            raise HTTPException(
                status_code=409,
                detail=f"checkpoint {counter} covers seq {upto}, not newer than witnessed seq {last_upto}; refusing stale checkpoint",
            )
        signature = sign_bytes(WITNESS_KEY, checkpoint_signing_input(checkpoint))
        temporary = STATE_PATH.with_suffix(".tmp")
        with temporary.open("w", encoding="utf-8") as handle:
            handle.write(
                json.dumps(
                    {
                        "last_counter": counter,
                        "last_upto_seq": upto,
                        "last_checkpoint_hash": checkpoint["checkpoint_hash"],
                    },
                    indent=2,
                )
            )
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, STATE_PATH)
    return {
        "key_id": WITNESS_KEY_ID,
        "signature": signature,
        "algorithm": "ed25519",
        "domain": "bastionloop-checkpoint-v1",
        "counter": counter,
    }
