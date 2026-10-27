from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any

from .canonical import utcnow

RESIDUAL_RISKS = [
    {
        "threat": "Cross-tenant file access",
        "control": "Private volumes, non-root, read-only rootfs",
        "residual": "Kernel or runtime escape (shared kernel)",
        "future": "gVisor, Kata or Firecracker microVMs",
    },
    {
        "threat": "Unauthorized API access",
        "control": "Signed capability tokens, deny-by-default policy",
        "residual": "Bugs in policy or gateway code",
        "future": "Formal verification of policy rules",
    },
    {
        "threat": "Network pivoting",
        "control": "Internal networks, gateway-only bridge, default-deny egress",
        "residual": "Host networking mistakes",
        "future": "Per-tenant VMs, network audit in CI",
    },
    {
        "threat": "Cross-session context leakage",
        "control": "One model instance per session, freshness probe",
        "residual": "Untested runtime paths, shared weights or caches",
        "future": "Per-tenant inference runtimes, confidential computing",
    },
    {
        "threat": "Audit tampering",
        "control": "Hash chain, split signer, witness, external anchor",
        "residual": "Compromised signer and witness together",
        "future": "Public transparency log, hardware attestation",
    },
    {
        "threat": "Timing side channels",
        "control": "Fixed-latency verdict padding, measured leakage",
        "residual": "Raw LLM latency variance, hardware cache channels",
        "future": "Batching, dedicated cores, microarchitectural isolation",
    },
    {
        "threat": "Resource interference",
        "control": "cgroup caps, load test vs baseline",
        "residual": "Shared disk, network and timing effects",
        "future": "Dedicated hosts or queues per tenant",
    },
    {
        "threat": "Prompt injection and jailbreaks",
        "control": "Output validation, DLP, permissions in code",
        "residual": "Novel attacks, model-dependent failures",
        "future": "Continuous benchmark refresh",
    },
    {
        "threat": "Gateway as single trust point",
        "control": "Small code surface, pinned image digest logged in each PCF",
        "residual": "Gateway compromise breaks mediation",
        "future": "Split gateway, attested builds",
    },
]

NON_CLAIMS = [
    "Protection from container escape through a host kernel exploit is not claimed.",
    "Hardware side channels (cache, Spectre class) are not claimed.",
    "A compromised host administrator acting before events are signed is not claimed.",
    "GPU memory leakage is not applicable to this CPU-only build and is not claimed.",
    "A pass means the tested control held on the tested path, not that the arena is secure.",
]

INFRA_CATEGORIES = {"isolation", "network", "access", "audit", "resource", "monitor", "policy", "replay"}
MODEL_CATEGORIES = {"llm"}


def _status(challenge: dict[str, Any]) -> str:
    return str(challenge.get("status", "")).upper()


def build_trust_report(payload: dict[str, Any]) -> dict[str, Any]:
    challenges = payload.get("challenges", [])
    passed = [c for c in challenges if _status(c) == "PASS"]
    failed = [c for c in challenges if _status(c) == "FAIL"]
    errors = [c for c in challenges if _status(c) == "ERROR"]
    untested = [c for c in challenges if _status(c) == "UNTESTED"]
    recorded = [c for c in challenges if _status(c) == "RECORDED"]
    infra_failures = [c for c in failed if c.get("category") in INFRA_CATEGORIES]
    model_failures = [c for c in failed if c.get("category") in MODEL_CATEGORIES]
    infra_errors = [c for c in errors if c.get("category") in INFRA_CATEGORIES]
    model_errors = [c for c in errors if c.get("category") in MODEL_CATEGORIES]
    findings = payload.get("findings", [])
    report = {
        "report_version": "1.0",
        "generated_at": utcnow(),
        "title": "BastionLoop Trust Report",
        "statement": (
            "Every verdict in this report was computed from a test or verifier run. "
            "Passed means the tested control held on the tested path."
        ),
        "mode": payload.get("mode"),
        "runtime": payload.get("runtime"),
        "model_adapter": payload.get("model_adapter"),
        "model_testing_kind": payload.get("model_testing_kind"),
        "versions": payload.get("versions", {}),
        "summary": {
            "passed": len(passed),
            "failed": len(failed),
            "errors": len(errors),
            "untested": len(untested),
            "recorded": len(recorded),
            "total": len(challenges),
            "infrastructure_failures": len(infra_failures),
            "infrastructure_errors": len(infra_errors),
            "model_safety_failures": len(model_failures),
            "model_safety_errors": len(model_errors),
            "findings": len(findings),
        },
        "evidence_integrity": payload.get("integrity", {}),
        "challenges": challenges,
        "failure_split": {
            "infrastructure": [c["test_id"] for c in infra_failures],
            "model_safety": [c["test_id"] for c in model_failures],
            "infrastructure_errors": [c["test_id"] for c in infra_errors],
            "model_safety_errors": [c["test_id"] for c in model_errors],
        },
        "findings": findings,
        "timing": payload.get("timing", {}),
        "overhead": payload.get("overhead", {}),
        "coverage": {
            "tested": [c["test_id"] for c in passed + failed],
            "errors": [{"test_id": c["test_id"], "reason": c.get("detail")} for c in errors],
            "recorded": [c["test_id"] for c in recorded],
            "untested": [{"test_id": c["test_id"], "reason": c.get("detail")} for c in untested],
        },
        "residual_risk_register": RESIDUAL_RISKS,
        "non_claims": NON_CLAIMS,
        "standards_notes": {
            "eu_ai_act_article_55": "Evidence artefacts map to adversarial testing and incident logging expectations; this is a mapping note, not a conformity claim.",
            "nist_ai_rmf": "Measure and Manage functions supported by measured isolation tests, audit integrity checks and a residual-risk register.",
        },
    }
    return report


def _status_line(challenge: dict[str, Any]) -> str:
    return f"[{challenge.get('status', 'unknown').upper():8}] {challenge.get('test_id')}  {challenge.get('name')}"


def render_text(report: dict[str, Any]) -> str:
    lines = [
        report["title"],
        "=" * len(report["title"]),
        f"Generated: {report['generated_at']}",
        f"Mode: {report.get('mode')}  Runtime: {report.get('runtime')}  "
        f"Model: {report.get('model_adapter')} ({report.get('model_testing_kind')})",
        "",
        "SUMMARY",
        f"  passed={report['summary']['passed']} failed={report['summary']['failed']} "
        f"errors={report['summary'].get('errors', 0)} untested={report['summary']['untested']} "
        f"recorded={report['summary']['recorded']} findings={report['summary']['findings']}",
        f"  infrastructure failures={report['summary']['infrastructure_failures']} "
        f"infrastructure errors={report['summary'].get('infrastructure_errors', 0)} "
        f"model safety failures={report['summary']['model_safety_failures']} "
        f"model safety errors={report['summary'].get('model_safety_errors', 0)}",
        "",
        "EVIDENCE INTEGRITY",
        f"  status={report['evidence_integrity'].get('status', 'UNKNOWN')}",
    ]
    for issue in report["evidence_integrity"].get("issues", []):
        lines.append(f"  - {issue.get('severity')}: {issue.get('code')} {issue.get('detail')}")
    lines.append("")
    lines.append("CHALLENGES")
    for challenge in report["challenges"]:
        lines.append("  " + _status_line(challenge))
        lines.append(
            f"           evidence={challenge.get('evidence_id')} "
            f"seq={challenge.get('evidence_seq')} limitations={challenge.get('limitations', '')}"
        )
        lines.append(f"           detail={challenge.get('detail', '')}")
    lines.append("")
    lines.append("FINDINGS")
    for finding in report["findings"]:
        lines.append(
            f"  {finding.get('finding_id')} {finding.get('finding_type')} "
            f"severity={finding.get('severity')} case={finding.get('case_id')}"
        )
    lines.append("")
    lines.append("TIMING")
    lines.append(json.dumps(report.get("timing", {}), indent=2))
    lines.append("")
    lines.append("OVERHEAD")
    lines.append(json.dumps(report.get("overhead", {}), indent=2))
    lines.append("")
    lines.append("COVERAGE / ERRORS / NOT TESTED")
    for item in report["coverage"].get("errors", []):
        lines.append(f"  - ERROR {item['test_id']}: {item['reason']}")
    for item in report["coverage"]["untested"]:
        lines.append(f"  - UNTESTED {item['test_id']}: {item['reason']}")
    lines.append("")
    lines.append("RESIDUAL RISK REGISTER")
    for risk in report["residual_risk_register"]:
        lines.append(f"  - {risk['threat']}: control={risk['control']}; residual={risk['residual']}")
    lines.append("")
    lines.append("NON-CLAIMS")
    for claim in report["non_claims"]:
        lines.append(f"  - {claim}")
    return "\n".join(lines)


def render_html(report: dict[str, Any]) -> str:
    def esc(value: Any) -> str:
        return html.escape(str(value))

    rows = []
    for c in report["challenges"]:
        status = _status(c)
        rows.append(
            "<tr>"
            f"<td class='status {esc(status.lower())}'>{esc(status)}</td>"
            f"<td>{esc(c.get('test_id'))}</td>"
            f"<td>{esc(c.get('name'))}</td>"
            f"<td>{esc(c.get('expected'))}</td>"
            f"<td>{esc(c.get('actual'))}</td>"
            f"<td class='mono'>{esc(c.get('evidence_id'))}</td>"
            f"<td>{esc(c.get('limitations'))}</td>"
            "</tr>"
        )
    finding_rows = "".join(
        "<tr>"
        f"<td class='mono'>{esc(f.get('finding_id'))}</td>"
        f"<td>{esc(f.get('finding_type'))}</td>"
        f"<td>{esc(f.get('severity'))}</td>"
        f"<td>{esc(f.get('case_id'))}</td>"
        "</tr>"
        for f in report["findings"]
    )
    risk_rows = "".join(
        f"<tr><td>{esc(r['threat'])}</td><td>{esc(r['control'])}</td><td>{esc(r['residual'])}</td><td>{esc(r['future'])}</td></tr>"
        for r in report["residual_risk_register"]
    )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>{esc(report['title'])}</title>
<style>
:root{{color-scheme:dark}}
body{{background:#0d1117;color:#d6deeb;font:14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;margin:0;padding:40px}}
h1{{font-size:28px;margin:0 0 4px}} h2{{font-size:16px;letter-spacing:.08em;text-transform:uppercase;color:#7f8ea3;margin:28px 0 10px}}
.sub{{color:#8b98a9;margin-bottom:24px}}
.summary{{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}}
.card{{border:1px solid #1e2a3a;border-radius:8px;padding:12px;background:#111826}}
.card b{{display:block;font-size:24px;color:#e6edf3}} .card span{{color:#7f8ea3;font-size:12px}}
table{{border-collapse:collapse;width:100%;margin-top:8px}}
th,td{{text-align:left;padding:7px 9px;border-bottom:1px solid #1b2534;vertical-align:top}}
th{{color:#7f8ea3;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.05em}}
.status{{font-weight:700}} .pass{{color:#46d19b}} .fail{{color:#ff6b6b}} .error{{color:#ff9f43}} .untested{{color:#e3b341}}
.mono{{font-size:12px;color:#9fb0c7}} .issues li{{color:#e3b341}}
.note{{border-left:2px solid #2c3a4d;padding-left:14px;color:#9fb0c7}}
</style></head><body>
<h1>{esc(report['title'])}</h1>
<div class="sub">{esc(report['statement'])}<br>Generated {esc(report['generated_at'])} · mode {esc(report.get('mode'))} · runtime {esc(report.get('runtime'))} · model {esc(report.get('model_adapter'))} ({esc(report.get('model_testing_kind'))})</div>
<div class="summary">
<div class="card"><b>{report['summary']['passed']}</b><span>passed</span></div>
<div class="card"><b>{report['summary']['failed']}</b><span>failed</span></div>
<div class="card"><b>{report['summary'].get('errors', 0)}</b><span>errors</span></div>
<div class="card"><b>{report['summary']['untested']}</b><span>untested</span></div>
<div class="card"><b>{report['summary']['findings']}</b><span>findings</span></div>
<div class="card"><b>{report['summary']['infrastructure_failures']}</b><span>infra failures</span></div>
<div class="card"><b>{report['summary']['model_safety_failures']}</b><span>model failures</span></div>
</div>
<h2>Evidence integrity</h2>
<p class="note">status: <b>{esc(report['evidence_integrity'].get('status', 'UNKNOWN'))}</b> · events checked: {esc(report['evidence_integrity'].get('chain', {}).get('events_checked', 0))} · checkpoints: {esc(report['evidence_integrity'].get('counts', {}).get('checkpoints', 0))}</p>
<h2>Challenges</h2>
<table><thead><tr><th>Status</th><th>ID</th><th>Test</th><th>Expected</th><th>Actual</th><th>Evidence</th><th>Limitations</th></tr></thead><tbody>{''.join(rows)}</tbody></table>
<h2>Findings</h2>
<table><thead><tr><th>Finding</th><th>Type</th><th>Severity</th><th>Case</th></tr></thead><tbody>{finding_rows or '<tr><td colspan="4">none</td></tr>'}</tbody></table>
<h2>Coverage errors and not tested</h2>
<ul class="issues">{((''.join(f'<li>ERROR {esc(i["test_id"])}: {esc(i["reason"])}</li>' for i in report['coverage'].get('errors', []))) + (''.join(f'<li>UNTESTED {esc(i["test_id"])}: {esc(i["reason"])}</li>' for i in report['coverage']['untested']))) or '<li>none</li>'}</ul>
<h2>Residual risk register</h2>
<table><thead><tr><th>Threat</th><th>Control</th><th>Residual</th><th>Future</th></tr></thead><tbody>{risk_rows}</tbody></table>
<h2>Non-claims</h2>
<ul class="issues">{''.join(f'<li>{esc(n)}</li>' for n in report['non_claims'])}</ul>
<h2>Standards notes</h2>
<p class="note">{esc(report['standards_notes']['eu_ai_act_article_55'])}<br>{esc(report['standards_notes']['nist_ai_rmf'])}</p>
</body></html>"""


def _ascii(text: str) -> str:
    return text.encode("ascii", "replace").decode("ascii")


def render_pdf(report: dict[str, Any], path: Path) -> Path:
    from fpdf import FPDF

    def write(pdf: FPDF, text: str, *, size: int = 9, style: str = "", height: float = 5.0) -> None:
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", style, size)
        pdf.multi_cell(0, height, _ascii(text), new_x="LMARGIN", new_y="NEXT")

    def heading(pdf: FPDF, text: str) -> None:
        pdf.ln(2)
        write(pdf, text, size=11, style="B", height=6)

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    write(pdf, report["title"], size=18, style="B", height=10)
    write(pdf, report["statement"], size=9, height=5)
    write(
        pdf,
        f"Generated: {report['generated_at']}  Mode: {report.get('mode')}  Runtime: {report.get('runtime')}  "
        f"Model: {report.get('model_adapter')} ({report.get('model_testing_kind')})",
        size=9,
        height=5,
    )

    summary = report["summary"]
    heading(pdf, "Summary")
    write(
        pdf,
        f"Passed: {summary['passed']}   Failed: {summary['failed']}   "
        f"Errors: {summary.get('errors', 0)}   Untested: {summary['untested']}   "
        f"Recorded: {summary.get('recorded', 0)}",
    )
    write(
        pdf,
        f"Findings: {summary['findings']}   Infrastructure failures: {summary['infrastructure_failures']}   "
        f"Infrastructure errors: {summary.get('infrastructure_errors', 0)}   "
        f"Model safety failures: {summary['model_safety_failures']}   "
        f"Model safety errors: {summary.get('model_safety_errors', 0)}",
    )
    write(pdf, f"Evidence integrity: {report['evidence_integrity'].get('status', 'UNKNOWN')}")

    heading(pdf, "Challenges")
    for challenge in report["challenges"]:
        write(
            pdf,
            f"[{challenge.get('status', '?').upper()}] {challenge.get('test_id')} {challenge.get('name')} | "
            f"expected: {challenge.get('expected')} | actual: {challenge.get('actual')} | "
            f"evidence: {challenge.get('evidence_id')} | limitations: {challenge.get('limitations')}",
            size=8,
            height=4.5,
        )

    heading(pdf, "Coverage errors and not tested")
    for item in report["coverage"].get("errors", []):
        write(pdf, f"- ERROR {item['test_id']}: {item['reason']}", size=8, height=4.5)
    for item in report["coverage"]["untested"]:
        write(pdf, f"- UNTESTED {item['test_id']}: {item['reason']}", size=8, height=4.5)

    heading(pdf, "Residual risk register")
    for risk in report["residual_risk_register"]:
        write(
            pdf,
            f"- {risk['threat']}: control={risk['control']}; residual={risk['residual']}",
            size=8,
            height=4.5,
        )

    heading(pdf, "Non-claims")
    for claim in report["non_claims"]:
        write(pdf, f"- {claim}", size=8, height=4.5)

    path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(path))
    return path
