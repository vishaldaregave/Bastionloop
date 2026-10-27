from __future__ import annotations

from bastion_core.canaries import CHANNELS, CanarySet
from bastion_core.dlp import encoded_variants, scan_payload, scan_text


def test_all_six_canary_channels_are_planted_and_detected():
    canaries = CanarySet.plant("run_test_123456", "red")
    assert set(CHANNELS) == {
        "filesystem",
        "environment",
        "network",
        "logs",
        "model_context",
        "egress",
    }
    assert set(canaries.values) == set(CHANNELS)

    for index, source in enumerate(CHANNELS):
        target = CHANNELS[(index + 1) % len(CHANNELS)]
        scan = canaries.scan({target: canaries.values[source]})
        assert scan["clean"] is False
        assert scan["leaks"][0]["source_channel"] == source
        assert scan["leaks"][0]["leak_channel"] == target

    clean = canaries.scan({channel: "no canary here" for channel in CHANNELS})
    assert clean["clean"] is True
    assert clean["leaks"] == []


def test_every_supported_dlp_encoding_is_detected():
    canary = "BLCANARY-TEST-FILESYSTEM-abcdef1"
    variants = encoded_variants(canary)
    names = {name for name, _ in variants}
    assert names == {
        "plain",
        "lower",
        "base64",
        "base64-nopad",
        "hex",
        "spaced",
        "spaced-hyphenless",
        "dehyphenated",
        "dashed",
    }
    for name, text in variants:
        findings = scan_text(text, [canary])
        assert findings, name
        assert findings[0].kind == "canary"


def test_payload_scan_reports_channel_and_secret_patterns():
    canary = "BLCANARY-TEST-EGRESS-abcdef12"
    payload = {
        "egress": "prefix " + canary + " suffix",
        "logs": "sk-ABCDEFGHIJKLMNOPQRSTUVWX",
    }
    result = scan_payload(payload, [canary])
    assert result["clean"] is False
    assert {hit["channel"] for hit in result["hits"]} == {"egress", "logs"}
    assert any(hit["kind"] == "secret" for hit in result["hits"])


def test_clean_text_and_empty_scan_are_clean():
    assert scan_text("", ["BLCANARY-X"]) == []
    assert scan_text("ordinary text", ["BLCANARY-X"]) == []
