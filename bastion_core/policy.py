from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from .canonical import canonical_json, hash_object
from .crypto import sign_bytes, verify_bytes

POLICY_VERSION = "2026.10.26.1"

DEFAULT_BUNDLE: dict[str, Any] = {
    "version": POLICY_VERSION,
    "default": "deny",
    "rules": [
        {
            "id": "tenant-reads-own-events",
            "effect": "allow",
            "actions": ["events:read"],
            "when": {"same_tenant": True},
        },
        {
            "id": "tenant-reads-own-findings",
            "effect": "allow",
            "actions": ["findings:read"],
            "when": {"same_tenant": True},
        },
        {
            "id": "tenant-reads-own-runs",
            "effect": "allow",
            "actions": ["runs:read"],
            "when": {"same_tenant": True},
        },
        {
            "id": "tenant-creates-runs",
            "effect": "allow",
            "actions": ["runs:create", "runs:start"],
            "when": {"same_tenant": True},
        },
        {
            "id": "red-infers-in-own-run",
            "effect": "allow",
            "actions": ["infer"],
            "when": {"same_tenant": True, "run_scoped": True},
        },
        {
            "id": "tenant-commits-own-payload",
            "effect": "allow",
            "actions": ["payload:commit"],
            "when": {"same_tenant": True, "run_scoped": True},
        },
        {
            "id": "tenant-reveals-own-payload",
            "effect": "allow",
            "actions": ["payload:reveal"],
            "when": {"same_tenant": True, "run_scoped": True},
        },
        {
            "id": "blue-reads-released-findings",
            "effect": "allow",
            "actions": ["findings:read", "events:read"],
            "when": {"tenant_in": ["blue", "system", "suite"]},
        },
        {
            "id": "suite-runs-security-tests",
            "effect": "allow",
            "actions": ["security-tests:run", "ledger:append"],
            "when": {"tenant_in": ["suite", "system"]},
        },
        {
            "id": "gateway-appends-ledger",
            "effect": "allow",
            "actions": ["ledger:append", "ledger:verify"],
            "when": {"tenant_in": ["gateway", "system", "suite", "notary"]},
        },
        {
            "id": "system-administers",
            "effect": "allow",
            "actions": ["*"],
            "when": {"tenant_in": ["system"]},
        },
        {
            "id": "labs-read",
            "effect": "allow",
            "actions": ["labs:read"],
            "when": {"tenant_in": ["red", "blue", "system", "suite"]},
        },
        {
            "id": "tenants-read-metrics",
            "effect": "allow",
            "actions": ["metrics:read", "health:read", "reports:read"],
            "when": {"tenant_in": ["system", "red", "blue", "suite"]},
        },
        {
            "id": "deny-cross-tenant-events",
            "effect": "deny",
            "actions": ["events:read", "findings:read", "runs:read"],
            "when": {"same_tenant": False},
        },
        {
            "id": "deny-admin-for-tenants",
            "effect": "deny",
            "actions": ["admin:*", "ledger:append"],
            "when": {"tenant_in": ["red", "blue"]},
        },
    ],
}


class PolicyError(RuntimeError):
    pass


@dataclass(frozen=True)
class Decision:
    decision: str
    rule_id: str
    bundle_hash: str
    version: str
    reasons: tuple[str, ...] = ()

    def as_dict(self) -> dict[str, Any]:
        return {
            "decision": self.decision,
            "rule_id": self.rule_id,
            "bundle_hash": self.bundle_hash,
            "version": self.version,
            "reasons": list(self.reasons),
        }


def _rule_matches(rule: dict[str, Any], action: str, ctx: dict[str, Any]) -> bool:
    actions = rule.get("actions", [])
    if not any(action == a or a == "*" or (a.endswith(":*") and action.startswith(a[:-1])) for a in actions):
        return False
    when = rule.get("when", {})
    if "same_tenant" in when:
        same = str(ctx.get("tenant_id")) == str(ctx.get("target_tenant", ctx.get("tenant_id")))
        if bool(when["same_tenant"]) != same:
            return False
    if "tenant_in" in when and ctx.get("tenant_id") not in when["tenant_in"]:
        return False
    if when.get("run_scoped") and not ctx.get("run_id"):
        return False
    if when.get("not_naive_exposure") and ctx.get("mode") == "naive":
        return False
    if "path_prefix" in when:
        if not str(ctx.get("path", "")).startswith(when["path_prefix"]):
            return False
    return True


def evaluate_bundle(bundle: dict[str, Any], action: str, ctx: dict[str, Any]) -> Decision:
    bundle_hash = hash_object(bundle)
    if bundle.get("version") is None:
        raise PolicyError("policy bundle has no version")
    for rule in bundle.get("rules", []):
        if _rule_matches(rule, action, ctx):
            effect = rule.get("effect", "deny")
            if effect not in {"allow", "deny"}:
                raise PolicyError(f"unknown effect in rule {rule.get('id')}")
            return Decision(effect, rule.get("id", "unnamed"), bundle_hash, bundle["version"])
    default = bundle.get("default", "deny")
    return Decision(default, "default", bundle_hash, bundle["version"], ("no rule matched",))


@dataclass
class PolicyBundle:
    path: Path
    signature_path: Path
    bundle: dict[str, Any]
    hash: str

    @classmethod
    def load(cls, path: Path, signature_path: Path | None = None) -> "PolicyBundle":
        if not path.exists():
            raise PolicyError(f"policy bundle not found: {path}")
        raw = path.read_bytes()
        try:
            bundle = json.loads(raw)
        except ValueError as exc:
            raise PolicyError("policy bundle is not valid JSON") from exc
        return cls(path, signature_path or path.with_suffix(".sig"), bundle, hash_object(bundle))

    def verify_signature(self, public_key: Ed25519PublicKey) -> bool:
        if not self.signature_path.exists():
            return False
        sig = self.signature_path.read_text(encoding="utf-8").strip()
        return verify_bytes(public_key, canonical_json(self.bundle), sig)

    def write_signature(self, private_key: Ed25519PrivateKey) -> str:
        sig = sign_bytes(private_key, canonical_json(self.bundle))
        self.signature_path.write_text(sig, encoding="utf-8")
        return sig


def evaluate_with_opa(bundle: dict[str, Any], action: str, ctx: dict[str, Any]) -> Decision | None:
    opa = shutil.which("opa")
    if not opa:
        return None
    query = "data.bastionloop.authz.decision"
    input_doc = {"action": action, "context": ctx, "bundle": bundle}
    with tempfile.TemporaryDirectory() as tmp:
        input_path = Path(tmp) / "input.json"
        policy_path = Path(tmp) / "policy.rego"
        input_path.write_text(json.dumps(input_doc), encoding="utf-8")
        policy_path.write_text(REGO_SOURCE, encoding="utf-8")
        proc = subprocess.run(
            [opa, "eval", "--format=json", "--data", str(policy_path), "--input", str(input_path), "data.bastionloop.authz.decision"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if proc.returncode != 0:
            return None
        try:
            result = json.loads(proc.stdout)["result"][0]["expressions"][0]["value"]
        except (KeyError, IndexError, ValueError):
            return None
        return Decision(
            str(result.get("decision", "deny")),
            str(result.get("rule_id", "opa")),
            hash_object(bundle),
            str(bundle.get("version", "unknown")),
            tuple(result.get("reasons", [])),
        )


def ensure_default_bundle(path: Path) -> PolicyBundle:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        source = Path(__file__).resolve().parent.parent / "security" / "policies" / "policy.json"
        if source.exists():
            path.write_bytes(source.read_bytes())
        else:
            path.write_text(json.dumps(DEFAULT_BUNDLE, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return PolicyBundle.load(path)


REGO_SOURCE = """package bastionloop.authz

default decision := {"decision": "deny", "rule_id": "default", "reasons": ["no rule matched"]}

decision := {"decision": effect, "rule_id": rule.id, "reasons": ["matched"]} if {
  rule := input.bundle.rules[_]
  action_match(rule.actions, input.action)
  when_match(rule.when, input.context)
  effect := rule.effect
}

action_match(actions, action) if {
  a := actions[_]
  a == action
}

action_match(actions, action) if {
  a := actions[_]
  a == "*"
}

action_match(actions, action) if {
  a := actions[_]
  endswith(a, ":*")
  startswith(action, substring(a, 0, count(a) - 1))
}

when_match(when, ctx) if {
  not when.same_tenant
}

when_match(when, ctx) if {
  when.same_tenant
  ctx.tenant_id == ctx.target_tenant
}

when_match(when, ctx) if {
  not when.tenant_in
}

when_match(when, ctx) if {
  when.tenant_in[_] == ctx.tenant_id
}

when_match(when, ctx) if {
  not when.run_scoped
}

when_match(when, ctx) if {
  when.run_scoped
  ctx.run_id != ""
}
"""
