from __future__ import annotations

from pathlib import Path

import pytest

from bastion_core import config
from bastion_core.config import ConfigError
from bastion_core.crypto import ensure_keypair

ADMIN = "0123456789abcdef" * 4
INTERNAL = "fedcba9876543210" * 4
IMAGE = "sha256:" + "a" * 64

_ENV_KEYS = (
    "BASTION_ENV",
    "BASTION_RUNTIME",
    "BASTION_MODE",
    "BASTION_DATA_DIR",
    "BASTION_KEYS_DIR",
    "BASTION_PINNED_DIR",
    "BASTION_ADMIN_TOKEN",
    "BASTION_INTERNAL_TOKEN",
    "BASTION_GATEWAY_IMAGE_DIGEST",
    "BASTION_CORS_ORIGINS",
    "BASTION_ALLOW_KEY_GEN",
    "BASTION_ALLOW_NAIVE",
    "BASTION_ALLOW_TAMPER",
    "BASTION_ALLOW_JUDGE",
)


@pytest.fixture(autouse=True)
def clean_config(monkeypatch, tmp_path: Path):
    for key in _ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("BASTION_DATA_DIR", str(tmp_path / "data"))
    config.settings.cache_clear()
    yield
    config.settings.cache_clear()


def set_production(monkeypatch):
    monkeypatch.setenv("BASTION_ENV", "production")
    monkeypatch.setenv("BASTION_RUNTIME", "docker")
    monkeypatch.setenv("BASTION_ADMIN_TOKEN", ADMIN)
    monkeypatch.setenv("BASTION_INTERNAL_TOKEN", INTERNAL)
    monkeypatch.setenv("BASTION_GATEWAY_IMAGE_DIGEST", IMAGE)
    for flag in ("KEY_GEN", "NAIVE", "TAMPER", "JUDGE"):
        monkeypatch.setenv(f"BASTION_ALLOW_{flag}", "0")


def test_development_defaults_are_explicitly_demo_only(monkeypatch):
    monkeypatch.setenv("BASTION_ENV", "development")
    s = config.settings()
    assert s.is_development
    assert s.admin_token == config.DEMO_ADMIN_TOKEN
    assert s.internal_token == config.DEMO_INTERNAL_TOKEN
    assert s.allow_key_gen is True
    assert s.allow_naive is True
    assert s.allow_tamper is True
    assert s.allow_judge is True
    assert s.runtime == "local"
    assert "http://127.0.0.1:5173" in s.cors_origins


def test_production_requires_explicit_credentials(monkeypatch):
    monkeypatch.setenv("BASTION_ENV", "production")
    monkeypatch.setenv("BASTION_RUNTIME", "docker")
    monkeypatch.setenv("BASTION_GATEWAY_IMAGE_DIGEST", IMAGE)
    with pytest.raises(ConfigError, match="BASTION_ADMIN_TOKEN is required"):
        config.settings()


def test_production_rejects_demo_admin_and_internal_credentials(monkeypatch):
    set_production(monkeypatch)
    monkeypatch.setenv("BASTION_ADMIN_TOKEN", config.DEMO_ADMIN_TOKEN)
    with pytest.raises(ConfigError, match="must not be a demo"):
        config.settings()


def test_production_rejects_short_and_equal_credentials(monkeypatch):
    set_production(monkeypatch)
    monkeypatch.setenv("BASTION_ADMIN_TOKEN", "short")
    with pytest.raises(ConfigError, match="at least 32"):
        config.settings()

    config.settings.cache_clear()
    monkeypatch.setenv("BASTION_ADMIN_TOKEN", ADMIN)
    monkeypatch.setenv("BASTION_INTERNAL_TOKEN", ADMIN)
    with pytest.raises(ConfigError, match="must be different"):
        config.settings()


@pytest.mark.parametrize(
    "flag",
    ["BASTION_ALLOW_KEY_GEN", "BASTION_ALLOW_NAIVE", "BASTION_ALLOW_TAMPER", "BASTION_ALLOW_JUDGE"],
)
def test_production_rejects_development_switches(monkeypatch, flag):
    set_production(monkeypatch)
    monkeypatch.setenv(flag, "1")
    with pytest.raises(ConfigError, match="must be disabled in production"):
        config.settings()


def test_production_rejects_implicit_or_naive_runtime(monkeypatch):
    set_production(monkeypatch)
    monkeypatch.setenv("BASTION_RUNTIME", "local")
    with pytest.raises(ConfigError, match="must be 'docker'"):
        config.settings()

    config.settings.cache_clear()
    set_production(monkeypatch)
    monkeypatch.setenv("BASTION_MODE", "naive")
    with pytest.raises(ConfigError, match="naive is not allowed"):
        config.settings()


def test_production_requires_real_image_digest_and_safe_cors(monkeypatch):
    set_production(monkeypatch)
    monkeypatch.setenv("BASTION_GATEWAY_IMAGE_DIGEST", "sha256:dev-local-gateway")
    with pytest.raises(ConfigError, match="real image digest"):
        config.settings()

    config.settings.cache_clear()
    set_production(monkeypatch)
    monkeypatch.setenv("BASTION_CORS_ORIGINS", "*")
    with pytest.raises(ConfigError, match="cannot contain"):
        config.settings()


def test_valid_production_configuration_fails_closed_on_demo_features(monkeypatch):
    set_production(monkeypatch)
    s = config.settings()
    assert s.is_production
    assert s.admin_token == ADMIN
    assert s.internal_token == INTERNAL
    assert s.allow_key_gen is False
    assert s.allow_naive is False
    assert s.allow_tamper is False
    assert s.allow_judge is False
    assert s.mode == "hardened"
    assert s.cors_origins == ()


def test_production_gateway_fails_without_control_key(monkeypatch, tmp_path: Path):
    set_production(monkeypatch)
    monkeypatch.setenv("BASTION_KEYS_DIR", str(tmp_path / "keys"))
    monkeypatch.setenv("BASTION_PINNED_DIR", str(tmp_path / "pinned"))
    from services.gateway.runtime import Runtime

    with pytest.raises(RuntimeError, match="control signing key is unavailable"):
        Runtime()


def test_production_gateway_fails_closed_when_policy_is_missing(monkeypatch, tmp_path: Path):
    set_production(monkeypatch)
    keys = tmp_path / "keys"
    pinned = tmp_path / "pinned"
    ensure_keypair("control", keys, pinned)
    monkeypatch.setenv("BASTION_KEYS_DIR", str(keys))
    monkeypatch.setenv("BASTION_PINNED_DIR", str(pinned))
    monkeypatch.setenv("BASTION_POLICY_PATH", str(tmp_path / "missing-policy.json"))
    from services.gateway.runtime import Runtime

    with pytest.raises(RuntimeError, match="policy bundle missing"):
        Runtime()
