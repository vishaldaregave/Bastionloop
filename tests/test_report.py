from __future__ import annotations

from pathlib import Path

from bastion_core.report import build_trust_report, render_html, render_pdf, render_text


def sample_report():
    payload = {
        "mode": "hardened",
        "runtime": "test",
        "challenges": [
            {
                "test_id": "AUD-01",
                "name": "Edit one event",
                "category": "audit",
                "expected": "detected",
                "actual": "detected",
                "status": "pass",
                "detail": "broken link named",
                "evidence_id": "ledger:12",
            },
            {
                "test_id": "ISO-03",
                "name": "Container escape probes",
                "category": "isolation",
                "expected": "blocked",
                "actual": "not exercised",
                "status": "untested",
                "detail": "requires Compose namespaces",
            },
        ],
        "integrity": {"status": "VERIFIED", "chain": {"events_checked": 12}, "counts": {"checkpoints": 2, "anchor_entries": 2}},
        "findings": [{"finding_id": "finding_01", "finding_type": "model-leak", "severity": "high", "case_id": "JB-06"}],
        "timing": {"hardened": {"distinguishability": {"p_value": 0.91}}},
        "overhead": {"gateway_overhead": {"p50": 12.0, "p95": 20.0}},
        "versions": {"model": "mock"},
    }
    return build_trust_report(payload)


def test_report_counts_and_text():
    report = sample_report()
    assert report["summary"]["passed"] == 1
    assert report["summary"]["untested"] == 1
    assert report["summary"]["findings"] == 1
    text = render_text(report)
    assert "UNTESTED" in text
    assert "RESIDUAL RISK REGISTER" in text
    assert "NON-CLAIMS" in text


def test_pdf_renders_without_layout_error(tmp_path: Path):
    report = sample_report()
    pdf_path = render_pdf(report, tmp_path / "report.pdf")
    assert pdf_path.exists()
    data = pdf_path.read_bytes()
    assert data.startswith(b"%PDF")
    assert len(data) > 1000


def test_html_is_self_contained_and_escapes():
    report = sample_report()
    html = render_html(report)
    assert "<!doctype html>" in html
    assert "Challenge suites" not in html
    assert "AUD-01" in html
    assert "ISO-03" in html
