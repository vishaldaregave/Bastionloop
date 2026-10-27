from __future__ import annotations

import hmac

from fastapi import Header, HTTPException

from .config import settings


def constant_time_equals(left: str, right: str) -> bool:
    if not left or not right:
        return False
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


def require_internal(x_bastion_internal: str = Header(default="")) -> None:
    """Shared service-to-service credential.

    This is deliberately not a network check. A service must reject the request
    even when the caller can reach it over an internal Docker network.
    """
    expected = settings().internal_token
    if not constant_time_equals(x_bastion_internal, expected):
        raise HTTPException(status_code=403, detail="internal service credential required")


def require_admin_bearer(authorization: str = Header(default="")) -> None:
    token = authorization.removeprefix("Bearer ").strip()
    if not constant_time_equals(token, settings().admin_token):
        raise HTTPException(status_code=403, detail="admin credential required")
