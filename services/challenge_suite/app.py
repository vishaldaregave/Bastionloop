from __future__ import annotations

import os
import threading
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel

from bastion_core.config import ensure_dirs, settings
from bastion_core.report import render_html
from bastion_core.service_auth import constant_time_equals, require_internal

from . import suite

SERVICE = "challenge-suite"
app = FastAPI(title="BastionLoop challenge suite")
_s = ensure_dirs(settings())
_lock = threading.Lock()


class RunRequest(BaseModel):
    tests: list[str] | None = None
    mode: str | None = None


def _authorized(x_bastion_internal: str, authorization: str) -> bool:
    if constant_time_equals(x_bastion_internal, _s.internal_token):
        return True
    return constant_time_equals(authorization.removeprefix("Bearer ").strip(), _s.admin_token)


@app.get("/v1/health")
def health() -> dict[str, Any]:
    latest = suite.latest_results()
    return {
        "status": "ok",
        "service": SERVICE,
        "runtime": _s.runtime,
        "tests": [t[0] for t in suite.TESTS],
        "model_adapter": latest.get("model_adapter") if latest else os.environ.get("BASTION_MODEL_ADAPTER", "mock"),
        "last_run": latest.get("generated_at") if latest else None,
        "last_summary": latest.get("summary") if latest else None,
    }


@app.post("/v1/security-tests")
def security_tests(request: RunRequest, x_bastion_internal: str = Header(default=""), authorization: str = Header(default="")) -> dict[str, Any]:
    if not _authorized(x_bastion_internal, authorization):
        raise HTTPException(status_code=403, detail="suite accepts internal or admin calls only")
    with _lock:
        return suite.run_tests(request.tests, request.mode)


@app.get("/v1/results")
def results(_: None = Depends(require_internal)) -> dict[str, Any]:
    document = suite.latest_results()
    if document is None:
        return {
            "suite_version": "2.0",
            "results": [],
            "summary": {"pass": 0, "fail": 0, "error": 0, "untested": 0, "recorded": 0, "total": 0},
        }
    return document


@app.get("/v1/report.json")
def report_json(_: None = Depends(require_internal)) -> JSONResponse:
    with _lock:
        document, _, _ = suite.report_artifacts()
    return JSONResponse(document)


@app.get("/v1/report.html")
def report_html(_: None = Depends(require_internal)) -> HTMLResponse:
    with _lock:
        document, html_path, _ = suite.report_artifacts()
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.get("/v1/report.pdf")
def report_pdf(_: None = Depends(require_internal)) -> FileResponse:
    with _lock:
        _, _, pdf_path = suite.report_artifacts()
    return FileResponse(pdf_path, media_type="application/pdf", filename="bastionloop-trust-report.pdf")
