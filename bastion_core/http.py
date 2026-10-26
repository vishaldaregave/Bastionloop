from __future__ import annotations

from typing import Any

import httpx


class ServiceError(RuntimeError):
    def __init__(self, service: str, message: str, status: int | None = None):
        super().__init__(f"{service}: {message}")
        self.service = service
        self.status = status


def _handle(service: str, response: httpx.Response) -> Any:
    if response.status_code >= 400:
        try:
            detail = response.json().get("detail", response.text)
        except ValueError:
            detail = response.text
        raise ServiceError(service, str(detail), response.status_code)
    if not response.content:
        return {}
    return response.json()


def get_json(
    url: str,
    service: str = "service",
    timeout: float = 10.0,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> Any:
    try:
        response = httpx.get(url, timeout=timeout, params=params, headers=headers)
    except httpx.HTTPError as exc:
        raise ServiceError(service, f"unreachable: {exc}") from exc
    return _handle(service, response)


def post_json(
    url: str,
    payload: dict[str, Any],
    service: str = "service",
    timeout: float = 30.0,
    headers: dict[str, str] | None = None,
) -> Any:
    try:
        response = httpx.post(url, json=payload, timeout=timeout, headers=headers)
    except httpx.HTTPError as exc:
        raise ServiceError(service, f"unreachable: {exc}") from exc
    return _handle(service, response)


def wait_for(url: str, attempts: int = 60, delay: float = 0.5) -> bool:
    import time

    for _ in range(attempts):
        try:
            response = httpx.get(url, timeout=1.0)
            if response.status_code < 500:
                return True
        except httpx.HTTPError:
            pass
        time.sleep(delay)
    return False
