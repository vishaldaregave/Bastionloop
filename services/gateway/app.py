from __future__ import annotations

import asyncio
import copy
import json
import queue
import time
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives import serialization
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

from bastion_core import events as ev
from bastion_core.benchmarks import list_benchmarks
from bastion_core.blue import public_config
from bastion_core.canonical import b64e, hash_object, sha256_hex, utcnow
from bastion_core.crypto import key_id, load_public_key
from bastion_core.http import ServiceError, get_json
from bastion_core.ledger import GENESIS_HASH, event_hash as compute_event_hash
from bastion_core.tokens import Capability, TokenError
from bastion_core.verify import verify_export, verify_pcf

from . import orchestrator
from .runtime import capability_from_header, resolve_tenant, runtime

rt = runtime()
app = FastAPI(title="BastionLoop gateway", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TokenRequest(BaseModel):
    tenant_id: str
    actions: list[str] = Field(default_factory=lambda: ["events:read"])
    run_id: str | None = None
    ttl_seconds: int = Field(default=600, ge=30, le=86400)


class RunCreate(BaseModel):
    benchmark_id: str
    mode: str | None = None
    max_cases: int | None = Field(default=None, ge=1, le=200)
    tenant_id: str | None = None


class CommitRequest(BaseModel):
    run_id: str
    payload: dict[str, Any] | None = None


class InferRequest(BaseModel):
    run_id: str
    prompt: str = Field(min_length=1, max_length=20000)
    test_id: str | None = None


class PolicyRequest(BaseModel):
    action: str
    context: dict[str, Any] = Field(default_factory=dict)


class AppendEventRequest(BaseModel):
    event_type: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    run_id: str | None = None
    tenant_id: str | None = None


class ModeRequest(BaseModel):
    mode: str


class SecurityTestsRequest(BaseModel):
    tests: list[str] | None = None
    mode: str | None = None


class TamperRequest(BaseModel):
    mode: str = "edit"
    seq: int | None = None


class JudgeRequest(BaseModel):
    benchmark_id: str = "jailbreakbench-subset.v1"
    mode: str = "hardened"
    max_cases: int = Field(default=6, ge=1, le=20)


class VerifyPcfRequest(BaseModel):
    pcf: dict[str, Any]


def _cap(authorization: str = Header(default="")) -> Capability:
    try:
        return capability_from_header(authorization, rt.settings.admin_token)
    except (PermissionError, TokenError) as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - malformed tokens surface as 401
        raise HTTPException(status_code=401, detail=f"invalid token: {exc}") from exc


def _require_action(cap: Capability, action: str, run_id: str | None = None) -> None:
    if cap.tenant_id == "system" or cap.allows(action):
        pass
    else:
        _deny(cap, action, run_id, "token-not-scoped", target_tenant=cap.tenant_id)
    if run_id and cap.run_id not in (None, run_id):
        _deny(cap, action, run_id, "token-run-mismatch", target_tenant=cap.tenant_id)


def _deny(cap: Capability, action: str, run_id: str | None, reason: str, target_tenant: str | None = None) -> None:
    rt.append(
        ev.AUTH_DENIED,
        {
            "action": action,
            "reason": reason,
            "tenant": cap.tenant_id,
            "target_tenant": target_tenant or cap.tenant_id,
            "policy_hash": rt.policy_hash,
        },
        run_id=run_id,
        tenant_id=cap.tenant_id,
    )
    raise HTTPException(status_code=403, detail=f"denied: {reason}")


def _authorize(cap: Capability, action: str, run_id: str | None = None, target_tenant: str | None = None, path: str = "") -> None:
    decision = rt.decide(
        action,
        {
            "tenant_id": cap.tenant_id,
            "target_tenant": target_tenant or cap.tenant_id,
            "run_id": run_id or cap.run_id,
            "mode": rt.mode,
            "path": path,
        },
    )
    if decision.decision != "allow":
        _deny(cap, action, run_id, f"policy:{decision.rule_id}", target_tenant)
    _require_action(cap, action, run_id)


def _run_or_404(run_id: str) -> Any:
    run = rt.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    return run


def _owned(cap: Capability, run: Any) -> None:
    if cap.tenant_id in {"system", "suite"}:
        return
    if cap.tenant_id != run.tenant_id:
        _deny(cap, "runs:read", run.run_id, "cross-tenant-access", run.tenant_id)


def _notary_endpoint(path: str, params: dict[str, Any] | None = None) -> Any:
    return get_json(rt.settings.service("notary") + path, "notary", timeout=20.0, params=params)


@app.get("/v1/health")
def health() -> dict[str, Any]:
    services: dict[str, Any] = {}
    for name in ("notary", "signer", "witness", "anchor", "model", "blue"):
        try:
            services[name] = get_json(rt.settings.service(name) + "/v1/health", name, timeout=0.4)
        except ServiceError as exc:
            services[name] = {"status": "unavailable", "detail": str(exc)}
    return {
        "status": "ok",
        "service": "gateway",
        "mode": rt.mode,
        "runtime": rt.runtime_kind,
        "policy": {"hash": rt.policy_hash, "version": rt.policy_version},
        "policy_error": rt.policy_error,
        "gateway_image": rt.gateway_image,
        "runs": len(rt.runs),
        "services": services,
    }


@app.post("/v1/tokens")
def issue_token_endpoint(request: TokenRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    token = authorization.removeprefix("Bearer ").strip()
    if token != rt.settings.admin_token:
        raise HTTPException(status_code=403, detail="admin bearer token required")
    capability = rt.issue(request.tenant_id, request.actions, request.run_id, request.ttl_seconds)
    rt.append(
        ev.TOKEN_ISSUED,
        {
            "tenant": request.tenant_id,
            "actions": sorted(set(request.actions)),
            "run_id": request.run_id,
            "ttl_seconds": request.ttl_seconds,
        },
        run_id=request.run_id,
        tenant_id=request.tenant_id,
    )
    return {"token": capability, "tenant_id": request.tenant_id, "actions": request.actions, "run_id": request.run_id}


@app.post("/v1/runs")
def create_run(request: RunCreate, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    tenant = resolve_tenant(cap, request.tenant_id)
    _authorize(cap, "runs:create", target_tenant=tenant)
    try:
        run = orchestrator.create_run(rt, tenant, request.benchmark_id, request.mode, request.max_cases)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except orchestrator.RunError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return run.public()


@app.get("/v1/runs")
def list_runs(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "runs:read")
    runs = rt.public_runs()
    if cap.tenant_id not in {"system", "suite"}:
        runs = [r for r in runs if r["tenant_id"] == cap.tenant_id]
    return {"runs": runs, "mode": rt.mode}


@app.get("/v1/runs/{run_id}")
def get_run(run_id: str, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    run = _run_or_404(run_id)
    _owned(cap, run)
    _authorize(cap, "runs:read", run_id, run.tenant_id)
    return run.public()


@app.post("/v1/runs/{run_id}/start")
def start_run(run_id: str, sync: bool = False, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    run = _run_or_404(run_id)
    _owned(cap, run)
    _authorize(cap, "runs:start", run_id, run.tenant_id)
    try:
        orchestrator.start_run(rt, run, synchronous=sync)
    except orchestrator.RunError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return run.public()


@app.post("/v1/commit")
def commit(request: CommitRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    run = _run_or_404(request.run_id)
    _owned(cap, run)
    _authorize(cap, "payload:commit", run.run_id, run.tenant_id)
    try:
        commitment = orchestrator.commit_payload(rt, run, request.payload)
    except orchestrator.RunError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"run_id": run.run_id, "commitment": commitment, "case_count": len(run.cases)}


@app.post("/v1/reveal")
def reveal(request: CommitRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    run = _run_or_404(request.run_id)
    _owned(cap, run)
    _authorize(cap, "payload:reveal", run.run_id, run.tenant_id)
    try:
        matches = orchestrator.reveal_payload(rt, run, request.payload)
    except orchestrator.RunError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"run_id": run.run_id, "matches": matches, "commitment": run.commitment, "reveal_hash": run.reveal_hash}


@app.post("/v1/infer")
def infer(request: InferRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    run = _run_or_404(request.run_id)
    _owned(cap, run)
    _authorize(cap, "infer", run.run_id, run.tenant_id, path="/v1/infer")
    if run.status not in {"running", "complete"}:
        raise HTTPException(status_code=409, detail="run must be started before inference")
    case = {
        "case_id": request.test_id or f"manual_{int(time.time() * 1000)}",
        "category": "manual",
        "prompt": request.prompt,
        "expected": "block",
    }
    try:
        orchestrator._run_case(rt, run, case)
    except orchestrator.RunError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    result = run.results[-1]
    return {
        "case_id": result["case_id"],
        "verdict": {
            "decision": result["decision"],
            "score": result["score"],
            "latency_ms": round(result["latency_ms"], 3),
            "defence_version": result["defence_version"],
        },
        "response": result["response_text"],
        "dlp_blocked": bool(result["dlp_hits"]),
        "session_id": result["session_id"],
    }


@app.post("/v1/policy/decide")
def policy_decide(request: PolicyRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    if cap.tenant_id not in {"system", "suite"}:
        _deny(cap, "policy:decide", None, "admin-only")
    decision = rt.decide(request.action, request.context)
    return {**decision.as_dict(), "action": request.action, "input_hash": hash_object(request.context)}


@app.get("/v1/events")
def events(
    since: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=2000),
    run_id: str | None = None,
    authorization: str = Header(default=""),
) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "events:read")
    payload = _notary_endpoint("/v1/events", {"since": since, "limit": limit})
    items = payload.get("events", [])
    if cap.tenant_id not in {"system", "suite", "blue"}:
        items = [e for e in items if e.get("tenant_id") in {cap.tenant_id, "system"}]
    if run_id:
        items = [e for e in items if e.get("run_id") == run_id]
    return {"events": items, "count": len(items), "viewer": cap.tenant_id}


def _disk_findings() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for path in sorted(rt.settings.findings_dir.glob("*.json"), reverse=True):
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        run = document.get("run", {})
        chain = document.get("chain", {})
        checkpoint = chain.get("checkpoint", {})
        items.append(
            {
                "finding_id": document.get("finding_id"),
                "finding_type": document.get("finding_type"),
                "severity": document.get("severity"),
                "case_id": document.get("attack", {}).get("case_id"),
                "status": "signed" if document.get("signatures") else "unsigned",
                "chain_seq": chain.get("seq"),
                "checkpoint": checkpoint.get("counter"),
                "anchor_ref": document.get("anchor", {}).get("ref"),
                "run_id": run.get("run_id"),
                "tenant_id": run.get("tenant_id"),
                "mode": run.get("mode"),
                "path": str(path),
            }
        )
    return items


@app.get("/v1/findings")
def findings(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "findings:read")
    items = _disk_findings()
    if cap.tenant_id not in {"system", "blue", "suite"}:
        items = [item for item in items if item.get("tenant_id") == cap.tenant_id]
    return {"findings": items, "count": len(items)}


@app.get("/v1/findings/{finding_id}")
def finding(finding_id: str, verify: bool = True, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "findings:read")
    safe = finding_id.replace("/", "").replace("\\", "").replace("..", "")
    path = rt.settings.findings_dir / f"{safe}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="finding not found")
    document = json.loads(path.read_text(encoding="utf-8"))
    tenant = document.get("run", {}).get("tenant_id")
    if cap.tenant_id not in {"system", "blue", "suite"} and tenant != cap.tenant_id:
        _deny(cap, "findings:read", document.get("run", {}).get("run_id"), "cross-tenant-finding", tenant)
    response: dict[str, Any] = {"pcf": document, "verification": None}
    if verify:
        response["verification"] = verify_pcf(document, rt.settings.pinned_dir)
    return response


@app.get("/v1/benchmarks")
def benchmarks() -> dict[str, Any]:
    return {"benchmarks": list_benchmarks()}


@app.get("/v1/pinned-keys")
def pinned_keys() -> dict[str, Any]:
    """Public keys only; the verifier page pins these, it never trusts the payload's own key."""
    keys: dict[str, Any] = {}
    for name in ("signer", "witness", "control"):
        public_key = load_public_key(rt.settings.pinned_dir / f"{name}.pub")
        raw = public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("ascii")
        keys[name] = {
            "key_id": key_id(public_key),
            "public_key_b64": b64e(raw),
            "pem": pem,
        }
    return {
        "keys": keys,
        "generated_at": utcnow(),
        "note": "Compare these fingerprints out of band before trusting a PCF.",
    }


@app.get("/v1/labs/blue")
def lab_blue(run_id: str | None = None, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "labs:read")
    try:
        health = get_json(rt.settings.service("blue") + "/v1/health", "blue", timeout=3.0)
    except ServiceError as exc:
        health = {"status": "unavailable", "detail": str(exc)}
    runs = rt.public_runs()
    if run_id:
        runs = [r for r in runs if r["run_id"] == run_id]
    verdicts: dict[str, int] = {}
    for run in runs:
        for decision, count in run.get("decisions", {}).items():
            verdicts[decision] = verdicts.get(decision, 0) + int(count)
    released = [
        finding
        for finding in _disk_findings()
        if not run_id or finding.get("run_id") == run_id
    ]
    return {
        "sealed": True,
        "defence_version": health.get("defence_version", "unknown"),
        "blue_health": health,
        "verdicts": verdicts,
        "released_findings": len(released),
        "defence_rules": public_config() if rt.mode == "naive" else None,
        "rules_visible": rt.mode == "naive",
        "note": "Blue returns verdicts only in hardened mode. Rules are visible only in the deliberate naive baseline.",
    }


@app.post("/v1/judge/session")
def judge_session(request: JudgeRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    if cap.tenant_id != "system":
        _deny(cap, "admin:judge", None, "admin-only")
    try:
        run = orchestrator.create_run(rt, "red", request.benchmark_id, request.mode, request.max_cases)
        orchestrator.start_run(rt, run, synchronous=True)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except orchestrator.RunError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    token = rt.issue(
        "red",
        ["runs:read", "events:read", "labs:read", "infer", "payload:commit", "payload:reveal"],
        run_id=run.run_id,
        ttl=1800,
    )
    command = (
        "docker compose exec red python -m workers.red.challenge "
        f"--gateway http://gateway:8000 --token {token} --run {run.run_id}"
    )
    rt.append(
        ev.CHALLENGE_STARTED,
        {
            "challenge": "judge-shell",
            "run_id": run.run_id,
            "mode": run.mode,
            "note": "A judge-held Red token is scoped to this run; every attempt is evidence.",
        },
        run_id=run.run_id,
        tenant_id="red",
    )
    return {
        "run": run.public(),
        "token": token,
        "command": command,
        "expires_in_seconds": 1800,
        "local_command": (
            "python -m workers.red.challenge "
            f"--gateway {rt.settings.service('gateway')} --token {token} --run {run.run_id}"
        ),
    }


@app.post("/v1/verify/pcf")
def verify_pcf_endpoint(request: VerifyPcfRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "findings:read")
    tenant = request.pcf.get("run", {}).get("tenant_id")
    if cap.tenant_id not in {"system", "blue", "suite"} and tenant != cap.tenant_id:
        _deny(cap, "findings:read", request.pcf.get("run", {}).get("run_id"), "cross-tenant-pcf", tenant)
    return verify_pcf(request.pcf, rt.settings.pinned_dir)


@app.get("/v1/suite/results")
def suite_results(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "reports:read")
    try:
        return _notary_endpoint_any(rt.settings.service("suite") + "/v1/results")
    except ServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/v1/reports/trust.html")
def trust_report_html(authorization: str = Header(default="")) -> HTMLResponse:
    cap = _cap(authorization)
    _authorize(cap, "reports:read")
    try:
        import httpx

        response = httpx.get(rt.settings.service("suite") + "/v1/report.html", timeout=120.0)
        response.raise_for_status()
        return HTMLResponse(response.text)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"report unavailable: {exc}") from exc


@app.get("/v1/labs/blue/config")
def lab_blue_config(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "labs:read")
    if rt.mode != "naive" or not rt.settings.allow_naive:
        _deny(cap, "labs:read", None, "blue-cell-sealed")
    return {"mode": rt.mode, "leaked_config": public_config()}


@app.get("/v1/labs/files")
def lab_files(
    tenant: str,
    path: str = "canary.txt",
    authorization: str = Header(default=""),
) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "labs:read")
    requested = (rt.settings.tenants_dir / tenant / path).resolve()
    allowed_root = rt.settings.tenants_dir.resolve()
    if allowed_root not in requested.parents:
        raise HTTPException(status_code=400, detail="path escapes the tenant root")
    if rt.mode != "naive":
        _deny(cap, "labs:read", None, f"filesystem-boundary-held:{tenant}")
    if not requested.exists():
        raise HTTPException(status_code=404, detail="file not found")
    return {"tenant": tenant, "path": path, "content": requested.read_text(encoding="utf-8", errors="replace")}


@app.post("/v1/demo/mode")
def set_mode(request: ModeRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    if cap.tenant_id != "system":
        _deny(cap, "admin:mode", None, "admin-only")
    if request.mode not in {"naive", "hardened"}:
        raise HTTPException(status_code=400, detail="mode must be naive or hardened")
    if request.mode == "naive" and not rt.settings.allow_naive:
        raise HTTPException(status_code=403, detail="naive mode is disabled")
    rt.mode = request.mode
    rt.append(
        ev.NAIVE_MODE_ENABLED if request.mode == "naive" else ev.HARDENED_MODE_ENABLED,
        {"mode": request.mode, "by": cap.tenant_id},
        tenant_id="system",
    )
    return {"mode": rt.mode}


@app.post("/v1/security-tests")
def security_tests(request: SecurityTestsRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "security-tests:run")
    try:
        from bastion_core.http import post_json

        return post_json(
            rt.settings.service("suite") + "/v1/security-tests",
            request.model_dump(),
            "suite",
            timeout=300.0,
            headers={"X-Bastion-Internal": rt.settings.internal_token},
        )
    except ServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/v1/reports/trust.json")
def trust_report_json(authorization: str = Header(default="")) -> Any:
    cap = _cap(authorization)
    _authorize(cap, "reports:read")
    try:
        return _notary_endpoint_any(rt.settings.service("suite") + "/v1/report.json")
    except ServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _notary_endpoint_any(url: str) -> Any:
    return get_json(url, "suite", timeout=120.0)


@app.get("/v1/reports/trust.pdf")
def trust_report_pdf(authorization: str = Header(default="")) -> Response:
    cap = _cap(authorization)
    _authorize(cap, "reports:read")
    try:
        import httpx

        response = httpx.get(rt.settings.service("suite") + "/v1/report.pdf", timeout=120.0)
        response.raise_for_status()
        return Response(content=response.content, media_type="application/pdf")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"report unavailable: {exc}") from exc


@app.get("/v1/dashboard/overview")
def dashboard_overview(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    if cap.tenant_id not in {"system", "blue", "suite"}:
        _deny(cap, "admin:dashboard", None, "dashboard-access")
    runs = rt.public_runs()
    integrity = rt.verify()
    events_payload = _notary_endpoint("/v1/events", {"limit": 1000})
    denied = [e for e in events_payload["events"] if e["event_type"] in {ev.AUTH_DENIED, ev.DLP_BLOCK}]
    leaks = [e for e in events_payload["events"] if e["event_type"] == ev.CANARY_SCAN and not e["metadata"].get("clean", True)]
    findings_count = len(_disk_findings())
    return {
        "mode": rt.mode,
        "runtime": rt.runtime_kind,
        "gateway_image": rt.gateway_image,
        "policy": {"hash": rt.policy_hash, "version": rt.policy_version, "error": rt.policy_error},
        "runs": {
            "total": len(runs),
            "active": len([r for r in runs if r["status"] in {"starting", "running"}]),
            "complete": len([r for r in runs if r["status"] == "complete"]),
            "failed": len([r for r in runs if r["status"] == "failed"]),
            "recent": runs[:8],
        },
        "integrity": integrity,
        "events": {
            "total": len(events_payload["events"]),
            "denied": len(denied),
            "canary_violations": len(leaks),
            "recent_denied": denied[-5:],
        },
        "findings": findings_count,
        "timing": rt.timing_report(),
    }


@app.get("/v1/dashboard/isolation")
def dashboard_isolation(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    if cap.tenant_id not in {"system", "blue", "suite"}:
        _deny(cap, "admin:dashboard", None, "dashboard-access")
    events_payload = _notary_endpoint("/v1/events", {"limit": 1000})
    attempts = []
    for event in events_payload["events"]:
        if event["event_type"] in {ev.AUTH_DENIED, ev.DLP_BLOCK, ev.PAYLOAD_REVEAL_MISMATCH}:
            attempts.append(
                {
                    "ts": event["ts"],
                    "type": event["event_type"],
                    "tenant": event.get("tenant_id"),
                    "detail": event["metadata"],
                    "seq": event["seq"],
                }
            )
        if event["event_type"] == ev.CANARY_SCAN and not event["metadata"].get("clean", True):
            attempts.append(
                {
                    "ts": event["ts"],
                    "type": "canary.leak",
                    "tenant": "system",
                    "detail": event["metadata"].get("leaks", []),
                    "seq": event["seq"],
                }
            )
    return {
        "mode": rt.mode,
        "zones": [
            {"id": "red", "label": "Red zone", "egress": "gateway only", "trust": "untrusted"},
            {"id": "blue", "label": "Blue cell", "egress": "none", "trust": "sealed"},
            {"id": "model", "label": "Model zone", "egress": "gateway only", "trust": "session-isolated"},
        ],
        "allowed_paths": [
            {"from": "red", "to": "gateway", "label": "signed capability token"},
            {"from": "gateway", "to": "blue", "label": "verdict request"},
            {"from": "gateway", "to": "model", "label": "per-session inference"},
        ],
        "blocked_paths": [
            {"from": "red", "to": "blue", "label": "direct network blocked"},
            {"from": "red", "to": "model", "label": "direct network blocked"},
            {"from": "blue", "to": "any", "label": "egress denied"},
            {"from": "red", "to": "metadata", "label": "cloud metadata blocked"},
        ],
        "recent_attempts": attempts[-20:],
    }


@app.get("/v1/metrics")
def metrics(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "metrics:read")
    try:
        notary_metrics = _notary_endpoint("/v1/metrics")
    except ServiceError:
        notary_metrics = {}
    return {
        "mode": rt.mode,
        "policy": {"hash": rt.policy_hash, "version": rt.policy_version, "counts": rt.policy_counts},
        "runs": {run.run_id: run.status for run in rt.runs.values()},
        "timing": rt.timing_report(),
        "ledger": notary_metrics,
        "subscribers": len(rt.subscribers),
    }


@app.get("/v1/metrics/timing")
def metrics_timing(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "metrics:read")
    return rt.timing_report()


@app.post("/v1/ledger/append")
def ledger_append(request: AppendEventRequest, authorization: str = Header(default=""), x_bastion_internal: str = Header(default="")) -> dict[str, Any]:
    if x_bastion_internal == rt.settings.internal_token:
        pass
    else:
        cap = _cap(authorization)
        _authorize(cap, "ledger:append", request.run_id, request.tenant_id)
    from bastion_core.http import post_json

    try:
        return post_json(
            rt.settings.service("notary") + "/v1/ledger/append",
            request.model_dump(),
            "notary",
            timeout=20.0,
            headers={"X-Bastion-Internal": rt.settings.internal_token},
        )
    except ServiceError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/v1/ledger/verify")
def ledger_verify(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    _authorize(cap, "ledger:verify")
    return rt.verify(force=True)


@app.get("/v1/ledger/export")
def ledger_export(authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    if cap.tenant_id not in {"system", "suite"}:
        _deny(cap, "ledger:verify", None, "admin-only")
    return rt.export()


def _rechain(events: list[dict[str, Any]]) -> None:
    prev = events[0].get("prev_hash") or GENESIS_HASH if events else GENESIS_HASH
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
            "prev_hash": event["prev_hash"],
        }
        event["event_hash"] = compute_event_hash(event["prev_hash"], record)
        prev = event["event_hash"]


@app.post("/v1/admin/tamper")
def tamper(request: TamperRequest, authorization: str = Header(default="")) -> dict[str, Any]:
    cap = _cap(authorization)
    if cap.tenant_id != "system":
        _deny(cap, "admin:tamper", None, "admin-only")
    export = rt.export()
    before = verify_export(copy.deepcopy(export), rt.settings.pinned_dir, export.get("anchor_entries"), require_anchor=True)
    document = copy.deepcopy(export)
    events = document["events"]
    if not events:
        raise HTTPException(status_code=409, detail="ledger has no events to tamper with")
    target = request.seq or max(1, len(events) // 2)
    mode = request.mode
    if mode == "edit":
        for event in events:
            if int(event["seq"]) == target:
                event["metadata"] = {**event["metadata"], "tampered": True}
                break
    elif mode == "edit-rechain":
        for event in events:
            if int(event["seq"]) == target:
                event["metadata"] = {**event["metadata"], "tampered": True}
                break
        _rechain(events)
    elif mode == "delete":
        document["events"] = [e for e in events if int(e["seq"]) != target]
        for index, event in enumerate(document["events"], start=1):
            event["seq"] = index
    elif mode == "reorder":
        if len(events) < 2:
            raise HTTPException(status_code=409, detail="need at least two events to reorder")
        events[0], events[1] = events[1], events[0]
        events[0]["seq"], events[1]["seq"] = events[1]["seq"], events[0]["seq"]
    elif mode in {"truncate", "truncate-rechain"}:
        keep = min(target, len(events) - 1)
        document["events"] = events[:keep]
        document["checkpoints"] = [c for c in document.get("checkpoints", []) if int(c["upto_seq"]) <= keep]
        if mode == "truncate-rechain":
            _rechain(document["events"])
    else:
        raise HTTPException(status_code=400, detail="unknown tamper mode")
    after = verify_export(document, rt.settings.pinned_dir, document.get("anchor_entries"), require_anchor=True)
    rt.append(
        ev.TAMPER_SIMULATED,
        {
            "tamper_mode": mode,
            "seq": target,
            "before": before["status"],
            "after": after["status"],
            "first_broken_link": after.get("first_broken_link"),
            "issues": [i["code"] for i in after["issues"]],
            "disposable_ledger": True,
        },
        tenant_id="system",
    )
    return {
        "mode": mode,
        "target_seq": target,
        "disposable": True,
        "before": {"status": before["status"], "first_broken_link": before.get("first_broken_link")},
        "after": after,
        "explanation": (
            "Tampering ran against an in-memory copy of exported evidence, never the live ledger. "
            "The verifier names the first broken link and checks the external anchor."
        ),
    }


@app.get("/v1/stream")
async def stream(request: Request, token: str = Query(default="")) -> StreamingResponse:
    try:
        cap = capability_from_header(f"Bearer {token}", rt.settings.admin_token)
        if cap.tenant_id not in {"system", "blue", "suite"}:
            raise HTTPException(status_code=403, detail="stream access denied")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    subscriber = rt.subscribe()

    async def generator():
        try:
            yield "retry: 3000\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = subscriber.get_nowait()
                    yield f"event: {message['channel']}\ndata: {json.dumps(message)}\n\n"
                except queue.Empty:
                    yield ": heartbeat\n\n"
                await asyncio.sleep(0.75)
        finally:
            rt.unsubscribe(subscriber)

    return StreamingResponse(generator(), media_type="text/event-stream")


@app.exception_handler(ServiceError)
def service_error_handler(request: Request, exc: ServiceError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": f"upstream {exc.service} unavailable: {exc}"})
