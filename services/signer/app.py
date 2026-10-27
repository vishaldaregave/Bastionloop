from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from bastion_core.canonical import hash_object
from bastion_core.config import ensure_dirs, settings
from bastion_core.crypto import ensure_keypair, key_id, load_private_key, sign_bytes
from bastion_core.pcf import validate_pcf_document
from bastion_core.service_auth import require_internal
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
def sign_checkpoint(request: CheckpointRequest, _: None = Depends(require_internal)) -> dict[str, Any]:
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
    signature = sign_bytes(SIGNER_KEY, checkpoint_signing_input(checkpoint))
    return {
        "key_id": SIGNER_KEY_ID,
        "signature": signature,
        "algorithm": "ed25519",
        "domain": "bastionloop-checkpoint-v1",
    }


@app.post("/v1/sign/pcf")
def sign_pcf(request: PcfRequest, _: None = Depends(require_internal)) -> dict[str, Any]:
    pcf = request.pcf
    defects = validate_pcf_document(pcf, require_signature=False)
    if defects:
        raise HTTPException(status_code=400, detail={"message": "PCF failed required-field validation", "defects": defects})
    if pcf.get("signatures"):
        raise HTTPException(status_code=400, detail="refusing to sign a document that already has signatures")
    signature = sign_bytes(SIGNER_KEY, pcf_signing_input(pcf))
    return {
        "key_id": SIGNER_KEY_ID,
        "signature": signature,
        "algorithm": "ed25519",
        "domain": "bastionloop-pcf-v1",
    }
