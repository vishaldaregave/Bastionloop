from __future__ import annotations

from typing import Any

from .canonical import b64e, canonical_json, hash_object, utcnow
from .signing import pcf_signing_input

PCF_VERSION = "1.0"

NON_CLAIMS = [
    "Protection from container escape through a host kernel exploit is not claimed.",
    "Hardware side channels (cache, Spectre class) are not claimed.",
    "A compromised host administrator acting before events are signed is not claimed.",
    "GPU memory leakage is not applicable to this CPU-only build and is not claimed.",
    "A pass means the tested control held on the tested path, not that the arena is secure.",
]


def _event_canonical_bytes(event: dict[str, Any]) -> bytes:
    record = {
        "event_id": event["event_id"],
        "ts": event["ts"],
        "run_id": event.get("run_id"),
        "tenant_id": event.get("tenant_id"),
        "event_type": event["event_type"],
        "policy_version": event.get("policy_version"),
        "metadata": event.get("metadata", {}),
        "prev_hash": event["prev_hash"],
    }
    return canonical_json(record)


def _trim_export(export: dict[str, Any], checkpoint: dict[str, Any]) -> dict[str, Any]:
    upto = int(checkpoint["upto_seq"])
    events = [e for e in export.get("events", []) if int(e["seq"]) <= upto]
    anchor_entries = [
        a
        for a in (export.get("anchor_entries") or [])
        if int(a.get("counter", 0)) <= int(checkpoint["counter"])
    ]
    return {
        "genesis_hash": export.get("genesis_hash"),
        "events": events,
        "canonical_records": [
            {"seq": int(e["seq"]), "b64": b64e(_event_canonical_bytes(e))}
            for e in events
        ],
        "checkpoints": [checkpoint],
        "anchor_entries": anchor_entries,
    }


def build_pcf(
    *,
    finding_id: str,
    finding_type: str,
    severity: str,
    run: dict[str, Any],
    case: dict[str, Any],
    verdict: dict[str, Any],
    response_hash: str,
    session_id: str,
    freshness_proof: dict[str, Any],
    payload_commitment: str,
    payload_reveal: Any,
    policy: dict[str, Any],
    images: dict[str, str],
    dlp: dict[str, Any],
    canary_scan: dict[str, Any],
    finding_event: dict[str, Any],
    checkpoint: dict[str, Any],
    anchor_entry: dict[str, Any] | None,
    export: dict[str, Any],
) -> dict[str, Any]:
    evidence_export = _trim_export(export, checkpoint)
    pcf: dict[str, Any] = {
        "pcf_version": PCF_VERSION,
        "finding_id": finding_id,
        "finding_type": finding_type,
        "severity": severity,
        "created_at": utcnow(),
        "run": {
            "run_id": run["run_id"],
            "tenant_id": run["tenant_id"],
            "mode": run["mode"],
            "benchmark_id": run.get("benchmark_id"),
            "benchmark_version": run.get("benchmark_version"),
            "benchmark_digest": run.get("benchmark_digest"),
            "defence_version": run.get("defence_version"),
            "model_id": run.get("model_id"),
            "adapter": run.get("adapter"),
        },
        "attack": {
            "case_id": case["case_id"],
            "category": case.get("category"),
            "prompt_hash": hash_object(case.get("prompt", "")),
        },
        "payload": {
            "commitment": payload_commitment,
            "reveal": payload_reveal,
            "payload_hash": hash_object(payload_reveal),
        },
        "model": {
            "session_id": session_id,
            "response_hash": response_hash,
            "freshness_proof": freshness_proof,
            "adapter": run.get("adapter"),
            "model_id": run.get("model_id"),
        },
        "verdict": {
            "decision": verdict.get("decision"),
            "score": verdict.get("score"),
            "defence_version": verdict.get("defence_version"),
        },
        "policy": {"bundle_hash": policy.get("bundle_hash"), "version": policy.get("version")},
        "images": images,
        "dlp": dlp,
        "canary_scan": canary_scan,
        "chain": {
            "seq": finding_event["seq"],
            "event_id": finding_event["event_id"],
            "event_hash": finding_event["event_hash"],
            "checkpoint": {
                "counter": checkpoint["counter"],
                "upto_seq": checkpoint["upto_seq"],
                "checkpoint_hash": checkpoint["checkpoint_hash"],
                "merkle_root": checkpoint["merkle_root"],
                "signer_key_id": checkpoint.get("signer_key_id"),
                "witness_key_id": checkpoint.get("witness_key_id"),
            },
        },
        "anchor": {"ref": checkpoint.get("anchor_ref"), "entry": anchor_entry},
        "ledger": evidence_export,
        "trust": {
            "runtime": run.get("runtime"),
            "statement": "Isolation claim scoped to the tested path; model safety outcomes are labelled separately.",
            "non_claims": NON_CLAIMS,
        },
    }
    return pcf


def attach_signature(pcf: dict[str, Any], signature: dict[str, Any]) -> dict[str, Any]:
    pcf = dict(pcf)
    signed_bytes = pcf_signing_input(pcf)
    pcf["signatures"] = {
        "signer": {
            "key_id": signature["key_id"],
            "signature": signature["signature"],
            "algorithm": signature.get("algorithm", "ed25519"),
            "domain": signature.get("domain", "bastionloop-pcf-v1"),
            "payload_b64": b64e(signed_bytes),
        }
    }
    return pcf
