from __future__ import annotations

import copy
from pathlib import Path

from bastion_core.crypto import sign_bytes
from bastion_core.ledger import GENESIS_HASH, Ledger, build_checkpoint, event_hash
from bastion_core.merkle import merkle_root
from bastion_core.signing import anchor_entry_hash, checkpoint_signing_input
from bastion_core.verify import verify_export


def make_export(tmp_path: Path, keys, count: int = 5):
    ledger = Ledger(tmp_path / "ledger.db")
    for index in range(count):
        ledger.append("test.event", {"index": index}, run_id="run_1", tenant_id="red")
    hashes = ledger.hashes()
    checkpoint = build_checkpoint(1, count, hashes[-1], merkle_root(hashes))
    checkpoint["signer_key_id"] = keys["ids"]["signer"]
    checkpoint["signer_sig"] = sign_bytes(keys["signer"], checkpoint_signing_input(checkpoint))
    checkpoint["witness_key_id"] = keys["ids"]["witness"]
    checkpoint["witness_sig"] = sign_bytes(keys["witness"], checkpoint_signing_input(checkpoint))
    checkpoint["anchor_ref"] = "1"
    ledger.save_checkpoint(checkpoint)
    entry = {
        "counter": 1,
        "upto_seq": count,
        "last_hash": hashes[-1],
        "merkle_root": checkpoint["merkle_root"],
        "checkpoint_hash": checkpoint["checkpoint_hash"],
        "anchored_at": checkpoint["created_at"],
        "prev_anchor_hash": GENESIS_HASH,
    }
    entry["anchor_hash"] = anchor_entry_hash(entry)
    export = ledger.export()
    export["anchor_entries"] = [entry]
    return export, entry


def rechain(events):
    prev = GENESIS_HASH
    for event in events:
        event["prev_hash"] = prev
        record = {
            "event_id": event["event_id"],
            "ts": event["ts"],
            "run_id": event.get("run_id"),
            "tenant_id": event.get("tenant_id"),
            "event_type": event["event_type"],
            "policy_version": event.get("policy_version"),
            "metadata": event.get("metadata", {}),
            "prev_hash": prev,
        }
        event["event_hash"] = event_hash(prev, record)
        prev = event["event_hash"]


def test_clean_export_verifies(tmp_path: Path, keys):
    export, entry = make_export(tmp_path, keys)
    report = verify_export(export, keys["pinned"], [entry], require_anchor=True)
    assert report["status"] == "VERIFIED"
    assert report["counts"]["events"] == 5
    assert report["counts"]["checkpoints"] == 1


def test_edit_one_event_breaks_the_chain(tmp_path: Path, keys):
    export, entry = make_export(tmp_path, keys)
    export["events"][2]["metadata"] = {"tampered": True}
    report = verify_export(export, keys["pinned"], [entry], require_anchor=True)
    assert report["status"] == "FAILED"
    assert report["first_broken_link"]["seq"] == 3


def test_rechain_without_checkpoints_is_caught_by_anchor(tmp_path: Path, keys):
    export, entry = make_export(tmp_path, keys)
    document = copy.deepcopy(export)
    document["events"] = document["events"][:3]
    document["checkpoints"] = []
    document["anchor_entries"] = [entry]
    rechain(document["events"])
    report = verify_export(document, keys["pinned"], [entry], require_anchor=True)
    assert report["status"] == "FAILED"
    codes = {issue["code"] for issue in report["issues"]}
    assert "checkpoints-missing" in codes or "tail-truncation" in codes


def test_truncation_with_checkpoint_is_detected(tmp_path: Path, keys):
    export, entry = make_export(tmp_path, keys)
    document = copy.deepcopy(export)
    document["events"] = document["events"][:4]
    report = verify_export(document, keys["pinned"], [entry], require_anchor=True)
    assert report["status"] == "FAILED"
    assert any(issue["code"] in {"missing-events", "tail-truncation"} for issue in report["issues"])


def test_bad_checkpoint_signature_fails(tmp_path: Path, keys):
    export, entry = make_export(tmp_path, keys)
    export["checkpoints"][0]["witness_sig"] = "not-a-signature"
    report = verify_export(export, keys["pinned"], [entry], require_anchor=True)
    assert report["status"] == "FAILED"
    assert any(issue["code"] == "witness-signature-invalid" for issue in report["issues"])


def test_broken_anchor_chain_fails(tmp_path: Path, keys):
    export, entry = make_export(tmp_path, keys)
    broken = copy.deepcopy(entry)
    broken["prev_anchor_hash"] = "00" * 32
    report = verify_export(export, keys["pinned"], [broken], require_anchor=True)
    assert report["status"] == "FAILED"
    assert any(issue["code"].startswith("anchor") for issue in report["issues"])
