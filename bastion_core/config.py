from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DEMO_ADMIN_TOKEN = "dev-admin-token"
DEMO_INTERNAL_TOKEN = "dev-internal-token"
_DEMO_SECRETS = {
    DEMO_ADMIN_TOKEN,
    DEMO_INTERNAL_TOKEN,
    "changeme",
    "change-me",
    "password",
    "secret",
    "admin",
    "supersecretkey",
    "test",
    "dev",
}
_PRODUCTION_MIN_SECRET_LENGTH = 32


class ConfigError(RuntimeError):
    pass


def _env_path(name: str, default: Path) -> Path:
    raw = os.environ.get(name)
    if not raw:
        return default
    return Path(raw).expanduser().resolve()


def _env_int(name: str, default: int, minimum: int = 0) -> int:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer") from exc
    if value < minimum:
        raise ConfigError(f"{name} must be >= {minimum}")
    return value


def _parse_bool(name: str, raw: str) -> bool:
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    raise ConfigError(f"{name} must be a boolean")


def _environment() -> str:
    raw = (os.environ.get("BASTION_ENV") or "development").strip().lower()
    if raw in {"dev", "development", "local"}:
        return "development"
    if raw in {"prod", "production"}:
        return "production"
    raise ConfigError("BASTION_ENV must be 'development' or 'production'")


def _require_secret(name: str, default: str, environment: str) -> str:
    raw = (os.environ.get(name) or "").strip()
    if environment == "production":
        if not raw:
            raise ConfigError(f"{name} is required in production")
        if raw.lower() in _DEMO_SECRETS or "dev-" in raw.lower() or "change" in raw.lower():
            raise ConfigError(f"{name} must not be a demo or placeholder credential in production")
        if len(raw) < _PRODUCTION_MIN_SECRET_LENGTH:
            raise ConfigError(f"{name} must be at least {_PRODUCTION_MIN_SECRET_LENGTH} characters in production")
        if len(set(raw)) < 8:
            raise ConfigError(f"{name} is too low-entropy for production")
        return raw
    return raw or default


def _development_flag(name: str, development_default: bool, environment: str) -> bool:
    raw = os.environ.get(name)
    if environment == "production":
        if raw is not None and _parse_bool(name, raw):
            raise ConfigError(f"{name} must be disabled in production")
        return False
    if raw is None or raw == "":
        return development_default
    return _parse_bool(name, raw)


def _mode(environment: str) -> str:
    raw = (os.environ.get("BASTION_MODE") or "hardened").strip().lower()
    if raw not in {"hardened", "naive"}:
        raise ConfigError("BASTION_MODE must be 'hardened' or 'naive'")
    if environment == "production" and raw == "naive":
        raise ConfigError("BASTION_MODE=naive is not allowed in production")
    return raw


def _runtime(environment: str) -> str:
    raw = (os.environ.get("BASTION_RUNTIME") or "local").strip().lower()
    if raw not in {"local", "docker"}:
        raise ConfigError("BASTION_RUNTIME must be 'local' or 'docker'")
    if environment == "production" and raw != "docker":
        raise ConfigError("BASTION_RUNTIME must be 'docker' in production")
    return raw


@dataclass(frozen=True)
class Settings:
    root: Path
    data_dir: Path
    keys_dir: Path
    pinned_dir: Path
    tenants_dir: Path
    findings_dir: Path
    reports_dir: Path
    policy_path: Path
    anchor_file: Path
    checkpoint_every: int
    padding_bucket_ms: int
    runtime: str
    mode: str
    environment: str
    allow_naive: bool
    allow_key_gen: bool
    allow_tamper: bool
    allow_judge: bool
    admin_token: str
    internal_token: str
    gateway_image_digest: str
    cors_origins: tuple[str, ...] = ()
    services: dict[str, str] = field(default_factory=dict)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    def service(self, name: str) -> str:
        return self.services.get(name, "")


def _gateway_image_digest(environment: str) -> str:
    raw = (os.environ.get("BASTION_GATEWAY_IMAGE_DIGEST") or "").strip()
    if environment == "production":
        if not raw or raw in {"unknown", "bastionloop/core:local", "sha256:dev-local-gateway"}:
            raise ConfigError("BASTION_GATEWAY_IMAGE_DIGEST must be a real image digest in production")
        if not raw.startswith("sha256:") or len(raw) < 20:
            raise ConfigError("BASTION_GATEWAY_IMAGE_DIGEST must be a sha256 image digest in production")
        return raw
    return raw or "sha256:dev-local-gateway"


def _cors_origins(environment: str) -> tuple[str, ...]:
    raw = os.environ.get("BASTION_CORS_ORIGINS")
    if raw is None:
        if environment == "development":
            return ("http://127.0.0.1:5173", "http://localhost:5173")
        return ()
    origins = tuple(origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip())
    if environment == "production" and "*" in origins:
        raise ConfigError("BASTION_CORS_ORIGINS cannot contain '*' in production")
    return origins


def _service_urls() -> dict[str, str]:
    defaults = {
        "gateway": "http://127.0.0.1:8000",
        "notary": "http://127.0.0.1:8001",
        "signer": "http://127.0.0.1:8002",
        "witness": "http://127.0.0.1:8003",
        "anchor": "http://127.0.0.1:8004",
        "model": "http://127.0.0.1:8005",
        "blue": "http://127.0.0.1:8006",
        "suite": "http://127.0.0.1:8007",
        "red": "http://127.0.0.1:8010",
    }
    urls = {}
    for name, default in defaults.items():
        urls[name] = os.environ.get(f"BASTION_{name.upper()}_URL", default).rstrip("/")
    return urls


@lru_cache(maxsize=1)
def settings() -> Settings:
    environment = _environment()
    data_dir = _env_path("BASTION_DATA_DIR", ROOT / "var")
    admin_token = _require_secret("BASTION_ADMIN_TOKEN", DEMO_ADMIN_TOKEN, environment)
    internal_token = _require_secret("BASTION_INTERNAL_TOKEN", DEMO_INTERNAL_TOKEN, environment)
    if admin_token == internal_token:
        raise ConfigError("BASTION_ADMIN_TOKEN and BASTION_INTERNAL_TOKEN must be different")
    return Settings(
        root=ROOT,
        data_dir=data_dir,
        keys_dir=_env_path("BASTION_KEYS_DIR", data_dir / "keys"),
        pinned_dir=_env_path("BASTION_PINNED_DIR", data_dir / "pinned"),
        tenants_dir=_env_path("BASTION_TENANTS_DIR", data_dir / "tenants"),
        findings_dir=_env_path("BASTION_FINDINGS_DIR", data_dir / "findings"),
        reports_dir=_env_path("BASTION_REPORTS_DIR", data_dir / "reports"),
        policy_path=_env_path("BASTION_POLICY_PATH", data_dir / "policies" / "policy.json"),
        anchor_file=_env_path("BASTION_ANCHOR_FILE", data_dir / "anchor" / "anchor.jsonl"),
        checkpoint_every=_env_int("BASTION_CHECKPOINT_EVERY", 8, minimum=1),
        padding_bucket_ms=_env_int("BASTION_PADDING_MS", 120, minimum=0),
        runtime=_runtime(environment),
        mode=_mode(environment),
        environment=environment,
        allow_naive=_development_flag("BASTION_ALLOW_NAIVE", True, environment),
        allow_key_gen=_development_flag("BASTION_ALLOW_KEY_GEN", True, environment),
        allow_tamper=_development_flag("BASTION_ALLOW_TAMPER", True, environment),
        allow_judge=_development_flag("BASTION_ALLOW_JUDGE", True, environment),
        admin_token=admin_token,
        internal_token=internal_token,
        gateway_image_digest=_gateway_image_digest(environment),
        cors_origins=_cors_origins(environment),
        services=_service_urls(),
    )


def ensure_dirs(s: Settings | None = None) -> Settings:
    s = s or settings()
    for path in (
        s.data_dir,
        s.keys_dir,
        s.pinned_dir,
        s.tenants_dir,
        s.findings_dir,
        s.reports_dir,
        s.policy_path.parent,
        s.anchor_file.parent,
    ):
        path.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(s.keys_dir, 0o700)
    except OSError:
        pass
    return s
