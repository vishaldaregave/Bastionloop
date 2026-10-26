from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from bastion_core import blue

SERVICE = "blue"
INTERNAL_TOKEN = os.environ.get("BASTION_INTERNAL_TOKEN", "dev-internal-token")

app = FastAPI(title="BastionLoop blue cell")


class VerdictRequest(BaseModel):
    prompt: str = Field(max_length=20000)
    response: str = Field(default="", max_length=50000)
    canaries: list[str] = []


def _require_internal(x_bastion_internal: str = Header(default="")) -> None:
    if x_bastion_internal != INTERNAL_TOKEN:
        raise HTTPException(status_code=403, detail="blue cell accepts gateway calls only")


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
def verdict(request: VerdictRequest, x_bastion_internal: str = Header(default="")) -> dict[str, Any]:
    _require_internal(x_bastion_internal)
    result = blue.evaluate(request.prompt, request.response, request.canaries)
    return result.full()


@app.get("/v1/config")
def config(x_bastion_internal: str = Header(default="")) -> dict[str, Any]:
    _require_internal(x_bastion_internal)
    return blue.public_config()


class ProbeRequest(BaseModel):
    probe: str
    path: str | None = None


@app.post("/v1/probe")
def probe(request: ProbeRequest, x_bastion_internal: str = Header(default="")) -> dict[str, Any]:
    _require_internal(x_bastion_internal)
    import socket

    import httpx

    if request.probe == "egress":
        targets = ["https://example.com", "http://169.254.169.254/latest/meta-data/"]
        outcomes = []
        for target in targets:
            try:
                response = httpx.get(target, timeout=2.0)
                outcomes.append({"target": target, "allowed": True, "status": response.status_code})
            except httpx.HTTPError as exc:
                outcomes.append({"target": target, "allowed": False, "error": type(exc).__name__})
        return {"probe": "egress", "allowed": any(o["allowed"] for o in outcomes), "outcomes": outcomes}
    if request.probe == "dns":
        try:
            socket.getaddrinfo("example.com", 443)
            return {"probe": "dns", "allowed": True}
        except OSError as exc:
            return {"probe": "dns", "allowed": False, "error": str(exc)}
    if request.probe == "read":
        path = request.path or "/tenants/blue/canary.txt"
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as handle:
                content = handle.read(64)
            return {"probe": "read", "allowed": True, "path": path, "bytes": len(content)}
        except OSError as exc:
            return {"probe": "read", "allowed": False, "path": path, "error": str(exc)}
    raise HTTPException(status_code=400, detail="unknown probe")
