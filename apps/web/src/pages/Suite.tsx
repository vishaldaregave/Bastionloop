import { useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { Card, Empty, ErrorBanner, Field, SectionTitle, Spinner, StatusPill } from "../components/UI";

export function Suite() {
  const results = usePolling(() => api.get<any>("/v1/suite/results"), 5000);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items: any[] = results.data?.results ?? [];
  const summary = results.data?.summary ?? { pass: 0, fail: 0, untested: 0, recorded: 0, total: 0 };

  async function runSuite() {
    setBusy(true);
    setError(null);
    try {
      await api.post("/v1/security-tests", { tests: null, mode: null });
      await results.refresh();
      setReport(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadReport() {
    setReportBusy(true);
    setError(null);
    try {
      const document = await api.get<any>("/v1/reports/trust.json");
      setReport(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionTitle hint="The suite writes every result to the ledger with an evidence ID. A pass means the tested control held on the tested path. Untested is a first-class outcome.">
        Challenge suite & Trust Report
      </SectionTitle>

      {(results.error || error) && <ErrorBanner message={results.error || error || ""} onRetry={results.refresh} />}

      <div className="stat-grid five">
        <Card className="stat"><span className="stat-label">PASS</span><strong>{summary.pass}</strong></Card>
        <Card className="stat"><span className="stat-label">FAIL</span><strong>{summary.fail}</strong></Card>
        <Card className="stat"><span className="stat-label">UNTESTED</span><strong>{summary.untested}</strong></Card>
        <Card className="stat"><span className="stat-label">RECORDED</span><strong>{summary.recorded}</strong></Card>
        <Card className="stat"><span className="stat-label">TOTAL</span><strong>{summary.total}</strong></Card>
      </div>

      <Card
        title="Suite run"
        subtitle={results.data?.generated_at ? `Last run ${new Date(results.data.generated_at).toLocaleString()} · ${results.data.runtime}` : "No suite run yet"}
        actions={
          <div className="row-actions">
            <button className="btn btn-primary btn-xs" onClick={runSuite} disabled={busy}>
              {busy ? <Spinner label="Running" /> : "Run full suite"}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={loadReport} disabled={reportBusy}>
              {reportBusy ? <Spinner label="Building" /> : "Load Trust Report"}
            </button>
          </div>
        }
      >
        {items.length === 0 && <Empty>No results yet. Run the suite to populate the grid.</Empty>}
        <div className="test-grid">
          {items.map((result: any) => (
            <div key={result.test_id} className={`test-cell test-${result.status}`}>
              <div className="test-top">
                <span className="mono strong">{result.test_id}</span>
                <StatusPill status={result.status} />
              </div>
              <div className="test-name">{result.name}</div>
              <div className="test-detail">
                <span>expected: {result.expected}</span>
                <span>actual: {result.actual}</span>
                <span className="mono">{result.evidence_id ?? "no evidence id"}</span>
              </div>
              {result.detail && <div className="test-note">{result.detail}</div>}
            </div>
          ))}
        </div>
      </Card>

      <div className="two-col">
        <Card title="Download the report" subtitle="Same evidence, three formats">
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={() => api.download("/v1/reports/trust.json", "bastionloop-trust-report.json")}>
              JSON
            </button>
            <button className="btn btn-ghost" onClick={() => api.download("/v1/reports/trust.pdf", "bastionloop-trust-report.pdf")}>
              PDF
            </button>
            <button className="btn btn-ghost" onClick={() => api.download("/v1/reports/trust.html", "bastionloop-trust-report.html")}>
              HTML
            </button>
          </div>
          <p className="card-foot">
            The Trust Report is generated from the latest executed results and verifier response. It includes passed,
            failed, untested and recorded items, the evidence integrity status, coverage gaps, residual risks and
            explicit non-claims.
          </p>
        </Card>
        <Card title="What we did not test" subtitle="The honest part of the report">
          <div className="issue-list">
            {items.filter((item) => item.status === "untested").map((item) => (
              <div key={item.test_id} className="issue issue-warn">
                <span className="mono">{item.test_id}</span>
                <span>{item.detail || "untested"}</span>
              </div>
            ))}
            {items.filter((item) => item.status === "untested").length === 0 && (
              <Empty>Run the suite to see explicit coverage gaps.</Empty>
            )}
          </div>
        </Card>
      </div>

      {report && (
        <>
          <Card title="Evidence integrity" subtitle="Recomputed from the live ledger">
            <div className="detail-grid">
              <Field label="Status" value={<StatusPill status={report.evidence_integrity?.status === "VERIFIED" ? "verified" : "failed"} label={report.evidence_integrity?.status} />} />
              <Field label="Events checked" value={report.evidence_integrity?.chain?.events_checked ?? 0} mono />
              <Field label="Checkpoints" value={report.evidence_integrity?.counts?.checkpoints ?? 0} mono />
              <Field label="Anchor entries" value={report.evidence_integrity?.counts?.anchor_entries ?? 0} mono />
              <Field label="Model safety failures" value={report.summary?.model_safety_failures ?? 0} mono />
              <Field label="Infrastructure failures" value={report.summary?.infrastructure_failures ?? 0} mono />
            </div>
          </Card>

          <div className="two-col">
            <Card title="Residual risk register" subtitle="What still remains after the tested controls">
              <div className="risk-list">
                {(report.residual_risk_register ?? []).map((risk: any) => (
                  <div key={risk.threat} className="risk-row">
                    <strong>{risk.threat}</strong>
                    <span className="muted">control: {risk.control}</span>
                    <span className="danger-text">residual: {risk.residual}</span>
                    <span className="muted">future: {risk.future}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Non-claims" subtitle="Stated on stage, not buried in a PDF" tone="warn">
              <ul className="clean-list">
                {(report.non_claims ?? []).map((claim: string) => (
                  <li key={claim}>{claim}</li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
