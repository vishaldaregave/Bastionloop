from __future__ import annotations

import copy
import json
from pathlib import Path

from bastion_core.canonical import hash_object
from bastion_core.policy import (
    DEFAULT_BUNDLE,
    PolicyBundle,
    ensure_default_bundle,
    evaluate_bundle,
)


def _ctx(**overrides):
    base = {"tenant_id": "red", "target_tenant": "red", "run_id": "run_1", "mode": "hardened"}
    base.update(overrides)
    return base


def test_default_deny_and_tenant_scope():
    allow = evaluate_bundle(DEFAULT_BUNDLE, "infer", _ctx())
    assert allow.decision == "allow"
    assert allow.rule_id == "red-infers-in-own-run"
    cross = evaluate_bundle(DEFAULT_BUNDLE, "events:read", _ctx(target_tenant="blue"))
    assert cross.decision == "deny"
    unknown = evaluate_bundle(DEFAULT_BUNDLE, "unknown:action", _ctx())
    assert unknown.decision == "deny"
    assert unknown.rule_id == "default"


def test_system_is_administrator_and_tenants_are_not():
    system = evaluate_bundle(DEFAULT_BUNDLE, "admin:anything", _ctx(tenant_id="system"))
    assert system.decision == "allow"
    red = evaluate_bundle(DEFAULT_BUNDLE, "admin:anything", _ctx())
    assert red.decision == "deny"


def test_policy_bundle_signature_detects_tampering(tmp_path: Path, keys):
    bundle_path = tmp_path / "policy.json"
    bundle_path.write_text(json.dumps(DEFAULT_BUNDLE), encoding="utf-8")
    bundle = PolicyBundle.load(bundle_path)
    bundle.write_signature(keys["control"])
    assert bundle.verify_signature(keys["control_pub"]) is True

    tampered = copy.deepcopy(bundle.bundle)
    tampered["rules"][0]["effect"] = "deny" if tampered["rules"][0]["effect"] == "allow" else "allow"
    bad = PolicyBundle(bundle.path, bundle.signature_path, tampered, hash_object(tampered))
    assert bad.verify_signature(keys["control_pub"]) is False


def test_repo_policy_matches_builtin_default():
    source = Path(__file__).resolve().parent.parent / "security" / "policies" / "policy.json"
    assert json.loads(source.read_text(encoding="utf-8")) == DEFAULT_BUNDLE


def test_seeding_from_repo_policy(tmp_path: Path):
    bundle = ensure_default_bundle(tmp_path / "policy.json")
    assert bundle.bundle["version"] == DEFAULT_BUNDLE["version"]
    assert bundle.bundle["rules"] == DEFAULT_BUNDLE["rules"]
