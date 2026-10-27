from __future__ import annotations

import os
import socket
from typing import Any

import httpx
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from bastion_core.service_auth import require_internal

SERVICE = "red-probe"
BLUE_HOST = os.environ.get("BASTION_BLUE_HOST", "blue")
BLUE_PORT = int(os.environ.get("BASTION_BLUE_PORT", "8006"))
MODEL_HOST = os.environ.get("BASTION_MODEL_HOST", "model")
MODEL_PORT = int(os.environ.get("BASTION_MODEL_PORT", "8005"))
# Deliberately local/controlled negative controls. Do not point these at the
# public Internet or a real cloud metadata service.
PROBE_EGRESS_URL = os.environ.get("BASTION_PROBE_EGRESS_URL", "http://127.0.0.1:9/")
PROBE_METADATA_URL = os.environ.get("BASTION_PROBE_METADATA_URL", "http://127.0.0.1:9/latest/meta-data/")
PROBE_DNS_NAME = os.environ.get("BASTION_PROBE_DNS_NAME", "bastionloop-egress.invalid")

app = FastAPI(title="BastionLoop red probe")


class ProbeRequest(BaseModel):
    probe: str
    host: str | None = None
    port: int | None = None
    path: str | None = None


def _connect(host: str, port: int, timeout: float = 2.0) -> tuple[bool, str]:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True, "connected"
    except OSError as exc:
        return False, type(exc).__name__


@app.get("/v1/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": SERVICE, "untrusted": True}


@app.post("/v1/probe")
def probe(request: ProbeRequest, _: None = Depends(require_internal)) -> dict[str, Any]:
    if request.probe == "direct-blue":
        allowed, detail = _connect(request.host or BLUE_HOST, request.port or BLUE_PORT)
        return {"probe": request.probe, "allowed": allowed, "detail": detail}
    if request.probe == "direct-model":
        allowed, detail = _connect(request.host or MODEL_HOST, request.port or MODEL_PORT)
        return {"probe": request.probe, "allowed": allowed, "detail": detail}
    if request.probe == "docker-sock":
        allowed = os.path.exists("/var/run/docker.sock")
        detail = "socket-present" if allowed else "socket-absent"
        if allowed:
            ok, detail = _connect("/var/run/docker.sock", 0)
            allowed = ok
        return {"probe": request.probe, "allowed": allowed, "detail": detail}
    if request.probe == "metadata":
        try:
            response = httpx.get(PROBE_METADATA_URL, timeout=2.0)
            return {
                "probe": request.probe,
                "allowed": True,
                "target": PROBE_METADATA_URL,
                "status": response.status_code,
                "controlled": True,
            }
        except httpx.HTTPError as exc:
            return {
                "probe": request.probe,
                "allowed": False,
                "target": PROBE_METADATA_URL,
                "detail": type(exc).__name__,
                "controlled": True,
            }
    if request.probe == "external-dns":
        try:
            socket.getaddrinfo(PROBE_DNS_NAME, 443)
            return {"probe": request.probe, "allowed": True, "target": PROBE_DNS_NAME, "detail": "resolved"}
        except OSError as exc:
            return {
                "probe": request.probe,
                "allowed": False,
                "target": PROBE_DNS_NAME,
                "detail": type(exc).__name__,
            }
    if request.probe == "egress":
        try:
            response = httpx.get(PROBE_EGRESS_URL, timeout=2.0)
            return {
                "probe": request.probe,
                "allowed": True,
                "target": PROBE_EGRESS_URL,
                "status": response.status_code,
                "controlled": True,
            }
        except httpx.HTTPError as exc:
            return {
                "probe": request.probe,
                "allowed": False,
                "target": PROBE_EGRESS_URL,
                "detail": type(exc).__name__,
                "controlled": True,
            }
    if request.probe == "read":
        path = request.path or "/tenants/blue/canary.txt"
        try:
            with open(path, "r", encoding="utf-8", errors="replace") as handle:
                content = handle.read(64)
            return {"probe": request.probe, "allowed": True, "path": path, "bytes": len(content)}
        except OSError as exc:
            return {"probe": request.probe, "allowed": False, "path": path, "detail": type(exc).__name__}
    if request.probe == "proc":
        results = {}
        for path in ("/proc/1/root/etc/shadow", "/sys/kernel/security/securelevel"):
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as handle:
                    handle.read(16)
                results[path] = True
            except OSError:
                results[path] = False
        return {"probe": request.probe, "allowed": any(results.values()), "results": results}
    raise HTTPException(status_code=400, detail="unknown probe")
