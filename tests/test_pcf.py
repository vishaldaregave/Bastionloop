from __future__ import annotations

from bastion_core.canonical import b64d
from bastion_core.crypto import sign_bytes, verify_bytes
from bastion_core.pcf import attach_signature
from bastion_core.signing import pcf_signing_input


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
