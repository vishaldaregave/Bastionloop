from __future__ import annotations

from pathlib import Path

from bastion_core.canonical import b64d, hash_object
from bastion_core.crypto import sign_bytes, verify_bytes
from bastion_core.ledger import GENESIS_HASH, Ledger, build_checkpoint
from bastion_core.merkle import merkle_root
from bastion_core.pcf import attach_signature, build_pcf
from bastion_core.signing import anchor_entry_hash, checkpoint_signing_input, pcf_signing_input
from bastion_core.verify import verify_pcf


def test_signature_attaches_exact_signed_bytes(keys):
    pcf = {
        "finding_id": "finding_test_01",
        "finding_type": "model-leak",
        "ledger": {"events": []},
        "chain": {"seq": 1, "event_hash": "00"},
    }
    signature = {
        "key_id": keys["ids"]["signer"],
        "signature": sign_bytes(keys["signer"], pcf_signing_input(pcf)),
        "algorithm": "ed25519",
        "domain": "bastionloop-pcf-v1",
    }
    signed = attach_signature(pcf, signature)
    payload = b64d(signed["signatures"]["signer"]["payload_b64"])
    assert payload == pcf_signing_input(pcf)
    assert verify_bytes(keys["signer_pub"], payload, signed["signatures"]["signer"]["signature"])


def test_tampering_with_signed_fields_does_not_reuse_the_signature(keys):
    pcf = {"finding_id": "finding_test_02", "ledger": {}, "chain": {}}
    signature = {
        "key_id": keys["ids"]["signer"],
        "signature": sign_bytes(keys["signer"], pcf_signing_input(pcf)),
    }
    signed = attach_signature(pcf, signature)
    signed["finding_type"] = "defence-bypass"
    recomputed = pcf_signing_input(signed)
    assert verify_bytes(
        keys["signer_pub"], recomputed, signed["signatures"]["signer"]["signature"]
    ) is False


def test_pcf_remains_valid_when_checkpoint_covers_a_later_event(tmp_path: Path, keys):
    ledger = Ledger(tmp_path / "ledger.db")
    ledger.append("test.one", {"n": 1}, run_id="run_1", tenant_id="red")
    ledger.append("test.two", {"n": 2}, run_id="run_1", tenant_id="red")
    finding_event = ledger.append(
        "finding.created",
        {"finding_id": "finding_test_01"},
        run_id="run_1",
        tenant_id="red",
    )
    ledger.append("ledger.checkpoint", {"counter": 1}, run_id=None, tenant_id="notary")
    hashes = ledger.hashes()
    checkpoint = build_checkpoint(1, len(hashes), hashes[-1], merkle_root(hashes))
    checkpoint["signer_key_id"] = keys["ids"]["signer"]
    checkpoint["signer_sig"] = sign_bytes(keys["signer"], checkpoint_signing_input(checkpoint))
    checkpoint["witness_key_id"] = keys["ids"]["witness"]
    checkpoint["witness_sig"] = sign_bytes(keys["witness"], checkpoint_signing_input(checkpoint))
    checkpoint["anchor_ref"] = "1"
    ledger.save_checkpoint(checkpoint)
    anchor = {
        "counter": 1,
        "upto_seq": len(hashes),
        "last_hash": hashes[-1],
        "merkle_root": checkpoint["merkle_root"],
        "checkpoint_hash": checkpoint["checkpoint_hash"],
        "anchored_at": checkpoint["created_at"],
        "prev_anchor_hash": GENESIS_HASH,
    }
    anchor["anchor_hash"] = anchor_entry_hash(anchor)
    export = ledger.export()
    export["anchor_entries"] = [anchor]
    reveal = {"cases": [{"case_id": "case_1", "prompt": "synthetic"}]}
    pcf = build_pcf(
        finding_id="finding_test_01",
        finding_type="model-leak",
        severity="high",
        run={
            "run_id": "run_1",
            "tenant_id": "red",
            "mode": "hardened",
            "benchmark_id": "synthetic",
            "benchmark_version": "1",
            "benchmark_digest": hash_object({"benchmark": "synthetic"}),
            "defence_version": "test",
            "model_id": "mock",
            "adapter": "mock",
            "runtime": "test",
        },
        case={"case_id": "case_1", "category": "test", "prompt": "synthetic"},
        verdict={"decision": "block", "score": 0.9, "defence_version": "test"},
        response_hash=hash_object("response"),
        session_id="sess_1",
        freshness_proof={"clean": True},
        payload_commitment=hash_object(reveal),
        payload_reveal=reveal,
        policy={"bundle_hash": "policy-hash", "version": "test"},
        images={"gateway": "sha256:test", "model_adapter": "mock"},
        dlp={"clean": True, "hits": []},
        canary_scan={"clean": True, "channels_scanned": ["egress"]},
        finding_event=finding_event,
        checkpoint=checkpoint,
        anchor_entry=anchor,
        export=export,
    )
    signature = {
        "key_id": keys["ids"]["signer"],
        "signature": sign_bytes(keys["signer"], pcf_signing_input(pcf)),
    }
    signed = attach_signature(pcf, signature)
    report = verify_pcf(signed, keys["pinned"])
    assert report["status"] == "VERIFIED", report["issues"]
    assert report["chain_position"] == finding_event["seq"]
    assert report["ledger"]["head"]["seq"] == len(hashes)
