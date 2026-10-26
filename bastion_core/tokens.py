from __future__ import annotations

import secrets
import time
from dataclasses import dataclass
from typing import Iterable

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from .canonical import b64u_d, b64u_e, canonical_json, utcnow_ts
from .crypto import key_id, sign_bytes, verify_bytes

TOKEN_VERSION = "v1"


class TokenError(RuntimeError):
    pass


@dataclass(frozen=True)
class Capability:
    tenant_id: str
    actions: tuple[str, ...]
    run_id: str | None
    mode: str
    issued_at: float
    expires_at: float
    jti: str

    def allows(self, action: str) -> bool:
        return action in self.actions or "*" in self.actions


def issue_token(
    control_key: Ed25519PrivateKey,
    tenant_id: str,
    actions: Iterable[str],
    run_id: str | None = None,
    ttl_seconds: int = 300,
    mode: str = "hardened",
    now: float | None = None,
) -> str:
    issued = now if now is not None else utcnow_ts()
    payload = {
        "v": 1,
        "sub": tenant_id,
        "actions": sorted(set(actions)),
        "run_id": run_id,
        "mode": mode,
        "iat": issued,
        "exp": issued + ttl_seconds,
        "jti": secrets.token_hex(8),
    }
    body = canonical_json(payload)
    signing_input = f"{TOKEN_VERSION}.{b64u_e(body)}".encode("ascii")
    signature = sign_bytes(control_key, signing_input)
    return f"{TOKEN_VERSION}.{b64u_e(body)}.{b64u_e(b64u_d(signature))}"


def decode_token(token: str) -> Capability:
    parts = token.split(".")
    if len(parts) != 3 or parts[0] != TOKEN_VERSION:
        raise TokenError("malformed token")
    try:
        payload = b64u_d(parts[1])
    except ValueError as exc:
        raise TokenError("malformed token payload") from exc
    import json

    try:
        claims = json.loads(payload)
    except ValueError as exc:
        raise TokenError("malformed token claims") from exc
    return Capability(
        tenant_id=claims["sub"],
        actions=tuple(claims.get("actions", [])),
        run_id=claims.get("run_id"),
        mode=claims.get("mode", "hardened"),
        issued_at=float(claims["iat"]),
        expires_at=float(claims["exp"]),
        jti=claims["jti"],
    )


def verify_token(
    token: str,
    control_pub: Ed25519PublicKey,
    action: str | None = None,
    run_id: str | None = None,
    now: float | None = None,
) -> Capability:
    parts = token.split(".")
    if len(parts) != 3 or parts[0] != TOKEN_VERSION:
        raise TokenError("malformed token")
    signing_input = f"{TOKEN_VERSION}.{parts[1]}".encode("ascii")
    try:
        signature = b64u_d(parts[2])
    except ValueError as exc:
        raise TokenError("malformed token signature") from exc
    from .canonical import b64e

    if not verify_bytes(control_pub, signing_input, b64e(signature)):
        raise TokenError("bad token signature")
    cap = decode_token(token)
    current = now if now is not None else time.time()
    if current >= cap.expires_at:
        raise TokenError("token expired")
    if current + 30 < cap.issued_at:
        raise TokenError("token not yet valid")
    if action is not None and not cap.allows(action):
        raise TokenError(f"token not scoped for {action}")
    if run_id is not None and cap.run_id not in (None, run_id):
        raise TokenError("token scoped to another run")
    return cap


def token_key_id(public_key: Ed25519PublicKey) -> str:
    return key_id(public_key)
