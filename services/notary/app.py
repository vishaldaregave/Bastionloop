from __future__ import annotations

import threading
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from bastion_core import events as ev
from bastion_core.canonical import utcnow
from bastion_core.config import ensure_dirs, settings
from bastion_core.http import ServiceError, get_json, post_json
from bastion_core.ledger import GENESIS_HASH, Ledger, build_checkpoint
from bastion_core.merkle import merkle_root
from bastion_core.service_auth import require_internal
from bastion_core.verify import verify_export

SERVICE = "notary"
app = FastAPI(title="BastionLoop notary")
_s = ensure_dirs(settings())
LEDGER = Ledger(_s.data_dir / "ledger" / "events.db")
_checkpoint_lock = threading.Lock()
_creating = threading.local()


class AppendRequest(BaseModel):
    event_type: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    run_id: str | None = None
    tenant_id: str | None = None
    policy_version: str | None = None


def _internal_headers() -> dict[str, str]:
    return {"X-Bastion-Internal": _s.internal_token}


def _append_events(data: dict[str, Any], tenant: str) -> dict[str, Any]:
    return LEDGER.append(
        event_type=data["event_type"],
        metadata=data.get("metadata", {}),
        run_id=data.get("run_id"),
        tenant_id=data.get("tenant_id") or tenant,
        policy_version=data.get("policy_version"),
    )


def _anchor_entries() -> list[dict[str, Any]] | None:
    try:
        payload = get_json(
            _s.service("anchor") + "/v1/anchor",
            "anchor",
            timeout=5.0,
            headers=_internal_headers(),
        )
        return payload.get("entries", [])
    except ServiceError:
        return None


def _anchor_checkpoint(checkpoint: dict[str, Any]) -> dict[str, Any] | None:
    try:
        return post_json(
            _s.service("anchor") + "/v1/anchor",
            {
                "counter": checkpoint["counter"],
                "upto_seq": checkpoint["upto_seq"],
                "last_hash": checkpoint["last_hash"],
                "merkle_root": checkpoint["merkle_root"],
                "checkpoint_hash": checkpoint["checkpoint_hash"],
                "anchored_at": utcnow(),
            },
            "anchor",
            timeout=10.0,
            headers=_internal_headers(),
        )
    except ServiceError:
        return None


def _attach_anchor_ref(counter: int, anchor_ref: str) -> None:
    LEDGER.connection.execute(
        "UPDATE checkpoints SET anchor_ref = ? WHERE counter = ?", (anchor_ref, counter)
    )
    LEDGER.connection.commit()


def anchor_pending(limit: int = 25) -> list[dict[str, Any]]:
    anchored = []
    for checkpoint in LEDGER.checkpoints():
        if checkpoint.get("anchor_ref"):
            continue
        entry = _anchor_checkpoint(checkpoint)
        if entry:
            _attach_anchor_ref(checkpoint["counter"], str(entry["counter"]))
            anchored.append(entry)
        if len(anchored) >= limit:
            break
    return anchored


def create_checkpoint(force: bool = False) -> dict[str, Any]:
    with _checkpoint_lock:
        head_seq = LEDGER.event_count()
        latest = LEDGER.latest_checkpoint()
        if head_seq == 0:
            raise HTTPException(status_code=400, detail="ledger is empty")
        if latest and int(latest["upto_seq"]) >= head_seq and not force:
            return latest
        counter = (int(latest["counter"]) + 1) if latest else 1
        hashes = LEDGER.hashes(head_seq)
        root = merkle_root(hashes)
        checkpoint = build_checkpoint(counter, head_seq, hashes[-1], root)
        try:
            signer = post_json(
                _s.service("signer") + "/v1/sign/checkpoint",
                {"checkpoint": checkpoint},
                "signer",
                timeout=10.0,
                headers=_internal_headers(),
            )
            witness = post_json(
                _s.service("witness") + "/v1/witness/checkpoint",
                {"checkpoint": checkpoint},
                "witness",
                timeout=10.0,
                headers=_internal_headers(),
            )
        except ServiceError as exc:
            raise HTTPException(status_code=502, detail=f"signing plane unavailable: {exc}") from exc
        checkpoint.update(
            {
                "signer_key_id": signer["key_id"],
                "signer_sig": signer["signature"],
                "witness_key_id": witness["key_id"],
                "witness_sig": witness["signature"],
                "anchor_ref": None,
            }
        )
        LEDGER.save_checkpoint(checkpoint)
        entry = _anchor_checkpoint(checkpoint)
        if entry:
            checkpoint["anchor_ref"] = str(entry["counter"])
            _attach_anchor_ref(counter, checkpoint["anchor_ref"])
        LEDGER.append(
            event_type=ev.CHECKPOINT_CREATED,
            metadata={
                "counter": counter,
                "upto_seq": head_seq,
                "checkpoint_hash": checkpoint["checkpoint_hash"],
                "anchor_ref": checkpoint.get("anchor_ref"),
                "signer_key_id": checkpoint["signer_key_id"],
                "witness_key_id": checkpoint["witness_key_id"],
            },
            tenant_id="notary",
            event_id=None,
        )
        return checkpoint


def maybe_checkpoint() -> dict[str, Any] | None:
    if getattr(_creating, "active", False):
        return None
    head = LEDGER.event_count()
    latest = LEDGER.latest_checkpoint()
    covered = int(latest["upto_seq"]) if latest else 0
    if head - covered < _s.checkpoint_every:
        return None
    _creating.active = True
    try:
        return create_checkpoint()
    except HTTPException:
        return None
    finally:
        _creating.active = False


@app.get("/v1/health")
def health() -> dict[str, Any]:
    latest = LEDGER.latest_checkpoint()
    triggers = LEDGER.connection.execute(
        "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger' AND name LIKE 'events_no_%'"
    ).fetchone()["n"]
    return {
        "status": "ok",
        "service": SERVICE,
        "events": LEDGER.event_count(),
        "checkpoints": len(LEDGER.checkpoints()),
        "latest_checkpoint": latest["counter"] if latest else 0,
        "latest_checkpoint_upto_seq": latest["upto_seq"] if latest else 0,
        "append_only_triggers": int(triggers),
        "genesis_hash": GENESIS_HASH,
        "holds_signing_key": False,
    }


@app.post("/v1/ledger/append")
def append_event(request: AppendRequest, _: None = Depends(require_internal)) -> dict[str, Any]:
    data = request.model_dump()
    event = _append_events(data, request.tenant_id or "system")
    checkpoint = maybe_checkpoint()
    return {"event": event, "checkpoint": checkpoint}


@app.post("/v1/checkpoints/create")
def checkpoint_now(_: None = Depends(require_internal)) -> dict[str, Any]:
    return create_checkpoint()


@app.post("/v1/checkpoints/anchor")
def anchor_now(_: None = Depends(require_internal)) -> dict[str, Any]:
    return {"anchored": anchor_pending()}


@app.get("/v1/checkpoints")
def list_checkpoints(_: None = Depends(require_internal)) -> dict[str, Any]:
    return {"checkpoints": LEDGER.checkpoints()}


@app.get("/v1/events")
def list_events(
    since: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=5000),
    _: None = Depends(require_internal),
) -> dict[str, Any]:
    return {"events": LEDGER.events(since=since, limit=limit)}


@app.get("/v1/ledger/export")
def export_ledger(_: None = Depends(require_internal)) -> dict[str, Any]:
    export = LEDGER.export()
    entries = _anchor_entries()
    export["anchor_entries"] = entries
    export["anchor_available"] = entries is not None
    return export


@app.get("/v1/ledger/verify")
def verify_ledger(require_anchor: bool = True, _: None = Depends(require_internal)) -> dict[str, Any]:
    export = LEDGER.export()
    entries = _anchor_entries()
    export["anchor_entries"] = entries
    if entries is None and require_anchor:
        return {
            "status": "FAILED",
            "verified": False,
            "issues": [
                {
                    "code": "anchor-unavailable",
                    "severity": "fatal",
                    "detail": "external anchor service was unreachable",
                }
            ],
        }
    return verify_export(export, _s.pinned_dir, entries, require_anchor=require_anchor)


@app.get("/v1/metrics")
def metrics(_: None = Depends(require_internal)) -> dict[str, Any]:
    rows = LEDGER.connection.execute(
        "SELECT event_type, COUNT(*) AS n FROM events GROUP BY event_type ORDER BY n DESC"
    ).fetchall()
    return {
        "events_total": LEDGER.event_count(),
        "events_by_type": {r["event_type"]: int(r["n"]) for r in rows},
        "checkpoints_total": len(LEDGER.checkpoints()),
    }
