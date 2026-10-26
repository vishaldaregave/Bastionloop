from __future__ import annotations

import os
import queue
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from bastion_core import events as ev
from bastion_core.canonical import hash_object, utcnow
from bastion_core.config import ROOT, ensure_dirs, settings
from bastion_core.crypto import (
    ensure_keypair,
    key_id,
    load_private_key,
    load_public_key,
)
from bastion_core.http import ServiceError, get_json, post_json
from bastion_core.policy import (
    Decision,
    PolicyBundle,
    PolicyError,
    ensure_default_bundle,
    evaluate_bundle,
    evaluate_with_opa,
)
from bastion_core.timing import summarize
from bastion_core.tokens import Capability, issue_token

POLICY_PATH = ROOT / "security" / "policies" / "policy.json"


@dataclass
class RunState:
    run_id: str
    tenant_id: str
    benchmark_id: str
    benchmark_version: str
    benchmark_digest: str
    mode: str
    model_id: str
    adapter: str
    runtime: str
    cases: list[dict[str, Any]] = field(default_factory=list)
    status: str = "created"
    created_at: str = field(default_factory=utcnow)
    started_at: str | None = None
    finished_at: str | None = None
    commitment: str | None = None
    reveal_hash: str | None = None
    reveal_matches: bool | None = None
    results: list[dict[str, Any]] = field(default_factory=list)
    findings: list[dict[str, Any]] = field(default_factory=list)
    canaries: dict[str, Any] = field(default_factory=dict)
    freshness: dict[str, Any] = field(default_factory=dict)
    canary_scan: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    policy: dict[str, Any] = field(default_factory=dict)
    latency: list[float] = field(default_factory=list)
    overhead: list[float] = field(default_factory=list)

    def public(self) -> dict[str, Any]:
        decisions = {}
        for result in self.results:
            key = result.get("decision", "unknown")
            decisions[key] = decisions.get(key, 0) + 1
        return {
            "run_id": self.run_id,
            "tenant_id": self.tenant_id,
            "benchmark_id": self.benchmark_id,
            "benchmark_version": self.benchmark_version,
            "benchmark_digest": self.benchmark_digest,
            "mode": self.mode,
            "model_id": self.model_id,
            "adapter": self.adapter,
            "runtime": self.runtime,
            "status": self.status,
            "created_at": self.created_at,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "commitment": self.commitment,
            "reveal_hash": self.reveal_hash,
            "reveal_matches": self.reveal_matches,
            "cases": [
                {
                    "case_id": c["case_id"],
                    "category": c.get("category"),
                    "prompt_hash": hash_object(c.get("prompt", "")),
                }
                for c in self.cases
            ],
            "case_count": len(self.cases),
            "decisions": decisions,
            "findings": list(self.findings),
            "freshness": self.freshness,
            "canary_scan": self.canary_scan,
            "error": self.error,
            "policy": self.policy,
            "latency": summarize(self.latency),
            "overhead": summarize(self.overhead),
        }


class Runtime:
    def __init__(self) -> None:
        self.settings = ensure_dirs(settings())
        if self.settings.allow_key_gen:
            ensure_keypair("control", self.settings.keys_dir, self.settings.pinned_dir)
            ensure_keypair("signer", self.settings.keys_dir, self.settings.pinned_dir)
            ensure_keypair("witness", self.settings.keys_dir, self.settings.pinned_dir)
        self.control_key = load_private_key(self.settings.keys_dir / "control.pem")
        self.control_pub = load_public_key(self.settings.pinned_dir / "control.pub")
        self.control_key_id = key_id(self.control_pub)
        self.policy_bundle, self.policy_error = self._load_policy()
        self.mode = self.settings.mode if self.settings.allow_naive else "hardened"
        self.runs: dict[str, RunState] = {}
        self.lock = threading.RLock()
        self.subscribers: list[queue.Queue] = []
        self.latency_samples: dict[str, dict[str, list[float]]] = {
            "hardened": {"allow": [], "block": []},
            "naive": {"allow": [], "block": []},
        }
        self.overhead_samples: list[float] = []
        self.baseline_samples: list[float] = []
        self.policy_counts: dict[str, int] = {}
        self.integrity_cache: tuple[float, dict[str, Any]] | None = None
        self.started_at = time.time()
        self.gateway_image = os.environ.get("BASTION_GATEWAY_IMAGE_DIGEST", "sha256:dev-local-gateway")
        self.runtime_kind = self.settings.runtime

    def _load_policy(self) -> tuple[PolicyBundle | None, str | None]:
        try:
            bundle = ensure_default_bundle(self.settings.policy_path)
        except Exception as exc:
            return None, f"policy bundle unavailable: {exc}"
        try:
            control_pub = load_public_key(self.settings.pinned_dir / "control.pub")
        except Exception as exc:
            return None, f"control key unavailable: {exc}"
        if bundle.verify_signature(control_pub):
            return bundle, None
        if self.settings.allow_key_gen:
            bundle.write_signature(self.control_key)
            if bundle.verify_signature(control_pub):
                return bundle, None
        return None, "policy bundle signature does not match the pinned control key"

    def reload_policy(self) -> str | None:
        bundle, error = self._load_policy()
        self.policy_bundle = bundle
        self.policy_error = error
        return error

    @property
    def policy_hash(self) -> str:
        return self.policy_bundle.hash if self.policy_bundle else "unavailable"

    @property
    def policy_version(self) -> str:
        return self.policy_bundle.bundle["version"] if self.policy_bundle else "unavailable"

    def decide(self, action: str, ctx: dict[str, Any]) -> Decision:
        if self.policy_bundle is None:
            return Decision("deny", "policy-unavailable", "unavailable", "unavailable", (self.policy_error or "",))
        decision = None
        if os.environ.get("BASTION_POLICY_ENGINE") == "opa":
            decision = evaluate_with_opa(self.policy_bundle.bundle, action, ctx)
        if decision is None:
            decision = evaluate_bundle(self.policy_bundle.bundle, action, ctx)
        key = f"{decision.decision}:{decision.rule_id}"
        with self.lock:
            self.policy_counts[key] = self.policy_counts.get(key, 0) + 1
        return decision

    def issue(self, tenant: str, actions: list[str], run_id: str | None = None, ttl: int = 600) -> str:
        return issue_token(self.control_key, tenant, actions, run_id=run_id, ttl_seconds=ttl, mode=self.mode)

    def append(
        self,
        event_type: str,
        metadata: dict[str, Any],
        run_id: str | None = None,
        tenant_id: str | None = None,
        policy_version: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "event_type": event_type,
            "metadata": metadata,
            "run_id": run_id,
            "tenant_id": tenant_id or "system",
            "policy_version": policy_version or self.policy_version,
        }
        result = post_json(
            self.settings.service("notary") + "/v1/ledger/append",
            payload,
            "notary",
            timeout=20.0,
            headers={"X-Bastion-Internal": self.settings.internal_token},
        )
        event = result["event"]
        self.publish("ledger", {"event": event, "checkpoint": result.get("checkpoint")})
        return event

    def verify(self, force: bool = False) -> dict[str, Any]:
        now = time.time()
        if not force and self.integrity_cache and now - self.integrity_cache[0] < 3.0:
            return self.integrity_cache[1]
        try:
            report = get_json(self.settings.service("notary") + "/v1/ledger/verify", "notary", timeout=30.0)
        except ServiceError as exc:
            report = {
                "status": "FAILED",
                "verified": False,
                "issues": [{"code": "notary-unreachable", "severity": "fatal", "detail": str(exc)}],
            }
        self.integrity_cache = (now, report)
        return report

    def export(self) -> dict[str, Any]:
        return get_json(self.settings.service("notary") + "/v1/ledger/export", "notary", timeout=30.0)

    def create_checkpoint(self) -> dict[str, Any]:
        return post_json(
            self.settings.service("notary") + "/v1/checkpoints/create",
            {},
            "notary",
            timeout=20.0,
            headers={"X-Bastion-Internal": self.settings.internal_token},
        )

    def publish(self, channel: str, data: dict[str, Any]) -> None:
        message = {"channel": channel, "ts": utcnow(), **data}
        with self.lock:
            subscribers = list(self.subscribers)
        for subscriber in subscribers:
            try:
                subscriber.put_nowait(message)
            except queue.Full:
                pass

    def subscribe(self) -> queue.Queue:
        subscriber: queue.Queue = queue.Queue(maxsize=500)
        with self.lock:
            self.subscribers.append(subscriber)
        return subscriber

    def unsubscribe(self, subscriber: queue.Queue) -> None:
        with self.lock:
            if subscriber in self.subscribers:
                self.subscribers.remove(subscriber)

    def record_latency(self, mode: str, decision: str, latency_ms: float) -> None:
        bucket = self.latency_samples.setdefault(mode, {"allow": [], "block": []})
        bucket.setdefault(decision, []).append(latency_ms)

    def record_overhead(self, total_ms: float, model_ms: float) -> None:
        self.baseline_samples.append(model_ms)
        self.overhead_samples.append(max(0.0, total_ms - model_ms))

    def timing_report(self) -> dict[str, Any]:
        def compare(mode: str) -> dict[str, Any]:
            allow = self.latency_samples.get(mode, {}).get("allow", [])
            block = self.latency_samples.get(mode, {}).get("block", [])
            from bastion_core.timing import mann_whitney_u

            stats = mann_whitney_u(allow, block) if len(allow) >= 5 and len(block) >= 5 else None
            return {
                "allow": summarize(allow),
                "block": summarize(block),
                "distinguishability": stats,
                "testable": stats is not None,
            }

        return {
            "padding_bucket_ms": self.settings.padding_bucket_ms,
            "hardened": compare("hardened"),
            "naive": compare("naive"),
            "overhead": {
                "baseline_model": summarize(self.baseline_samples),
                "gateway_overhead": summarize(self.overhead_samples),
            },
        }

    def public_runs(self) -> list[dict[str, Any]]:
        with self.lock:
            runs = list(self.runs.values())
        return [run.public() for run in sorted(runs, key=lambda r: r.created_at, reverse=True)]

    def get_run(self, run_id: str) -> RunState | None:
        with self.lock:
            return self.runs.get(run_id)

    def add_run(self, run: RunState) -> None:
        with self.lock:
            self.runs[run.run_id] = run


_runtime: Runtime | None = None


def runtime() -> Runtime:
    global _runtime
    if _runtime is None:
        _runtime = Runtime()
    return _runtime


def capability_from_header(header: str, admin_token: str) -> Capability:
    from bastion_core.tokens import verify_token

    token = header.removeprefix("Bearer ").strip()
    if not token:
        raise PermissionError("missing bearer token")
    if admin_token and token == admin_token:
        return Capability("system", ("*",), None, "hardened", 0.0, float("inf"), "admin")
    return verify_token(token, load_public_key(settings().pinned_dir / "control.pub"))


def resolve_tenant(cap: Capability, requested: str | None) -> str:
    if requested and cap.tenant_id in {"system", "suite"}:
        return requested
    return requested or cap.tenant_id
