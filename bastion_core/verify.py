from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .canonical import canonical_json, hash_object, sha256_hex
from .crypto import KeyError_, pinned_key, pinned_key_id, verify_bytes
from .ledger import GENESIS_HASH, event_hash
from .merkle import merkle_root
from .signing import (
    anchor_entry_hash,
    anchor_signing_input,
    checkpoint_signing_input,
    pcf_signing_input,
)

FATAL = "fatal"
WARN = "warn"


def _issue(code: str, detail: str, severity: str = FATAL, **extra: Any) -> dict[str, Any]:
    return {"code": code, "severity": severity, "detail": detail, **extra}


def verify_chain(events: list[dict[str, Any]], genesis_hash: str = GENESIS_HASH) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    expected_prev = genesis_hash
    expected_seq = int(events[0]["seq"]) if events else 1
    seen: set[str] = set()
    for event in events:
        seq = int(event["seq"])
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
            issues.append(_issue("duplicate-hash", f"duplicate event hash at {seq}", seq=seq))
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
    prev = GENESIS_HASH
    for entry in entries:
        core = {k: v for k, v in entry.items() if k != "anchor_hash"}
        if core.get("prev_anchor_hash") != prev:
            issues.append(
                _issue(
                    "anchor-chain-break",
                    f"anchor {entry.get('counter')} does not chain to previous anchor",
                    counter=entry.get("counter"),
                )
            )
        if anchor_entry_hash(entry) != entry.get("anchor_hash"):
            issues.append(
                _issue(
                    "anchor-hash-mismatch",
                    f"anchor {entry.get('counter')} content does not match its hash",
                    counter=entry.get("counter"),
                )
            )
        prev = entry.get("anchor_hash", prev)
    return {"ok": not any(i["severity"] == FATAL for i in issues), "issues": issues, "entries": len(entries)}


def _verify_checkpoint(
    checkpoint: dict[str, Any],
    events: list[dict[str, Any]],
    pinned_dir: Path,
    anchor_entries: list[dict[str, Any]] | None,
    require_anchor: bool,
) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
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
        if checkpoint.get("signer_key_id") not in (None, signer_id):
            issues.append(_issue("signer-key-id-mismatch", "checkpoint signed by an unpinned signer key"))
        if not checkpoint.get("signer_sig") or not verify_bytes(
            signer_pub, checkpoint_signing_input(checkpoint), checkpoint["signer_sig"]
        ):
            issues.append(_issue("signer-signature-invalid", "checkpoint signer signature is invalid"))
        witness_pub = pinned_key(pinned_dir, "witness")
        witness_id = pinned_key_id(pinned_dir, "witness")
        if checkpoint.get("witness_key_id") not in (None, witness_id):
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
            matches = [a for a in anchor_entries if int(a.get("counter", -1)) == int(checkpoint["counter"])]
            if not matches:
                issues.append(
                    _issue(
                        "anchor-entry-missing",
                        f"no external anchor entry for checkpoint {checkpoint['counter']}",
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
    return issues


def verify_export(
    export: dict[str, Any],
    pinned_dir: Path,
    anchor_entries: list[dict[str, Any]] | None = None,
    require_anchor: bool = False,
) -> dict[str, Any]:
    events = sorted(export.get("events", []), key=lambda e: int(e["seq"]))
    checkpoints = sorted(export.get("checkpoints", []), key=lambda c: int(c["counter"]))
    genesis = export.get("genesis_hash", GENESIS_HASH)
    chain = verify_chain(events, genesis)
    issues: list[dict[str, Any]] = list(chain["issues"])

    if anchor_entries is None:
        embedded = export.get("anchor_entries")
        if embedded is not None:
            anchor_entries = embedded

    if anchor_entries is not None:
        anchor_report = verify_anchor_entries(anchor_entries)
        issues.extend(anchor_report["issues"])
    else:
        anchor_report = {"ok": True, "issues": [], "entries": 0}

    for checkpoint in checkpoints:
        issues.extend(
            _verify_checkpoint(checkpoint, events, pinned_dir, anchor_entries, require_anchor)
        )

    if checkpoints and events:
        latest = checkpoints[-1]
        if int(latest["upto_seq"]) > int(events[-1]["seq"]):
            issues.append(
                _issue(
                    "tail-truncation",
                    f"latest checkpoint covers seq {latest['upto_seq']} but ledger ends at {events[-1]['seq']}",
                )
            )
        elif int(latest["upto_seq"]) < int(events[-1]["seq"]):
            issues.append(
                _issue(
                    "uncheckpointed-tail",
                    f"{int(events[-1]['seq']) - int(latest['upto_seq'])} events are not covered by a signed checkpoint",
                    severity=WARN,
                )
            )

    if anchor_entries:
        anchor_max = max(int(a["counter"]) for a in anchor_entries)
        checkpoint_max = max((int(c["counter"]) for c in checkpoints), default=0)
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
        anchor_upto = max(int(a.get("upto_seq", 0)) for a in anchor_entries)
        head_seq = int(events[-1]["seq"]) if events else 0
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
            "seq": int(events[-1]["seq"]) if events else 0,
            "event_hash": events[-1]["event_hash"] if events else genesis,
        },
        "first_broken_link": chain.get("broken_at"),
    }


def verify_pcf(
    pcf: dict[str, Any],
    pinned_dir: Path,
    anchor_entries: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    issues: list[dict[str, Any]] = []
    signatures = pcf.get("signatures", {})
    try:
        signer_pub = pinned_key(pinned_dir, "signer")
        sig = signatures.get("signer", {}).get("signature")
        key = signatures.get("signer", {}).get("key_id")
        if key and key != pinned_key_id(pinned_dir, "signer"):
            issues.append(_issue("pcf-key-id-mismatch", "PCF signed by an unpinned signer key"))
        if not sig or not verify_bytes(signer_pub, pcf_signing_input(pcf), sig):
            issues.append(_issue("pcf-signature-invalid", "PCF signature is invalid"))
    except KeyError_ as exc:
        issues.append(_issue("missing-pinned-key", str(exc)))

    ledger = pcf.get("ledger")
    if not ledger:
        issues.append(_issue("pcf-ledger-missing", "PCF contains no ledger proof"))
        ledger_report = None
    else:
        if anchor_entries is None:
            anchor_entries = ledger.get("anchor_entries")
        ledger_report = verify_export(ledger, pinned_dir, anchor_entries, require_anchor=True)
        issues.extend(ledger_report["issues"])
        chain = pcf.get("chain", {})
        if ledger_report["head"]["seq"] != int(chain.get("seq", -1)):
            issues.append(_issue("pcf-chain-position-mismatch", "PCF chain position does not match ledger proof"))
        if ledger_report["head"]["event_hash"] != chain.get("event_hash"):
            issues.append(_issue("pcf-chain-hash-mismatch", "PCF chain head does not match ledger proof"))
        finding_id = pcf.get("finding_id")
        attached = [
            e
            for e in ledger.get("events", [])
            if e.get("event_type") == "finding.created"
            and e.get("metadata", {}).get("finding_id") == finding_id
        ]
        if not attached:
            issues.append(_issue("pcf-finding-event-missing", "ledger proof has no matching finding event"))

    commitment = pcf.get("payload", {}).get("commitment")
    reveal = pcf.get("payload", {}).get("reveal")
    if commitment and reveal is not None:
        if hash_object(reveal) != commitment:
            issues.append(_issue("commit-reveal-mismatch", "revealed payload does not match commitment"))
    elif commitment:
        issues.append(_issue("reveal-missing", "PCF has a commitment but no reveal", severity=WARN))

    fatal = [i for i in issues if i["severity"] == FATAL]
    return {
        "status": "VERIFIED" if not fatal else "FAILED",
        "verified": not fatal,
        "finding_id": pcf.get("finding_id"),
        "issues": issues,
        "ledger": ledger_report,
        "anchor_checked": bool(anchor_entries),
        "chain_position": pcf.get("chain", {}).get("seq"),
    }


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def verify_file(path: Path, pinned_dir: Path, anchor_entries: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    document = load_json(path)
    if "pcf_version" in document or "finding_id" in document:
        return verify_pcf(document, pinned_dir, anchor_entries)
    if "events" in document:
        if anchor_entries is None:
            document.setdefault("anchor_entries", [])
        return verify_export(document, pinned_dir, anchor_entries, require_anchor=True)
    return {
        "status": "FAILED",
        "verified": False,
        "issues": [_issue("unknown-document", "file is neither a PCF nor a ledger export")],
    }


def canonical_digest(document: dict[str, Any]) -> str:
    return sha256_hex(canonical_json(document))
