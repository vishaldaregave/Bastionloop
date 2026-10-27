from __future__ import annotations

import json
import sys
from dataclasses import replace
from pathlib import Path
from typing import Iterator

import pytest
from fastapi.testclient import TestClient

from bastion_core import config

ADMIN = "gateway-admin-credential"
INTERNAL = "gateway-internal-credential"


@pytest.fixture()
def gateway(monkeypatch, tmp_path: Path) -> Iterator[tuple[TestClient, object, str]]:
    for key in (
        "BASTION_ENV",
        "BASTION_RUNTIME",
        "BASTION_DATA_DIR",
        "BASTION_KEYS_DIR",
        "BASTION_PINNED_DIR",
        "BASTION_ADMIN_TOKEN",
        "BASTION_INTERNAL_TOKEN",
        "BASTION_POLICY_PATH",
        "BASTION_ALLOW_KEY_GEN",
        "BASTION_ALLOW_NAIVE",
        "BASTION_ALLOW_TAMPER",
        "BASTION_ALLOW_JUDGE",
    ):
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("BASTION_ENV", "development")
    monkeypatch.setenv("BASTION_RUNTIME", "local")
    monkeypatch.setenv("BASTION_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("BASTION_ADMIN_TOKEN", ADMIN)
    monkeypatch.setenv("BASTION_INTERNAL_TOKEN", INTERNAL)
    monkeypatch.setenv("BASTION_ALLOW_KEY_GEN", "1")
    monkeypatch.setenv("BASTION_ALLOW_NAIVE", "1")
    monkeypatch.setenv("BASTION_ALLOW_TAMPER", "1")
    monkeypatch.setenv("BASTION_ALLOW_JUDGE", "1")
    config.settings.cache_clear()
    for name in list(sys.modules):
        if name == "services" or name.startswith("services.") or name.startswith("workers."):
            del sys.modules[name]

    from services.gateway import app as gateway_app
    from services.gateway import orchestrator

    def fake_append(*args, **kwargs):
        return {
            "seq": 1,
            "event_id": "evt_test",
            "event_hash": "a" * 64,
            "prev_hash": "b" * 64,
            "ts": "2026-10-26T00:00:00+00:00",
        }

    monkeypatch.setattr(gateway_app.rt, "append", fake_append)
    red_token = gateway_app.rt.issue(
        "red",
        ["runs:read", "events:read", "findings:read", "labs:read", "infer"],
    )
    client = TestClient(gateway_app.app)
    yield client, gateway_app, red_token

    config.settings.cache_clear()
    for name in list(sys.modules):
        if name == "services" or name.startswith("services.") or name.startswith("workers."):
            del sys.modules[name]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_cross_tenant_run_access_is_denied(gateway):
    client, app_module, red_token = gateway
    created = client.post(
        "/v1/runs",
        headers=auth(ADMIN),
        json={"benchmark_id": "jailbreakbench-subset.v1", "tenant_id": "blue", "mode": "hardened", "max_cases": 1},
    )
    assert created.status_code == 200, created.text
    run_id = created.json()["run_id"]
    denied = client.get(f"/v1/runs/{run_id}", headers=auth(red_token))
    assert denied.status_code == 403
    assert app_module.rt.get_run(run_id).tenant_id == "blue"


def test_tenant_event_list_does_not_include_system_or_other_tenants(gateway, monkeypatch):
    client, app_module, red_token = gateway
    events = [
        {"seq": 1, "tenant_id": "red", "event_type": "red.event", "metadata": {}, "run_id": None, "ts": "t"},
        {"seq": 2, "tenant_id": "system", "event_type": "system.event", "metadata": {}, "run_id": None, "ts": "t"},
        {"seq": 3, "tenant_id": "blue", "event_type": "blue.event", "metadata": {}, "run_id": None, "ts": "t"},
    ]
    monkeypatch.setattr(app_module, "_notary_endpoint", lambda *args, **kwargs: {"events": events})
    response = client.get("/v1/events", headers=auth(red_token))
    assert response.status_code == 200
    body = response.json()
    assert [event["tenant_id"] for event in body["events"]] == ["red"]


def test_tenant_operator_endpoints_are_denied(gateway):
    client, _app_module, red_token = gateway
    assert client.get("/v1/metrics", headers=auth(red_token)).status_code == 403
    assert client.get("/v1/metrics/timing", headers=auth(red_token)).status_code == 403
    assert client.get("/v1/dashboard/overview", headers=auth(red_token)).status_code == 403
    assert client.get("/v1/dashboard/isolation", headers=auth(red_token)).status_code == 403
    assert client.get("/v1/reports/trust.json", headers=auth(red_token)).status_code == 403
    assert client.get("/v1/suite/results", headers=auth(red_token)).status_code == 403


def test_tenant_cannot_use_admin_or_judge_or_tamper_or_ledger_append(gateway):
    client, _app_module, red_token = gateway
    assert client.post("/v1/tokens", json={"tenant_id": "red", "actions": ["infer"]}).status_code == 403
    assert client.post("/v1/judge/session", json={}, headers=auth(red_token)).status_code == 403
    assert client.post("/v1/admin/tamper", json={"mode": "edit"}, headers=auth(red_token)).status_code == 403
    assert (
        client.post("/v1/ledger/append", json={"event_type": "forged"}, headers=auth(red_token)).status_code
        == 403
    )


def test_hardened_blue_lab_and_files_deny_red(gateway):
    client, _app_module, red_token = gateway
    assert client.get("/v1/labs/blue", headers=auth(red_token)).status_code == 403
    assert client.get("/v1/labs/blue/config", headers=auth(red_token)).status_code == 403
    assert (
        client.get(
            "/v1/labs/files",
            params={"tenant": "blue", "path": "canary.txt"},
            headers=auth(red_token),
        ).status_code
        == 403
    )
    assert (
        client.get(
            "/v1/labs/files",
            params={"tenant": "not-a-tenant", "path": "canary.txt"},
            headers=auth(red_token),
        ).status_code
        in {403, 404}
    )


def test_cross_tenant_finding_and_pcf_are_denied(gateway):
    client, app_module, red_token = gateway
    finding = {
        "finding_id": "finding_blue_01",
        "finding_type": "model-leak",
        "severity": "high",
        "run": {"run_id": "run_blue", "tenant_id": "blue", "mode": "hardened"},
        "attack": {"case_id": "JB-01"},
        "signatures": {"signer": {"signature": "x"}},
        "chain": {},
    }
    (app_module.rt.settings.findings_dir / "finding_blue_01.json").write_text(
        json.dumps(finding), encoding="utf-8"
    )
    assert client.get("/v1/findings/finding_blue_01", headers=auth(red_token)).status_code == 403
    listed = client.get("/v1/findings", headers=auth(red_token))
    assert listed.status_code == 200
    assert listed.json()["findings"] == []
    pcf = {"finding_id": "finding_blue_01", "run": {"run_id": "run_blue", "tenant_id": "blue"}, "chain": {}}
    assert client.post("/v1/verify/pcf", json={"pcf": pcf}, headers=auth(red_token)).status_code == 403


def test_red_token_cannot_open_operator_stream(gateway):
    client, _app_module, red_token = gateway
    response = client.get("/v1/stream", params={"token": red_token})
    assert response.status_code == 403


def test_tenant_cannot_select_another_tenant_or_reuse_another_run_scope(gateway):
    client, app_module, _red_token = gateway
    create_token = app_module.rt.issue("red", ["runs:create"])
    selected = client.post(
        "/v1/runs",
        headers=auth(create_token),
        json={"benchmark_id": "jailbreakbench-subset.v1", "tenant_id": "blue", "max_cases": 1},
    )
    assert selected.status_code == 403

    created = client.post(
        "/v1/runs",
        headers=auth(ADMIN),
        json={"benchmark_id": "jailbreakbench-subset.v1", "tenant_id": "red", "mode": "hardened", "max_cases": 1},
    )
    assert created.status_code == 200, created.text
    run_id = created.json()["run_id"]
    wrong_scope = app_module.rt.issue("red", ["infer"], run_id="run_other")
    inferred = client.post(
        "/v1/infer",
        headers=auth(wrong_scope),
        json={"run_id": run_id, "prompt": "hello"},
    )
    assert inferred.status_code == 403


def test_blue_cannot_read_global_events_or_red_run_aggregates(gateway):
    client, app_module, _red_token = gateway
    blue_token = app_module.rt.issue("blue", ["events:read", "labs:read"])
    assert client.get("/v1/events", headers=auth(blue_token)).status_code == 403
    assert client.get("/v1/labs/blue", headers=auth(blue_token)).status_code == 403
    assert client.get("/v1/metrics", headers=auth(blue_token)).status_code == 403
    assert client.get("/v1/reports/trust.json", headers=auth(blue_token)).status_code == 403


def test_lab_file_traversal_is_rejected(gateway):
    client, _app_module, red_token = gateway
    response = client.get(
        "/v1/labs/files",
        params={"tenant": "red", "path": "../../etc/passwd"},
        headers=auth(red_token),
    )
    assert response.status_code == 400


def test_public_anchor_read_is_read_only(gateway, monkeypatch):
    client, app_module, _red_token = gateway
    monkeypatch.setattr(
        app_module,
        "get_json",
        lambda *args, **kwargs: {"entries": [{"counter": 1, "checkpoint_hash": "a" * 64}], "count": 1},
    )
    response = client.get("/v1/anchor")
    assert response.status_code == 200
    assert response.json()["entries"][0]["counter"] == 1
    assert client.post("/v1/anchor", json={}).status_code == 405


def test_tamper_and_judge_are_disabled_when_configured_off(gateway):
    client, app_module, _red_token = gateway
    app_module.rt.settings = replace(app_module.rt.settings, allow_tamper=False, allow_judge=False)
    admin = auth(ADMIN)
    assert client.post("/v1/admin/tamper", json={"mode": "edit"}, headers=admin).status_code == 403
    assert client.post("/v1/judge/session", json={}, headers=admin).status_code == 403


def test_health_alias_and_policy_endpoint_are_read_only(gateway):
    client, _app_module, red_token = gateway
    health = client.get("/health")
    assert health.status_code == 200
    body = health.json()
    assert body["service"] == "gateway"
    assert "limits" in body
    assert body["limits"]["checkpoint_every"] >= 1

    policy = client.get("/v1/policy", headers=auth(ADMIN))
    assert policy.status_code == 200
    document = policy.json()
    assert document["status"] in {"LOADED", "UNAVAILABLE"}
    assert "hash" in document

    denied = client.get("/v1/policy", headers=auth(red_token))
    assert denied.status_code == 403
    assert client.post("/v1/policy", json={}).status_code == 405
