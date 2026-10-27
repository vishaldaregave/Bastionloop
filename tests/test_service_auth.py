from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterator

import pytest
from fastapi.testclient import TestClient

from bastion_core import config
from bastion_core.ledger import build_checkpoint

INTERNAL = "test-internal-credential"
ADMIN = "test-admin-credential"


@pytest.fixture()
def clean_modules(monkeypatch, tmp_path: Path) -> Iterator[None]:
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
    yield
    config.settings.cache_clear()
    for name in list(sys.modules):
        if name == "services" or name.startswith("services.") or name.startswith("workers."):
            del sys.modules[name]


def test_signer_requires_internal_credential(clean_modules):
    from services.signer.app import app

    checkpoint = build_checkpoint(1, 1, "a" * 64, "b" * 64)
    with TestClient(app) as client:
        assert client.post("/v1/sign/checkpoint", json={"checkpoint": checkpoint}).status_code == 403
        assert (
            client.post(
                "/v1/sign/checkpoint",
                json={"checkpoint": checkpoint},
                headers={"X-Bastion-Internal": ADMIN},
            ).status_code
            == 403
        )
        response = client.post(
            "/v1/sign/checkpoint",
            json={"checkpoint": checkpoint},
            headers={"X-Bastion-Internal": INTERNAL},
        )
        assert response.status_code == 200
        assert response.json()["signature"]


def test_witness_requires_internal_credential(clean_modules):
    from services.witness.app import app

    checkpoint = build_checkpoint(1, 1, "a" * 64, "b" * 64)
    with TestClient(app) as client:
        assert client.post("/v1/witness/checkpoint", json={"checkpoint": checkpoint}).status_code == 403
        response = client.post(
            "/v1/witness/checkpoint",
            json={"checkpoint": checkpoint},
            headers={"X-Bastion-Internal": INTERNAL},
        )
        assert response.status_code == 200
        assert response.json()["signature"]


def test_anchor_write_requires_internal_credential(clean_modules):
    from services.anchor.app import app

    record = {
        "counter": 1,
        "upto_seq": 1,
        "last_hash": "a" * 64,
        "merkle_root": "b" * 64,
        "checkpoint_hash": "c" * 64,
    }
    with TestClient(app) as client:
        assert client.post("/v1/anchor", json=record).status_code == 403
        response = client.post("/v1/anchor", json=record, headers={"X-Bastion-Internal": INTERNAL})
        assert response.status_code == 200
        assert response.json()["counter"] == 1


def test_notary_reads_and_writes_require_internal_credential(clean_modules):
    from services.notary.app import app

    with TestClient(app) as client:
        assert client.get("/v1/events").status_code == 403
        assert client.get("/v1/ledger/export").status_code == 403
        assert client.get("/v1/ledger/verify").status_code == 403
        assert client.get("/v1/metrics").status_code == 403
        assert client.post("/v1/ledger/append", json={"event_type": "test"}).status_code == 403
        headers = {"X-Bastion-Internal": INTERNAL}
        assert client.get("/v1/events", headers=headers).status_code == 200
        assert client.get("/v1/ledger/export", headers=headers).status_code == 200
        assert client.get("/v1/ledger/verify", headers=headers).status_code == 200
        assert client.post("/v1/ledger/append", json={"event_type": "test"}, headers=headers).status_code == 200


def test_model_routes_require_internal_credential(clean_modules):
    from workers.model.app import app

    headers = {"X-Bastion-Internal": INTERNAL}
    with TestClient(app) as client:
        session = {"tenant_id": "red", "run_id": "run_1", "test_id": "case", "mode": "hardened"}
        assert client.post("/v1/sessions", json=session).status_code == 403
        created = client.post("/v1/sessions", json=session, headers=headers)
        assert created.status_code == 200
        session_id = created.json()["session_id"]
        assert client.post("/v1/infer", json={"session_id": session_id, "prompt": "hello"}).status_code == 403
        assert (
            client.post(
                "/v1/infer",
                json={"session_id": session_id, "prompt": "hello"},
                headers=headers,
            ).status_code
            == 200
        )
        assert client.get("/v1/sessions").status_code == 403


def test_blue_and_red_probe_require_internal_credential(clean_modules):
    from workers.blue.app import app as blue_app
    from workers.red.app import app as red_app

    with TestClient(blue_app) as client:
        assert client.post("/v1/verdict", json={"prompt": "x", "response": "y"}).status_code == 403
        assert (
            client.post(
                "/v1/verdict",
                json={"prompt": "x", "response": "y"},
                headers={"X-Bastion-Internal": INTERNAL},
            ).status_code
            == 200
        )
    with TestClient(red_app) as client:
        assert client.post("/v1/probe", json={"probe": "docker-sock"}).status_code == 403
        assert (
            client.post(
                "/v1/probe",
                json={"probe": "docker-sock"},
                headers={"X-Bastion-Internal": INTERNAL},
            ).status_code
            == 200
        )


def test_suite_results_and_reports_require_internal_credential(clean_modules):
    from services.challenge_suite.app import app

    with TestClient(app) as client:
        assert client.get("/v1/results").status_code == 403
        assert client.get("/v1/report.json").status_code == 403
        headers = {"X-Bastion-Internal": INTERNAL}
        assert client.get("/v1/results", headers=headers).status_code == 200
