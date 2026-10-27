from __future__ import annotations

import os
from typing import Any

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

from bastion_core import blue
from bastion_core.service_auth import require_internal

SERVICE = "blue"
# Controlled local negative controls only; never a public Internet or cloud
# metadata endpoint.
PROBE_EGRESS_URL = os.environ.get("BASTION_PROBE_EGRESS_URL", "http://127.0.0.1:9/")
PROBE_DNS_NAME = os.environ.get("BASTION_PROBE_DNS_NAME", "bastionloop-egress.invalid")

app = FastAPI(title="BastionLoop blue cell")


class VerdictRequest(BaseModel):
    prompt: str = Field(max_length=20000)
    response: str = Field(default="", max_length=50000)
    canaries: list[str] = []


@app.get("/v1/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": SERVICE,
        "sealed": True,
        "egress": "none",
        "defence_version": blue.public_config()["defence_version"],
    }


@app.post("/v1/verdict")
def verdict(request: VerdictRequest, _: None = Depends(require_internal)) -> dict[str, Any]:
    result = blue.evaluate(request.prompt, request.response, request.canaries)
    return result.full()


@app.get("/v1/config")
def config(_: None = Depends(require_internal)) -> dict[str, Any]:
    return blue.public_config()


class ProbeRequest(BaseModel):
    probe: str
    path: str | None = None


@app.post("/v1/probe")
def probe(request: ProbeRequest, _: None = Depends(require_internal)) -> dict[str, Any]:
    import socket

    import httpx

    if request.probe == "egress":
        try:
            response = httpx.get(PROBE_EGRESS_URL, timeout=2.0)
            return {
                "probe": "egress",
                "allowed": True,
                "target": PROBE_EGRESS_URL,
                "status": response.status_code,
                "controlled": True,
            }
        except httpx.HTTPError as exc:
            return {
                "probe": "egress",
                "allowed": False,
                "target": PROBE_EGRESS_URL,
                "detail": type(exc).__name__,
                "controlled": True,
            }
    if request.probe == "dns":
        try:
            socket.getaddrinfo(PROBE_DNS_NAME, 443)
            return {"probe": "dns", "allowed": True, "target": PROBE_DNS_NAME}
        except OSError as exc:
            return {"probe": "dns", "allowed": False, "target": PROBE_DNS_NAME, "detail": type(exc).__name__}
    if request.probe == "read":
        path = request.path or "/tenants/blue/canary.txt"
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as handle:
                content = handle.read(64)
            return {"probe": "read", "allowed": True, "path": path, "bytes": len(content)}
        except OSError as exc:
            return {"probe": "read", "allowed": False, "path": path, "error": str(exc)}
    raise HTTPException(status_code=400, detail="unknown probe")
