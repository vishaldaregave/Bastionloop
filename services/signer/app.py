from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from bastion_core.canonical import hash_object
from bastion_core.config import ensure_dirs, settings
from bastion_core.crypto import ensure_keypair, key_id, load_private_key, sign_bytes
from bastion_core.signing import checkpoint_signing_input, pcf_signing_input

SERVICE = "signer"
app = FastAPI(title="BastionLoop signer")
_s = ensure_dirs(settings())
if _s.allow_key_gen:
    ensure_keypair("signer", _s.keys_dir, _s.pinned_dir)
try:
    SIGNER_KEY = load_private_key(_s.keys_dir / "signer.pem")
except Exception as exc:  # pragma: no cover - startup configuration error
    raise RuntimeError(f"signer key unavailable: {exc}") from exc
SIGNER_KEY_ID = key_id(SIGNER_KEY.public_key())


class CheckpointRequest(BaseModel):
    checkpoint: dict[str, Any]


class PcfRequest(BaseModel):
    pcf: dict[str, Any]


@app.get("/v1/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": SERVICE, "key_id": SIGNER_KEY_ID, "holds_key": True}


@app.post("/v1/sign/checkpoint")
def sign_checkpoint(request: CheckpointRequest) -> dict[str, Any]:
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
    signature = sign_bytes(SIGNER_KEY, checkpoint_signing_input(checkpoint))
    return {
        "key_id": SIGNER_KEY_ID,
        "signature": signature,
        "algorithm": "ed25519",
        "domain": "bastionloop-checkpoint-v1",
    }


@app.post("/v1/sign/pcf")
def sign_pcf(request: PcfRequest) -> dict[str, Any]:
    pcf = request.pcf
    if not pcf.get("finding_id") or not pcf.get("ledger") or not pcf.get("chain"):
        raise HTTPException(status_code=400, detail="PCF must include finding_id, ledger and chain")
    if pcf.get("signatures"):
        raise HTTPException(status_code=400, detail="refusing to sign a document that already has signatures")
    signature = sign_bytes(SIGNER_KEY, pcf_signing_input(pcf))
    return {
        "key_id": SIGNER_KEY_ID,
        "signature": signature,
        "algorithm": "ed25519",
        "domain": "bastionloop-pcf-v1",
    }
