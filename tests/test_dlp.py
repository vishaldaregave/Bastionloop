from __future__ import annotations

import base64

from bastion_core.dlp import scan_payload, scan_text


def test_canary_encodings_are_detected():
    canary = "BLCANARY-TEST-FS-abc123"
    raw = canary.encode()
    samples = [
        canary,
        base64.b64encode(raw).decode(),
        raw.hex(),
        " ".join(canary),
        " ".join(canary.split("-")),
    ]
    for sample in samples:
        hits = scan_text(sample, [canary])
        assert hits, sample
        assert any(hit.kind.startswith("canary") for hit in hits)


def test_secret_patterns_are_detected():
    text = "here is a key sk-ABCDEFGHIJKLMNOPQRSTUV and password=hunter2hunter2"
    hits = scan_text(text, [])
    labels = {hit.label for hit in hits}
    assert "openai-key" in labels
    assert "generic-secret" in labels


def test_payload_scan_reports_channel_and_never_raw_match():
    canary = "BLCANARY-TEST-EGRESS-xyz"
    report = scan_payload({"egress": canary, "logs": "clean"}, [canary])
    assert report["clean"] is False
    assert report["hits"][0]["channel"] == "egress"
    assert canary not in str(report)
