from __future__ import annotations

import copy

from bastion_core.canonical import b64e
from bastion_core.crypto import generate_private_key, key_id, sign_bytes
from bastion_core.ledger import GENESIS_HASH, event_hash
from bastion_core.signing import anchor_entry_hash, pcf_signing_input
from bastion_core.verify import verify_export, verify_pcf

from tests.evidence_helpers import make_anchor_entry, sign_checkpoint, sign_pcf_document


def _codes(report: dict) -> set[str]:
    return {issue["code"] for issue in report["issues"]}


def _rechain(events: list[dict]) -> None:
    previous = GENESIS_HASH
    for event in events:
        event["prev_hash"] = previous
        record = {
            "event_id": event["event_id"],
            "ts": event["ts"],
            "run_id": event.get("run_id"),
            "tenant_id": event.get("tenant_id"),
            "event_type": event["event_type"],
            "policy_version": event.get("policy_version"),
            "metadata": event.get("metadata", {}),
            "prev_hash": previous,
        }
        event["event_hash"] = event_hash(previous, record)
        previous = event["event_hash"]


def test_signed_pcf_field_tamper_fails_signature(pcf_bundle, keys):
    pcf = copy.deepcopy(pcf_bundle["pcf"])
    pcf["finding_type"] = "defence-bypass"
    report = verify_pcf(pcf, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert _codes(report) & {"pcf-signature-invalid", "pcf-signature-payload-mismatch"}


def test_payload_reveal_and_commitment_tamper_is_rejected(pcf_bundle, keys):
    reveal_pcf = copy.deepcopy(pcf_bundle["pcf"])
    reveal_pcf["payload"]["reveal"]["nonce"] = "tampered"
    report = verify_pcf(reveal_pcf, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert {"commit-reveal-mismatch", "pcf-payload-hash-mismatch"} <= _codes(report)

    commitment_pcf = copy.deepcopy(pcf_bundle["pcf"])
    commitment_pcf["payload"]["commitment"] = "0" * 64
    report = verify_pcf(commitment_pcf, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert "commit-reveal-mismatch" in _codes(report)


def test_modified_removed_reordered_or_duplicated_ledger_event_fails(pcf_bundle, keys):
    modified = copy.deepcopy(pcf_bundle["export"])
    modified["events"][2]["metadata"] = {"tampered": True}
    report = verify_export(modified, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"
    assert "event-hash-mismatch" in _codes(report)

    removed = copy.deepcopy(pcf_bundle["export"])
    del removed["events"][2]
    report = verify_export(removed, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"
    assert "sequence-gap" in _codes(report)

    reordered = copy.deepcopy(pcf_bundle["export"])
    reordered["events"][1], reordered["events"][2] = reordered["events"][2], reordered["events"][1]
    report = verify_export(reordered, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"
    assert "event-order-invalid" in _codes(report) or "sequence-gap" in _codes(report)

    duplicated = copy.deepcopy(pcf_bundle["export"])
    duplicated["events"].append(copy.deepcopy(duplicated["events"][-1]))
    report = verify_export(duplicated, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"


def test_truncated_and_rechained_ledger_is_caught_by_checkpoint_and_anchor(pcf_bundle, keys):
    truncated = copy.deepcopy(pcf_bundle["export"])
    truncated["events"] = truncated["events"][:-1]
    report = verify_export(truncated, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"
    assert _codes(report) & {"missing-events", "tail-truncation"}

    rolled_back = copy.deepcopy(pcf_bundle["export"])
    rolled_back["events"] = rolled_back["events"][:2]
    _rechain(rolled_back["events"])
    report = verify_export(rolled_back, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"
    assert "tail-truncation" in _codes(report) or "missing-events" in _codes(report)


def test_legacy_pcf_without_exact_payload_bytes_still_verifies(pcf_bundle, keys):
    pcf = copy.deepcopy(pcf_bundle["pcf"])
    del pcf["signatures"]["signer"]["payload_b64"]
    report = verify_pcf(pcf, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "VERIFIED", report["issues"]
    assert "pcf-signature-payload-missing" in _codes(report)


def test_public_key_supplied_only_by_the_pcf_is_not_trusted(pcf_bundle, keys):
    attacker = generate_private_key()
    pcf = copy.deepcopy(pcf_bundle["pcf"])
    pcf["signatures"] = {
        "signer": {
            "key_id": key_id(attacker.public_key()),
            "signature": sign_bytes(attacker, pcf_signing_input(pcf)),
            "algorithm": "ed25519",
            "domain": "bastionloop-pcf-v1",
            "public_key": b64e(attacker.public_key().public_bytes_raw()),
        }
    }
    report = verify_pcf(pcf, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert {"pcf-key-id-mismatch", "pcf-signature-invalid"} <= _codes(report)


def test_checkpoint_contents_signature_and_anchor_are_authenticated(pcf_bundle, keys):
    content = copy.deepcopy(pcf_bundle["export"])
    content["checkpoints"][0]["last_hash"] = "0" * 64
    report = verify_export(content, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"
    assert "checkpoint-hash-mismatch" in _codes(report)

    signature = copy.deepcopy(pcf_bundle["export"])
    signature["checkpoints"][0]["signer_sig"] = "not-a-signature"
    report = verify_export(signature, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"
    assert "signer-signature-invalid" in _codes(report)

    anchor = copy.deepcopy(pcf_bundle["anchor_entry"])
    anchor["merkle_root"] = "0" * 64
    anchor["anchor_hash"] = anchor_entry_hash(anchor)
    report = verify_export(
        copy.deepcopy(pcf_bundle["export"]), keys["pinned"], [anchor], require_anchor=True
    )
    assert report["status"] == "FAILED"
    assert "anchor-merkle-mismatch" in _codes(report)


def test_missing_witness_evidence_is_fatal(pcf_bundle, keys):
    export = copy.deepcopy(pcf_bundle["export"])
    del export["checkpoints"][0]["witness_sig"]
    report = verify_export(export, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"
    assert "witness-signature-invalid" in _codes(report)


def test_missing_anchor_evidence_is_not_reported_as_independent(pcf_bundle, keys):
    pcf = copy.deepcopy(pcf_bundle["pcf"])
    del pcf["ledger"]["anchor_entries"]
    pcf["anchor"]["entry"] = None
    pcf = sign_pcf_document(pcf, keys)
    report = verify_pcf(pcf, keys["pinned"])
    assert report["status"] == "FAILED"
    assert report["anchor_checked"] is False
    assert report["independent_verification"] is False
    assert _codes(report) & {"anchor-missing", "pcf-anchor-entry-missing", "anchor-entry-missing"}


def test_embedded_anchor_is_honestly_labeled_not_independent(pcf_bundle, keys):
    embedded = verify_pcf(copy.deepcopy(pcf_bundle["pcf"]), keys["pinned"])
    assert embedded["status"] == "VERIFIED"
    assert embedded["anchor_checked"] is False
    assert embedded["independent_verification"] is False
    assert "pcf-anchor-not-independent" in _codes(embedded)

    external = verify_pcf(
        copy.deepcopy(pcf_bundle["pcf"]), keys["pinned"], pcf_bundle["anchor_entries"]
    )
    assert external["status"] == "VERIFIED"
    assert external["anchor_checked"] is True
    assert external["independent_verification"] is True
    assert "pcf-anchor-not-independent" not in _codes(external)

    later_checkpoint = sign_checkpoint(2, len(pcf_bundle["hashes"]), pcf_bundle["hashes"], keys)
    later_anchor = make_anchor_entry(later_checkpoint, pcf_bundle["anchor_entry"]["anchor_hash"])
    historical = verify_pcf(
        copy.deepcopy(pcf_bundle["pcf"]),
        keys["pinned"],
        [pcf_bundle["anchor_entry"], later_anchor],
    )
    assert historical["status"] == "VERIFIED", historical["issues"]
    assert historical["independent_verification"] is True


def test_duplicate_stale_and_out_of_order_checkpoints_are_rejected(pcf_bundle, keys):
    first = copy.deepcopy(pcf_bundle["checkpoint"])
    stale = sign_checkpoint(2, 2, pcf_bundle["hashes"], keys)

    duplicate_export = copy.deepcopy(pcf_bundle["export"])
    duplicate_export["checkpoints"] = [first, copy.deepcopy(first)]
    duplicate_export["anchor_entries"] = []
    report = verify_export(duplicate_export, keys["pinned"], [], require_anchor=False)
    assert report["status"] == "FAILED"
    assert "checkpoint-duplicate-counter" in _codes(report)

    stale_export = copy.deepcopy(pcf_bundle["export"])
    stale_export["checkpoints"] = [first, stale]
    stale_export["anchor_entries"] = []
    report = verify_export(stale_export, keys["pinned"], [], require_anchor=False)
    assert report["status"] == "FAILED"
    assert "checkpoint-stale" in _codes(report)

    out_of_order = copy.deepcopy(pcf_bundle["export"])
    out_of_order["checkpoints"] = [stale, first]
    out_of_order["anchor_entries"] = []
    report = verify_export(out_of_order, keys["pinned"], [], require_anchor=False)
    assert report["status"] == "FAILED"
    assert "checkpoint-order-invalid" in _codes(report)


def test_substituted_genesis_and_pcf_chain_references_are_rejected(pcf_bundle, keys):
    export = copy.deepcopy(pcf_bundle["export"])
    export["genesis_hash"] = "0" * 64
    report = verify_export(export, keys["pinned"], pcf_bundle["anchor_entries"], require_anchor=True)
    assert report["status"] == "FAILED"
    assert "genesis-mismatch" in _codes(report)

    pcf = copy.deepcopy(pcf_bundle["pcf"])
    pcf["chain"]["event_id"] = "evt_other"
    pcf = sign_pcf_document(pcf, keys)
    report = verify_pcf(pcf, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert "pcf-chain-event-id-mismatch" in _codes(report)

    pcf = copy.deepcopy(pcf_bundle["pcf"])
    pcf["chain"]["checkpoint"]["merkle_root"] = "0" * 64
    pcf = sign_pcf_document(pcf, keys)
    report = verify_pcf(pcf, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert "pcf-chain-checkpoint-mismatch" in _codes(report)


def test_pcf_schema_domain_algorithm_and_exact_payload_are_validated(pcf_bundle, keys):
    missing = copy.deepcopy(pcf_bundle["pcf"])
    del missing["run"]["mode"]
    missing = sign_pcf_document(missing, keys)
    report = verify_pcf(missing, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert "run.mode:missing" in {issue["detail"] for issue in report["issues"]}

    null_field = copy.deepcopy(pcf_bundle["pcf"])
    null_field["payload"]["reveal"] = None
    null_field = sign_pcf_document(null_field, keys)
    report = verify_pcf(null_field, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert "payload.reveal:null" in {issue["detail"] for issue in report["issues"]}

    wrong_domain = copy.deepcopy(pcf_bundle["pcf"])
    wrong_domain["signatures"]["signer"]["domain"] = "bastionloop-pcf-v2"
    report = verify_pcf(wrong_domain, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert "pcf-signature-domain-mismatch" in _codes(report)

    wrong_algorithm = copy.deepcopy(pcf_bundle["pcf"])
    wrong_algorithm["signatures"]["signer"]["algorithm"] = "rsa"
    report = verify_pcf(wrong_algorithm, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert "pcf-signature-algorithm-unsupported" in _codes(report)

    wrong_payload = copy.deepcopy(pcf_bundle["pcf"])
    wrong_payload["signatures"]["signer"]["payload_b64"] = b64e(b"{}")
    report = verify_pcf(wrong_payload, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert "pcf-signature-payload-mismatch" in _codes(report)


def test_tampered_pcf_anchor_entry_is_detected(pcf_bundle, keys):
    pcf = copy.deepcopy(pcf_bundle["pcf"])
    pcf["anchor"]["entry"]["merkle_root"] = "0" * 64
    pcf = sign_pcf_document(pcf, keys)
    report = verify_pcf(pcf, keys["pinned"], pcf_bundle["anchor_entries"])
    assert report["status"] == "FAILED"
    assert "pcf-anchor-hash-mismatch" in _codes(report)


def test_pcf_rejects_a_ledger_without_checkpoints(pcf_bundle, keys):
    pcf = copy.deepcopy(pcf_bundle["pcf"])
    pcf["ledger"]["checkpoints"] = []
    pcf["ledger"]["anchor_entries"] = []
    pcf["anchor"]["entry"] = None
    pcf = sign_pcf_document(pcf, keys)
    report = verify_pcf(pcf, keys["pinned"])
    assert report["status"] == "FAILED"
    assert _codes(report) & {"pcf-checkpoint-missing", "checkpoints-missing", "anchor-missing"}


def test_export_does_not_leak_the_ledger_path(pcf_bundle):
    assert "db_path" not in pcf_bundle["export"]
