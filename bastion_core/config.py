from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _env_path(name: str, default: Path) -> Path:
    raw = os.environ.get(name)
    if not raw:
        return default
    return Path(raw).expanduser().resolve()


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    return int(raw) if raw else default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


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
    allow_naive: bool
    allow_key_gen: bool
    admin_token: str
    internal_token: str
    services: dict[str, str] = field(default_factory=dict)

    def service(self, name: str) -> str:
        return self.services.get(name, "")


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
    data_dir = _env_path("BASTION_DATA_DIR", ROOT / "var")
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
        checkpoint_every=_env_int("BASTION_CHECKPOINT_EVERY", 8),
        padding_bucket_ms=_env_int("BASTION_PADDING_MS", 120),
        runtime=os.environ.get("BASTION_RUNTIME", "local"),
        mode=os.environ.get("BASTION_MODE", "hardened"),
        allow_naive=_env_bool("BASTION_ALLOW_NAIVE", True),
        allow_key_gen=_env_bool("BASTION_ALLOW_KEY_GEN", True),
        admin_token=os.environ.get("BASTION_ADMIN_TOKEN", "dev-admin-token"),
        internal_token=os.environ.get("BASTION_INTERNAL_TOKEN", "dev-internal-token"),
        services=_service_urls(),
    )


def ensure_dirs(s: Settings | None = None) -> Settings:
    s = s or settings()
    for path in (s.data_dir, s.keys_dir, s.pinned_dir, s.tenants_dir, s.findings_dir, s.reports_dir, s.policy_path.parent, s.anchor_file.parent):
        path.mkdir(parents=True, exist_ok=True)
    return s
