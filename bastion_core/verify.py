from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .canonical import b64d, canonical_json, hash_object, sha256_hex
from .crypto import KeyError_, pinned_key, pinned_key_id, verify_bytes
from .ledger import GENESIS_HASH, event_hash
from .merkle import merkle_root
from .pcf import validate_pcf_document
from .signing import (
    PCF_DOMAIN,
    anchor_entry_hash,
    checkpoint_signing_input,
    pcf_signing_input,
)

FATAL = "fatal"
WARN = "warn"


def _issue(code: str, detail: str, severity: str = FATAL, **extra: Any) -> dict[str, Any]:
    return {"code": code, "severity": severity, "detail": detail, **extra}


def _is_hash(value: Any) -> bool:
    if not isinstance(value, str) or len(value) != 64:
        return False
    try:
        bytes.fromhex(value)
    except ValueError:
        return False
    return True


def verify_chain(events: list[dict[str, Any]], genesis_hash: str = GENESIS_HASH) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    if not isinstance(events, list):
        return {
            "ok": False,
            "issues": [_issue("ledger-format-invalid", "events must be a list")],
            "broken_at": None,
            "events_checked": 0,
            "head_hash": genesis_hash,
        }
    required = ("seq", "event_id", "ts", "event_type", "prev_hash", "event_hash")
    for index, event in enumerate(events):
        if not isinstance(event, dict):
            issues.append(_issue("event-format-invalid", f"event at index {index} is not an object", index=index))
            return {
                "ok": False,
                "issues": issues,
                "broken_at": {"index": index, "reason": "event-format-invalid"},
                "events_checked": index,
                "head_hash": genesis_hash,
            }
        missing = [name for name in required if name not in event]
        if missing:
            issues.append(
                _issue(
                    "event-field-missing",
                    f"event at index {index} is missing {', '.join(missing)}",
                    index=index,
                    fields=missing,
                )
            )
            return {
                "ok": False,
                "issues": issues,
                "broken_at": {"index": index, "reason": "event-field-missing"},
                "events_checked": index,
                "head_hash": genesis_hash,
            }
    expected_prev = genesis_hash
    expected_seq = int(events[0]["seq"]) if events else 1
    if events and expected_seq != 1:
        issues.append(
            _issue(
                "chain-start",
                f"ledger proof starts at sequence {expected_seq}, not the genesis sequence 1",
                seq=expected_seq,
            )
        )
    seen: set[str] = set()
    for event in events:
        seq = int(event["seq"])
        if not _is_hash(event.get("prev_hash")) or not _is_hash(event.get("event_hash")):
            issues.append(
                _issue(
                    "event-hash-invalid",
                    f"event {seq} has a malformed hash",
                    seq=seq,
                    event_id=event.get("event_id"),
                )
            )
            return {
                "ok": False,
                "issues": issues,
                "broken_at": {"seq": seq, "event_id": event.get("event_id"), "reason": "event-hash-invalid"},
                "events_checked": len(seen),
                "head_hash": expected_prev,
            }
        if seq != expected_seq:
            issues.append(_issue("sequence-gap", f"expected seq {expected_seq}, found {seq}", seq=seq))
            return {
                "ok": False,
                "issues": issues,
                "broken_at": {"seq": seq, "event_id": event.get("event_id"), "reason": "sequence-gap"},
                "events_checked": len(seen),
                "head_hash": expected_prev,
            }
        expected_seq += 1
        if event.get("prev_hash") != expected_prev:
            issues.append(
                _issue(
                    "prev-hash-mismatch",
                    f"event {seq} prev_hash does not match stored chain",
                    seq=seq,
                    event_id=event.get("event_id"),
                )
            )
            return {
                "ok": False,
                "issues": issues,
                "broken_at": {
                    "seq": seq,
                    "event_id": event.get("event_id"),
                    "reason": "prev-hash-mismatch",
                },
                "events_checked": len(seen),
                "head_hash": expected_prev,
            }
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
        computed = event_hash(event["prev_hash"], record)
        if computed != event["event_hash"]:
            issues.append(
                _issue(
                    "event-hash-mismatch",
                    f"event {seq} content does not match its hash",
                    seq=seq,
                    event_id=event.get("event_id"),
                )
            )
            return {
                "ok": False,
                "issues": issues,
                "broken_at": {
                    "seq": seq,
                    "event_id": event.get("event_id"),
                    "reason": "event-hash-mismatch",
                },
                "events_checked": len(seen),
                "head_hash": expected_prev,
            }
        if event["event_hash"] in seen:
            issues.append(
                _issue(
                    "duplicate-hash",
                    f"duplicate event hash at {seq}",
                    seq=seq,
                    event_id=event.get("event_id"),
                )
            )
        seen.add(event["event_hash"])
        expected_prev = event["event_hash"]
    if events:
        first = events[0]
        if int(first["seq"]) == 1 and first.get("prev_hash") != genesis_hash:
            issues.append(_issue("bad-genesis", "event 1 does not chain to genesis", seq=1))
    return {
        "ok": not any(i["severity"] == FATAL for i in issues),
        "issues": issues,
        "broken_at": None,
        "events_checked": len(events),
        "head_seq": int(events[-1]["seq"]) if events else 0,
        "head_hash": expected_prev,
    }


def verify_anchor_entries(entries: list[dict[str, Any]]) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    if not isinstance(entries, list):
        return {
            "ok": False,
            "issues": [_issue("anchor-format-invalid", "anchor entries must be a list")],
            "entries": 0,
        }
    required = (
        "counter",
        "upto_seq",
        "last_hash",
        "merkle_root",
        "checkpoint_hash",
        "anchored_at",
        "prev_anchor_hash",
        "anchor_hash",
    )
    prev_hash = GENESIS_HASH
    expected_counter = 1
    prev_upto = 0
    seen_counters: set[int] = set()
    seen_hashes: set[str] = set()
    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            issues.append(_issue("anchor-format-invalid", f"anchor entry at index {index} is not an object", index=index))
            continue
        missing = [name for name in required if name not in entry]
        if missing:
            issues.append(
                _issue(
                    "anchor-field-missing",
                    f"anchor entry at index {index} is missing {', '.join(missing)}",
                    index=index,
                    fields=missing,
                )
            )
            continue
        counter = entry.get("counter")
        if not isinstance(counter, int) or isinstance(counter, bool):
            issues.append(_issue("anchor-counter-invalid", "anchor counter must be an integer", index=index))
            continue
        if counter in seen_counters:
            issues.append(_issue("anchor-duplicate-counter", f"duplicate anchor counter {counter}", counter=counter))
        if counter != expected_counter:
            issues.append(
                _issue(
                    "anchor-counter-gap",
                    f"expected anchor counter {expected_counter}, found {counter}",
                    counter=counter,
                )
            )
        seen_counters.add(counter)
        expected_counter = counter + 1
        if not _is_hash(entry.get("last_hash")) or not _is_hash(entry.get("merkle_root")) or not _is_hash(entry.get("checkpoint_hash")):
            issues.append(_issue("anchor-hash-invalid", f"anchor {counter} has a malformed hash", counter=counter))
        upto = entry.get("upto_seq")
        if not isinstance(upto, int) or isinstance(upto, bool) or upto < 1:
            issues.append(_issue("anchor-upto-invalid", f"anchor {counter} has an invalid upto_seq", counter=counter))
        elif upto <= prev_upto:
            issues.append(
                _issue(
                    "anchor-stale",
                    f"anchor {counter} upto_seq {upto} is not newer than {prev_upto}",
                    counter=counter,
                )
            )
        else:
            prev_upto = upto
        if entry.get("prev_anchor_hash") != prev_hash:
            issues.append(
                _issue(
                    "anchor-chain-break",
                    f"anchor {counter} does not chain to previous anchor",
                    counter=counter,
                )
            )
        try:
            expected_hash = anchor_entry_hash(entry)
        except (KeyError, TypeError, ValueError):
            expected_hash = ""
        if expected_hash != entry.get("anchor_hash"):
            issues.append(
                _issue(
                    "anchor-hash-mismatch",
                    f"anchor {counter} content does not match its hash",
                    counter=counter,
                )
            )
        if entry.get("anchor_hash") in seen_hashes:
            issues.append(_issue("anchor-duplicate-hash", f"duplicate anchor hash for counter {counter}", counter=counter))
        seen_hashes.add(entry.get("anchor_hash"))
        prev_hash = entry.get("anchor_hash", prev_hash)
    return {"ok": not any(i["severity"] == FATAL for i in issues), "issues": issues, "entries": len(entries)}


def _verify_checkpoint(
    checkpoint: dict[str, Any],
    events: list[dict[str, Any]],
    pinned_dir: Path,
    anchor_entries: list[dict[str, Any]] | None,
    require_anchor: bool,
) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    required = ("counter", "upto_seq", "last_hash", "merkle_root", "checkpoint_hash", "created_at")
    if not isinstance(checkpoint, dict):
        return [_issue("checkpoint-format-invalid", "checkpoint is not an object")]
    missing = [name for name in required if name not in checkpoint]
    if missing:
        return [
            _issue(
                "checkpoint-field-missing",
                f"checkpoint is missing {', '.join(missing)}",
                fields=missing,
            )
        ]
    if (
        not isinstance(checkpoint.get("counter"), int)
        or isinstance(checkpoint.get("counter"), bool)
        or not isinstance(checkpoint.get("upto_seq"), int)
        or isinstance(checkpoint.get("upto_seq"), bool)
        or checkpoint["counter"] < 1
        or checkpoint["upto_seq"] < 1
    ):
        return [_issue("checkpoint-field-invalid", "checkpoint counter/upto_seq are invalid")]
    if not _is_hash(checkpoint.get("last_hash")) or not _is_hash(checkpoint.get("merkle_root")):
        return [_issue("checkpoint-hash-invalid", "checkpoint contains a malformed hash")]
    core = {
        "counter": checkpoint["counter"],
        "upto_seq": checkpoint["upto_seq"],
        "last_hash": checkpoint["last_hash"],
        "merkle_root": checkpoint["merkle_root"],
        "created_at": checkpoint["created_at"],
    }
    if hash_object(core) != checkpoint["checkpoint_hash"]:
        issues.append(
            _issue("checkpoint-hash-mismatch", f"checkpoint {checkpoint['counter']} is not self-consistent")
        )
        return issues
    upto = int(checkpoint["upto_seq"])
    covered = [e for e in events if int(e["seq"]) <= upto]
    if len(covered) != upto:
        issues.append(
            _issue(
                "missing-events",
                f"checkpoint {checkpoint['counter']} covers {upto} events but only {len(covered)} are present",
            )
        )
        return issues
    root = merkle_root([e["event_hash"] for e in covered])
    if root != checkpoint["merkle_root"]:
        issues.append(
            _issue(
                "merkle-root-mismatch",
                f"checkpoint {checkpoint['counter']} merkle root does not match events",
            )
        )
    if covered[-1]["event_hash"] != checkpoint["last_hash"]:
        issues.append(
            _issue(
                "checkpoint-last-hash-mismatch",
                f"checkpoint {checkpoint['counter']} last hash does not match event {upto}",
            )
        )
    try:
        signer_pub = pinned_key(pinned_dir, "signer")
        signer_id = pinned_key_id(pinned_dir, "signer")
        if not checkpoint.get("signer_key_id"):
            issues.append(
                _issue("signer-key-id-missing", "checkpoint has no signer key id", severity=WARN)
            )
        elif checkpoint.get("signer_key_id") != signer_id:
            issues.append(_issue("signer-key-id-mismatch", "checkpoint signed by an unpinned signer key"))
        if not checkpoint.get("signer_sig") or not verify_bytes(
            signer_pub, checkpoint_signing_input(checkpoint), checkpoint["signer_sig"]
        ):
            issues.append(_issue("signer-signature-invalid", "checkpoint signer signature is invalid"))
        witness_pub = pinned_key(pinned_dir, "witness")
        witness_id = pinned_key_id(pinned_dir, "witness")
        if not checkpoint.get("witness_key_id"):
            issues.append(
                _issue("witness-key-id-missing", "checkpoint has no witness key id", severity=WARN)
            )
        elif checkpoint.get("witness_key_id") != witness_id:
            issues.append(_issue("witness-key-id-mismatch", "checkpoint cosigned by an unpinned witness key"))
        if not checkpoint.get("witness_sig") or not verify_bytes(
            witness_pub, checkpoint_signing_input(checkpoint), checkpoint["witness_sig"]
        ):
            issues.append(_issue("witness-signature-invalid", "checkpoint witness signature is invalid"))
    except KeyError_ as exc:
        issues.append(_issue("missing-pinned-key", str(exc)))

    if require_anchor:
        if anchor_entries is None:
            issues.append(_issue("anchor-missing", "no anchor entries supplied for verification"))
        else:
            matches = [
                a
                for a in anchor_entries
                if isinstance(a, dict) and int(a.get("counter", -1)) == int(checkpoint["counter"])
            ]
            if not matches:
                issues.append(
                    _issue(
                        "anchor-entry-missing",
                        f"no external anchor entry for checkpoint {checkpoint['counter']}",
                    )
                )
            elif len(matches) > 1:
                issues.append(
                    _issue(
                        "anchor-entry-duplicate",
                        f"multiple anchor entries for checkpoint {checkpoint['counter']}",
                    )
                )
            else:
                anchor = matches[0]
                if anchor.get("checkpoint_hash") != checkpoint["checkpoint_hash"]:
                    issues.append(
                        _issue(
                            "anchor-checkpoint-mismatch",
                            f"anchor {anchor['counter']} does not match checkpoint hash",
                        )
                    )
                if anchor.get("merkle_root") != checkpoint["merkle_root"]:
                    issues.append(
                        _issue(
                            "anchor-merkle-mismatch",
                            f"anchor {anchor['counter']} merkle root does not match checkpoint",
                        )
                    )
                if anchor.get("last_hash") != checkpoint["last_hash"]:
                    issues.append(
                        _issue(
                            "anchor-last-hash-mismatch",
                            f"anchor {anchor['counter']} last hash does not match checkpoint",
                        )
                    )
    return issues


def verify_export(
    export: dict[str, Any],
    pinned_dir: Path,
    anchor_entries: list[dict[str, Any]] | None = None,
    require_anchor: bool = False,
) -> dict[str, Any]:
    if not isinstance(export, dict):
        return {
            "status": "FAILED",
            "verified": False,
            "issues": [_issue("ledger-format-invalid", "ledger export is not an object")],
            "chain": {},
            "anchor": {"ok": False, "issues": [], "entries": 0},
            "counts": {"events": 0, "checkpoints": 0, "anchor_entries": 0},
            "head": {"seq": 0, "event_hash": GENESIS_HASH},
            "first_broken_link": None,
            "anchor_source": "missing",
            "anchor_checked": False,
            "independent_verification": False,
        }

    issues: list[dict[str, Any]] = []
    raw_events = export.get("events", [])
    raw_checkpoints = export.get("checkpoints", [])
    if not isinstance(raw_events, list):
        issues.append(_issue("ledger-format-invalid", "events must be a list"))
        raw_events = []
    if not isinstance(raw_checkpoints, list):
        issues.append(_issue("checkpoint-format-invalid", "checkpoints must be a list"))
        raw_checkpoints = []

    event_objects = [e for e in raw_events if isinstance(e, dict)]
    if len(event_objects) != len(raw_events):
        issues.append(_issue("event-format-invalid", "some events are not objects"))
    raw_event_seqs = [e.get("seq") for e in event_objects]
    if raw_event_seqs != sorted(
        raw_event_seqs,
        key=lambda value: int(value) if isinstance(value, int) and not isinstance(value, bool) else -1,
    ):
        issues.append(_issue("event-order-invalid", "events are not in ascending sequence order"))
    events = sorted(
        event_objects,
        key=lambda event: int(event.get("seq", -1))
        if isinstance(event.get("seq"), int) and not isinstance(event.get("seq"), bool)
        else -1,
    )

    checkpoint_objects = [c for c in raw_checkpoints if isinstance(c, dict)]
    if len(checkpoint_objects) != len(raw_checkpoints):
        issues.append(_issue("checkpoint-format-invalid", "some checkpoints are not objects"))
    raw_counters = [c.get("counter") for c in checkpoint_objects]
    if raw_counters != sorted(
        raw_counters,
        key=lambda value: int(value) if isinstance(value, int) and not isinstance(value, bool) else -1,
    ):
        issues.append(_issue("checkpoint-order-invalid", "checkpoints are not in ascending counter order"))
    checkpoints = sorted(
        checkpoint_objects,
        key=lambda checkpoint: int(checkpoint.get("counter", -1))
        if isinstance(checkpoint.get("counter"), int) and not isinstance(checkpoint.get("counter"), bool)
        else -1,
    )

    seen_counters: set[int] = set()
    seen_checkpoint_hashes: set[str] = set()
    previous_counter = 0
    previous_upto = 0
    for checkpoint in checkpoints:
        counter = checkpoint.get("counter")
        upto = checkpoint.get("upto_seq")
        if not isinstance(counter, int) or isinstance(counter, bool):
            continue
        if counter in seen_counters:
            issues.append(_issue("checkpoint-duplicate-counter", f"duplicate checkpoint counter {counter}", counter=counter))
        if previous_counter and counter != previous_counter + 1:
            issues.append(
                _issue(
                    "checkpoint-counter-gap",
                    f"checkpoint counter jumped from {previous_counter} to {counter}",
                    counter=counter,
                )
            )
        if isinstance(upto, int) and not isinstance(upto, bool) and upto <= previous_upto:
            issues.append(
                _issue(
                    "checkpoint-stale",
                    f"checkpoint {counter} covers seq {upto}, not newer than {previous_upto}",
                    counter=counter,
                )
            )
        if isinstance(upto, int) and not isinstance(upto, bool):
            previous_upto = max(previous_upto, upto)
        previous_counter = counter
        seen_counters.add(counter)
        checkpoint_hash = checkpoint.get("checkpoint_hash")
        if checkpoint_hash in seen_checkpoint_hashes:
            issues.append(
                _issue(
                    "checkpoint-duplicate-hash",
                    f"duplicate checkpoint hash at counter {counter}",
                    counter=counter,
                )
            )
        seen_checkpoint_hashes.add(checkpoint_hash)

    declared_genesis = export.get("genesis_hash")
    if declared_genesis is not None and declared_genesis != GENESIS_HASH:
        issues.append(_issue("genesis-mismatch", "ledger export declares a different genesis hash"))
    chain = verify_chain(events, GENESIS_HASH)
    issues.extend(chain["issues"])

    supplied_anchor = anchor_entries is not None
    if anchor_entries is None:
        embedded = export.get("anchor_entries")
        if embedded is not None:
            anchor_entries = embedded
            anchor_source = "embedded"
        else:
            anchor_source = "missing"
    else:
        anchor_source = "external"
    anchor_checked = (
        anchor_source == "external" and isinstance(anchor_entries, list) and bool(anchor_entries)
    )

    if require_anchor and anchor_source == "missing":
        issues.append(_issue("anchor-missing", "no anchor entries supplied for verification"))
    if require_anchor and anchor_source == "embedded":
        issues.append(
            _issue(
                "anchor-not-independent",
                "anchor entries are embedded in the proof, not fetched from the external anchor",
                severity=WARN,
            )
        )
    if anchor_source == "embedded":
        issues.append(
            _issue(
                "anchor-source-embedded",
                "anchor entries came from the proof itself; independent verification requires an external anchor fetch",
                severity=WARN,
            )
        )

    if anchor_entries is not None:
        anchor_report = verify_anchor_entries(anchor_entries)
        issues.extend(anchor_report["issues"])
    else:
        anchor_report = {"ok": True, "issues": [], "entries": 0}

    for checkpoint in checkpoints:
        issues.extend(
            _verify_checkpoint(checkpoint, events, pinned_dir, anchor_entries, require_anchor)
        )

    if require_anchor and not checkpoints:
        issues.append(_issue("checkpoints-missing", "no signed checkpoint is present in the proof"))

    if checkpoints and events:
        latest = checkpoints[-1]
        latest_upto = latest.get("upto_seq")
        raw_head = events[-1].get("seq")
        head_seq = int(raw_head) if isinstance(raw_head, int) and not isinstance(raw_head, bool) else 0
        if isinstance(latest_upto, int) and not isinstance(latest_upto, bool):
            if latest_upto > head_seq:
                issues.append(
                    _issue(
                        "tail-truncation",
                        f"latest checkpoint covers seq {latest_upto} but ledger ends at {head_seq}",
                    )
                )
            elif latest_upto < head_seq:
                issues.append(
                    _issue(
                        "uncheckpointed-tail",
                        f"{head_seq - latest_upto} events are not covered by a signed checkpoint",
                        severity=WARN,
                    )
                )

    anchor_counters = [
        entry.get("counter")
        for entry in (anchor_entries or [])
        if isinstance(entry, dict) and isinstance(entry.get("counter"), int) and not isinstance(entry.get("counter"), bool)
    ]
    if anchor_counters:
        anchor_max = max(anchor_counters)
        checkpoint_max = max(
            (
                checkpoint.get("counter", 0)
                for checkpoint in checkpoints
                if isinstance(checkpoint.get("counter"), int) and not isinstance(checkpoint.get("counter"), bool)
            ),
            default=0,
        )
        if checkpoint_max < anchor_max:
            issues.append(
                _issue(
                    "checkpoint-rollback",
                    f"ledger has checkpoint {checkpoint_max} but anchor already recorded {anchor_max}",
                )
            )
        if not checkpoints:
            issues.append(
                _issue(
                    "checkpoints-missing",
                    "external anchor entries exist but the ledger has no checkpoints",
                )
            )
        anchor_upto = max(
            (
                entry.get("upto_seq", 0)
                for entry in (anchor_entries or [])
                if isinstance(entry, dict) and isinstance(entry.get("upto_seq"), int)
            ),
            default=0,
        )
        raw_head = events[-1].get("seq") if events else 0
        head_seq = int(raw_head) if isinstance(raw_head, int) and not isinstance(raw_head, bool) else 0
        if head_seq < anchor_upto:
            issues.append(
                _issue(
                    "tail-truncation",
                    f"anchor covers seq {anchor_upto} but ledger ends at {head_seq}",
                )
            )

    fatal = [i for i in issues if i["severity"] == FATAL]
    status = "VERIFIED" if not fatal else "FAILED"
    return {
        "status": status,
        "verified": not fatal,
        "issues": issues,
        "chain": chain,
        "anchor": anchor_report,
        "counts": {
            "events": len(events),
            "checkpoints": len(checkpoints),
            "anchor_entries": len(anchor_entries or []),
        },
        "head": {
            "seq": int(events[-1].get("seq", 0)) if events and isinstance(events[-1].get("seq"), int) else 0,
            "event_hash": events[-1].get("event_hash", GENESIS_HASH) if events else GENESIS_HASH,
        },
        "first_broken_link": chain.get("broken_at"),
        "anchor_source": anchor_source,
        "anchor_checked": anchor_checked,
        "independent_verification": anchor_checked and not fatal,
    }


def verify_pcf(
    pcf: dict[str, Any],
    pinned_dir: Path,
    anchor_entries: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    if not isinstance(pcf, dict):
        return {
            "status": "FAILED",
            "verified": False,
            "finding_id": None,
            "issues": [_issue("pcf-format-invalid", "PCF is not an object")],
            "ledger": None,
            "anchor_checked": False,
            "anchor_source": "missing",
            "independent_verification": False,
            "chain_position": None,
        }

    for defect in validate_pcf_document(pcf):
        issues.append(_issue("pcf-schema-invalid", defect))

    signatures = pcf.get("signatures") if isinstance(pcf.get("signatures"), dict) else {}
    signer_block = signatures.get("signer") if isinstance(signatures.get("signer"), dict) else {}
    try:
        signer_pub = pinned_key(pinned_dir, "signer")
        pinned_id = pinned_key_id(pinned_dir, "signer")
        sig = signer_block.get("signature")
        key = signer_block.get("key_id")
        if not key:
            issues.append(_issue("pcf-key-id-missing", "PCF has no signer key id", severity=WARN))
        elif key != pinned_id:
            issues.append(_issue("pcf-key-id-mismatch", "PCF signed by an unpinned signer key"))
        domain = signer_block.get("domain")
        if domain is None:
            issues.append(_issue("pcf-signature-domain-missing", "PCF signature has no domain", severity=WARN))
        elif domain != PCF_DOMAIN:
            issues.append(_issue("pcf-signature-domain-mismatch", "PCF signature domain is not the PCF domain"))
        algorithm = signer_block.get("algorithm")
        if algorithm is None:
            issues.append(_issue("pcf-signature-algorithm-missing", "PCF signature has no algorithm", severity=WARN))
        elif algorithm != "ed25519":
            issues.append(_issue("pcf-signature-algorithm-unsupported", "PCF signature algorithm is not Ed25519"))
        signing_bytes = pcf_signing_input(pcf)
        payload_b64 = signer_block.get("payload_b64")
        if payload_b64:
            try:
                exact_payload = b64d(payload_b64)
            except Exception:
                exact_payload = None
                issues.append(_issue("pcf-signature-payload-invalid", "PCF signed payload is not valid base64"))
            if exact_payload is not None:
                if exact_payload != signing_bytes:
                    issues.append(
                        _issue(
                            "pcf-signature-payload-mismatch",
                            "embedded signed payload does not match the current PCF contents",
                        )
                    )
                signing_bytes = exact_payload
        else:
            issues.append(
                _issue(
                    "pcf-signature-payload-missing",
                    "PCF has no exact signed payload; canonical bytes were recomputed",
                    severity=WARN,
                )
            )
        if not sig or not verify_bytes(signer_pub, signing_bytes, sig):
            issues.append(_issue("pcf-signature-invalid", "PCF signature is invalid"))
    except KeyError_ as exc:
        issues.append(_issue("missing-pinned-key", str(exc)))
    except Exception as exc:  # noqa: BLE001 - malformed signed data must not crash verification
        issues.append(_issue("pcf-signature-input-invalid", f"unable to build PCF signing input: {type(exc).__name__}"))

    ledger = pcf.get("ledger")
    ledger_report = None
    if not isinstance(ledger, dict):
        issues.append(_issue("pcf-ledger-missing", "PCF contains no ledger proof"))
    else:
        external_anchor = anchor_entries is not None
        ledger_checkpoints = ledger.get("checkpoints") if isinstance(ledger.get("checkpoints"), list) else []
        pcf_checkpoint = ledger_checkpoints[0] if ledger_checkpoints and isinstance(ledger_checkpoints[0], dict) else None
        if external_anchor and pcf_checkpoint is not None:
            max_counter = pcf_checkpoint.get("counter")
            if isinstance(max_counter, int) and not isinstance(max_counter, bool):
                anchor_entries = [
                    entry
                    for entry in anchor_entries
                    if isinstance(entry, dict)
                    and isinstance(entry.get("counter"), int)
                    and not isinstance(entry.get("counter"), bool)
                    and entry["counter"] <= max_counter
                ]
        ledger_report = verify_export(ledger, pinned_dir, anchor_entries, require_anchor=True)
        issues.extend(ledger_report["issues"])
        chain = pcf.get("chain") if isinstance(pcf.get("chain"), dict) else {}
        chain_seq = chain.get("seq")
        if not isinstance(chain_seq, int) or isinstance(chain_seq, bool):
            issues.append(_issue("pcf-chain-position-invalid", "PCF chain position is not an integer"))
            chain_seq = -1
        events = ledger.get("events") if isinstance(ledger.get("events"), list) else []
        target = next(
            (
                event
                for event in events
                if isinstance(event, dict)
                and isinstance(event.get("seq"), int)
                and not isinstance(event.get("seq"), bool)
                and event["seq"] == chain_seq
            ),
            None,
        )
        if target is None:
            issues.append(
                _issue(
                    "pcf-chain-position-missing",
                    "PCF chain position is not covered by the ledger proof",
                )
            )
        else:
            if target.get("event_hash") != chain.get("event_hash"):
                issues.append(
                    _issue("pcf-chain-hash-mismatch", "PCF chain event hash does not match the ledger proof")
                )
            if target.get("event_id") != chain.get("event_id"):
                issues.append(
                    _issue("pcf-chain-event-id-mismatch", "PCF chain event id does not match the ledger proof")
                )
            run = pcf.get("run") if isinstance(pcf.get("run"), dict) else {}
            if run.get("run_id") != target.get("run_id"):
                issues.append(_issue("pcf-run-id-mismatch", "PCF run does not match the finding event"))
            if run.get("tenant_id") != target.get("tenant_id"):
                issues.append(_issue("pcf-tenant-id-mismatch", "PCF tenant does not match the finding event"))
            metadata = target.get("metadata") if isinstance(target.get("metadata"), dict) else {}
            if metadata.get("finding_id") != pcf.get("finding_id"):
                issues.append(_issue("pcf-finding-id-mismatch", "finding event belongs to another finding"))
            attack = pcf.get("attack") if isinstance(pcf.get("attack"), dict) else {}
            if metadata.get("prompt_hash") and metadata.get("prompt_hash") != attack.get("prompt_hash"):
                issues.append(_issue("pcf-prompt-hash-mismatch", "attack prompt hash does not match the finding event"))
            model = pcf.get("model") if isinstance(pcf.get("model"), dict) else {}
            if metadata.get("response_hash") and metadata.get("response_hash") != model.get("response_hash"):
                issues.append(_issue("pcf-response-hash-mismatch", "model response hash does not match the finding event"))
            policy = pcf.get("policy") if isinstance(pcf.get("policy"), dict) else {}
            if metadata.get("policy_hash") and metadata.get("policy_hash") != policy.get("bundle_hash"):
                issues.append(_issue("pcf-policy-hash-mismatch", "policy hash does not match the finding event"))
        if ledger_report["head"]["seq"] < chain_seq:
            issues.append(
                _issue(
                    "pcf-chain-position-mismatch",
                    "PCF chain position is ahead of the ledger proof",
                )
            )
        finding_id = pcf.get("finding_id")
        attached = [
            event
            for event in events
            if isinstance(event, dict)
            and event.get("event_type") == "finding.created"
            and isinstance(event.get("metadata"), dict)
            and event["metadata"].get("finding_id") == finding_id
        ]
        if not attached:
            issues.append(_issue("pcf-finding-event-missing", "ledger proof has no matching finding event"))
        elif attached[0].get("seq") != chain_seq:
            issues.append(
                _issue(
                    "pcf-finding-position-mismatch",
                    "finding event does not match the PCF chain position",
                )
            )
        checkpoints = ledger.get("checkpoints") if isinstance(ledger.get("checkpoints"), list) else []
        checkpoint = checkpoints[0] if checkpoints and isinstance(checkpoints[0], dict) else None
        chain_checkpoint = chain.get("checkpoint") if isinstance(chain.get("checkpoint"), dict) else None
        if checkpoint is None:
            issues.append(_issue("pcf-checkpoint-missing", "PCF has no signed checkpoint"))
        elif chain_checkpoint is None:
            issues.append(_issue("pcf-chain-checkpoint-missing", "PCF chain has no checkpoint reference"))
        else:
            for field in ("counter", "upto_seq", "checkpoint_hash", "merkle_root"):
                if chain_checkpoint.get(field) != checkpoint.get(field):
                    issues.append(
                        _issue(
                            "pcf-chain-checkpoint-mismatch",
                            f"PCF chain checkpoint {field} does not match the ledger checkpoint",
                        )
                    )
        anchor = pcf.get("anchor") if isinstance(pcf.get("anchor"), dict) else {}
        anchor_entry = anchor.get("entry") if isinstance(anchor.get("entry"), dict) else None
        if anchor_entry is None:
            issues.append(_issue("pcf-anchor-entry-missing", "PCF has no anchor entry"))
        else:
            try:
                anchor_hash_valid = anchor_entry_hash(anchor_entry) == anchor_entry.get("anchor_hash")
            except (KeyError, TypeError, ValueError):
                anchor_hash_valid = False
            if not anchor_hash_valid:
                issues.append(_issue("pcf-anchor-hash-mismatch", "PCF anchor entry is not self-consistent"))
            if checkpoint is not None:
                for field in ("counter", "checkpoint_hash", "merkle_root", "last_hash"):
                    if anchor_entry.get(field) != checkpoint.get(field):
                        issues.append(
                            _issue(
                                "pcf-anchor-mismatch",
                                f"PCF anchor entry {field} does not match the checkpoint",
                            )
                        )
                if anchor.get("ref") not in (None, str(anchor_entry.get("counter"))):
                    issues.append(_issue("pcf-anchor-ref-mismatch", "PCF anchor reference does not match the anchor entry"))
        if anchor.get("ref") is None:
            issues.append(_issue("pcf-anchor-ref-missing", "PCF has no anchor reference"))
        if not external_anchor:
            issues.append(
                _issue(
                    "pcf-anchor-not-independent",
                    "anchor entries were read from the PCF, not supplied by an external anchor fetch",
                    severity=WARN,
                )
            )

    payload = pcf.get("payload") if isinstance(pcf.get("payload"), dict) else {}
    commitment = payload.get("commitment")
    reveal = payload.get("reveal")
    payload_hash = payload.get("payload_hash")
    if commitment and reveal is not None:
        computed_commitment = hash_object(reveal)
        if computed_commitment != commitment:
            issues.append(_issue("commit-reveal-mismatch", "revealed payload does not match commitment"))
        if not payload_hash:
            issues.append(_issue("pcf-payload-hash-missing", "PCF has no payload hash"))
        elif hash_object(reveal) != payload_hash:
            issues.append(_issue("pcf-payload-hash-mismatch", "payload hash does not match the reveal"))
    elif commitment:
        issues.append(_issue("reveal-missing", "PCF has a commitment but no reveal", severity=WARN))

    fatal = [i for i in issues if i["severity"] == FATAL]
    anchor_checked = bool(ledger_report and ledger_report.get("anchor_checked"))
    return {
        "status": "VERIFIED" if not fatal else "FAILED",
        "verified": not fatal,
        "finding_id": pcf.get("finding_id"),
        "issues": issues,
        "ledger": ledger_report,
        "anchor_checked": anchor_checked,
        "anchor_source": ledger_report.get("anchor_source", "missing") if ledger_report else "missing",
        "independent_verification": anchor_checked and not fatal,
        "chain_position": pcf.get("chain", {}).get("seq") if isinstance(pcf.get("chain"), dict) else None,
    }


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def verify_file(path: Path, pinned_dir: Path, anchor_entries: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    document = load_json(path)
    if not isinstance(document, dict):
        return {
            "status": "FAILED",
            "verified": False,
            "issues": [_issue("unknown-document", "file is not a JSON object")],
        }
    if "pcf_version" in document or "finding_id" in document:
        return verify_pcf(document, pinned_dir, anchor_entries)
    if "events" in document:
        return verify_export(document, pinned_dir, anchor_entries, require_anchor=True)
    return {
        "status": "FAILED",
        "verified": False,
        "issues": [_issue("unknown-document", "file is neither a PCF nor a ledger export")],
    }


def canonical_digest(document: dict[str, Any]) -> str:
    return sha256_hex(canonical_json(document))
