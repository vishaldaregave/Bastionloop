from __future__ import annotations

from typing import Any

from .canonical import canonical_json, hash_object

CHECKPOINT_DOMAIN = "bastionloop-checkpoint-v1"
PCF_DOMAIN = "bastionloop-pcf-v1"
ANCHOR_DOMAIN = "bastionloop-anchor-v1"


def checkpoint_core(checkpoint: dict[str, Any]) -> dict[str, Any]:
    return {
        "counter": checkpoint["counter"],
        "upto_seq": checkpoint["upto_seq"],
        "last_hash": checkpoint["last_hash"],
        "merkle_root": checkpoint["merkle_root"],
        "created_at": checkpoint["created_at"],
    }


def checkpoint_signing_input(checkpoint: dict[str, Any]) -> bytes:
    body = {
        "domain": CHECKPOINT_DOMAIN,
        "checkpoint": checkpoint_core(checkpoint),
        "checkpoint_hash": checkpoint["checkpoint_hash"],
    }
    return canonical_json(body)


def pcf_signing_input(pcf: dict[str, Any]) -> bytes:
    body = {k: v for k, v in pcf.items() if k != "signatures"}
    body["domain"] = PCF_DOMAIN
    return canonical_json(body)


def anchor_signing_input(entry: dict[str, Any]) -> bytes:
    body = {k: v for k, v in entry.items() if k != "anchor_hash"}
    body["domain"] = ANCHOR_DOMAIN
    return canonical_json(body)


def anchor_entry_hash(entry: dict[str, Any]) -> str:
    return hash_object({"domain": ANCHOR_DOMAIN, **{k: v for k, v in entry.items() if k != "anchor_hash"}})
