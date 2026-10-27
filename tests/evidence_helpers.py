from __future__ import annotations

from pathlib import Path
from typing import Any

from bastion_core.canonical import hash_object
from bastion_core.crypto import sign_bytes
from bastion_core.ledger import GENESIS_HASH, Ledger, build_checkpoint
from bastion_core.merkle import merkle_root
from bastion_core.pcf import attach_signature, build_pcf
from bastion_core.signing import anchor_entry_hash, checkpoint_signing_input, pcf_signing_input


def sign_pcf_document(pcf: dict[str, Any], keys: dict[str, Any]) -> dict[str, Any]:
    signature = {
        "key_id": keys["ids"]["signer"],
        "signature": sign_bytes(keys["signer"], pcf_signing_input(pcf)),
        "algorithm": "ed25519",
        "domain": "bastionloop-pcf-v1",
    }
    return attach_signature(pcf, signature)


def sign_checkpoint(
    counter: int,
    upto_seq: int,
    hashes: list[str],
    keys: dict[str, Any],
) -> dict[str, Any]:
    checkpoint = build_checkpoint(counter, upto_seq, hashes[upto_seq - 1], merkle_root(hashes[:upto_seq]))
    checkpoint["signer_key_id"] = keys["ids"]["signer"]
    checkpoint["signer_sig"] = sign_bytes(keys["signer"], checkpoint_signing_input(checkpoint))
    checkpoint["witness_key_id"] = keys["ids"]["witness"]
    checkpoint["witness_sig"] = sign_bytes(keys["witness"], checkpoint_signing_input(checkpoint))
    return checkpoint


def make_anchor_entry(
    checkpoint: dict[str, Any],
    prev_hash: str = GENESIS_HASH,
) -> dict[str, Any]:
    entry = {
        "counter": checkpoint["counter"],
        "upto_seq": checkpoint["upto_seq"],
        "last_hash": checkpoint["last_hash"],
        "merkle_root": checkpoint["merkle_root"],
        "checkpoint_hash": checkpoint["checkpoint_hash"],
        "anchored_at": checkpoint["created_at"],
        "prev_anchor_hash": prev_hash,
    }
    entry["anchor_hash"] = anchor_entry_hash(entry)
    return entry


def make_valid_pcf(tmp_path: Path, keys: dict[str, Any]) -> dict[str, Any]:
    ledger = Ledger(tmp_path / "evidence.db")
    run = {
        "run_id": "run_pcf",
        "tenant_id": "red",
        "mode": "hardened",
        "benchmark_id": "synthetic",
        "benchmark_version": "1",
        "benchmark_digest": hash_object({"benchmark": "synthetic"}),
        "defence_version": "test",
        "model_id": "mock",
        "adapter": "mock",
        "runtime": "test",
    }
    case = {"case_id": "case_pcf", "category": "test", "prompt": "synthetic test prompt"}
    reveal = {"cases": [{"case_id": case["case_id"], "prompt": case["prompt"]}], "nonce": "test"}
    response_hash = hash_object("synthetic response")
    policy_hash = hash_object({"policy": "test"})
    commitment = hash_object(reveal)

    ledger.append("run.started", {"run_id": run["run_id"]}, run_id=run["run_id"], tenant_id="red")
    ledger.append(
        "red.payload.committed",
        {"commitment": commitment, "run_id": run["run_id"]},
        run_id=run["run_id"],
        tenant_id="red",
    )
    finding_event = ledger.append(
        "finding.created",
        {
            "finding_id": "finding_pcf",
            "prompt_hash": hash_object(case["prompt"]),
            "response_hash": response_hash,
            "policy_hash": policy_hash,
            "commitment": commitment,
        },
        run_id=run["run_id"],
        tenant_id="red",
        policy_version="test",
    )
    ledger.append(
        "ledger.checkpoint",
        {"counter": 1},
        run_id=None,
        tenant_id="notary",
    )
    hashes = ledger.hashes()
    checkpoint = sign_checkpoint(1, len(hashes), hashes, keys)
    checkpoint["anchor_ref"] = "1"
    ledger.save_checkpoint(checkpoint)
    anchor_entry = make_anchor_entry(checkpoint)
    export = ledger.export()
    export["anchor_entries"] = [anchor_entry]
    ledger.close()

    pcf = build_pcf(
        finding_id="finding_pcf",
        finding_type="model-leak",
        severity="high",
        run=run,
        case=case,
        verdict={"decision": "block", "score": 0.9, "defence_version": "test"},
        response_hash=response_hash,
        session_id="session_pcf",
        freshness_proof={"clean": True},
        payload_commitment=commitment,
        payload_reveal=reveal,
        policy={"bundle_hash": policy_hash, "version": "test"},
        images={"gateway": "sha256:test", "model_adapter": "mock"},
        dlp={"clean": True, "hits": []},
        canary_scan={"clean": True, "channels_scanned": ["egress"]},
        finding_event=finding_event,
        checkpoint=checkpoint,
        anchor_entry=anchor_entry,
        export=export,
    )
    return {
        "pcf": sign_pcf_document(pcf, keys),
        "export": export,
        "anchor_entries": [anchor_entry],
        "anchor_entry": anchor_entry,
        "checkpoint": checkpoint,
        "finding_event": finding_event,
        "hashes": hashes,
        "ledger": ledger,
    }
