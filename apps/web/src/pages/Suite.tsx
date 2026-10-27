import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { Icon } from "../components/Icon";
import { Card, Empty, ErrorBanner, Field, Loading, SectionTitle, Spinner, StatusPill } from "../components/UI";

export function Suite() {
  const results = usePolling(() => api.get<any>("/v1/suite/results"), 5000);
  const integrity = usePolling(() => api.get<any>("/v1/ledger/verify"), 10000);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const items: any[] = useMemo(
    () =>
      (results.data?.results ?? []).map((item: any) => ({
        ...item,
        status: String(item.status ?? "UNTESTED").toLowerCase(),
      })),
    [results.data],
  );
  const summary = results.data?.summary ?? { pass: 0, fail: 0, error: 0, untested: 0, recorded: 0, total: 0 };
  const modelAdapter = results.data?.model_adapter;
  const modelKind = results.data?.model_testing_kind;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      normalizedQuery
        ? items.filter((item) =>
            `${item.test_id} ${item.name} ${item.category} ${item.status}`.toLowerCase().includes(normalizedQuery),
          )
        : items,
    [items, normalizedQuery],
  );
  const selectedItem = items.find((item) => item.test_id === selectedId) ?? null;

  useEffect(() => {
    if (filteredItems.length === 0) return;
    if (selectedId && filteredItems.some((item) => item.test_id === selectedId)) return;
    const priority = filteredItems.find((item) => item.status !== "pass") ?? filteredItems[0];
    setSelectedId(priority.test_id);
  }, [filteredItems, selectedId]);

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

  async function download(path: string, filename: string) {
    setError(null);
    try {
      await api.download(path, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      <SectionTitle hint="A verifiable attestation of isolation, contamination resistance and cryptographic provenance. PASS, FAIL, ERROR and UNTESTED are distinct outcomes.">
        Trust Passport
      </SectionTitle>

      {(results.error || error) && <ErrorBanner message={results.error || error || ""} onRetry={results.refresh} />}

      <section className="passport-banner">
        <div className="passport-mark"><Icon name="award" size={28} /></div>
        <div className="passport-copy">
          <span className="passport-eyebrow">BASTIONLOOP ASSURANCE PASSPORT</span>
          <h2>Test Integrity Attestation</h2>
          <p>
            An evidence-linked report of control coverage, cryptographic provenance and explicit residual risk.
            It is not a trust score and does not claim host or key integrity.
          </p>
          <div className="passport-facts">
            <span><b>Evidence</b><StatusPill status={integrity.data?.status === "VERIFIED" ? "verified" : integrity.error ? "disconnected" : integrity.data ? "failed" : "checking"} label={integrity.data?.status ?? (integrity.error ? "UNAVAILABLE" : "CHECKING")} /></span>
            <span><b>Coverage</b><strong className="mono">{summary.total ? `${summary.pass}/${summary.total}` : "no run"}</strong></span>
            <span><b>Model</b><strong className="mono">{modelAdapter ?? "unknown"}</strong></span>
            <span><b>Mode</b><strong className="mono">{results.data?.mode ?? "hardened"}</strong></span>
          </div>
        </div>
        <div className="passport-seal">
          <span>ATTESTATION</span>
          <strong>{integrity.data?.status === "VERIFIED" ? "EVIDENCE VERIFIED" : "NOT ATTESTED"}</strong>
          <small>{results.data?.generated_at ? new Date(results.data.generated_at).toLocaleString() : "No suite run"}</small>
        </div>
      </section>

      <div className="status-legend" aria-label="Suite status legend">
        <span className="muted small">Status semantics:</span>
        <StatusPill status="pass" label="PASS · control held" />
        <StatusPill status="fail" label="FAIL · observed violation" />
        <StatusPill status="error" label="ERROR · not completed" />
        <StatusPill status="untested" label="UNTESTED · prerequisite absent" />
      </div>

      <div className="stat-grid five">
        <Card className="stat"><span className="stat-label">PASS</span><strong>{summary.pass}</strong></Card>
        <Card className="stat"><span className="stat-label">FAIL</span><strong>{summary.fail}</strong></Card>
        <Card className="stat"><span className="stat-label">ERROR</span><strong>{summary.error ?? 0}</strong></Card>
        <Card className="stat"><span className="stat-label">UNTESTED</span><strong>{summary.untested}</strong></Card>
        <Card className="stat"><span className="stat-label">TOTAL</span><strong>{summary.total}</strong></Card>
      </div>

      <Card
        title="Test results"
        subtitle={
          results.data?.generated_at
            ? `Last run ${new Date(results.data.generated_at).toLocaleString()} · ${results.data.runtime} · ${modelKind ?? "model unknown"}`
            : "No suite run yet"
        }
        actions={
          <div className="row-actions">
            <input
              className="input compact"
              aria-label="Filter test results"
              placeholder="Filter tests…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {modelAdapter && (
              <StatusPill
                status={modelAdapter === "mock" ? "untested" : "neutral"}
                label={modelAdapter === "mock" ? "MOCK MODEL" : "REAL MODEL"}
              />
            )}
            <button className="btn btn-primary btn-xs" onClick={runSuite} disabled={busy}>
              {busy ? <Spinner label="Running" /> : "Run full suite"}
            </button>
            <button className="btn btn-ghost btn-xs" onClick={loadReport} disabled={reportBusy}>
              {reportBusy ? <Spinner label="Building" /> : "Load Trust Report"}
            </button>
          </div>
        }
      >
        {results.loading && !results.data && <Loading label="Loading suite results" />}
        {!results.loading && items.length === 0 && <Empty>No results yet. Run the suite to populate the report.</Empty>}
        {items.length > 0 && filteredItems.length === 0 && <Empty>No tests match “{query}”.</Empty>}
        {filteredItems.length > 0 && (
          <div className="table-wrap">
            <table className="table suite-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Status</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((result: any) => (
                  <tr
                    key={result.test_id}
                    className={selectedId === result.test_id ? "selected" : ""}
                    tabIndex={0}
                    onClick={() => setSelectedId(result.test_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(result.test_id);
                      }
                    }}
                  >
                    <td>
                      <div className="suite-test-cell">
                        <span className="mono strong">{result.test_id}</span>
                        <span className="suite-test-name">{result.name}</span>
                      </div>
                    </td>
                    <td><StatusPill status={result.status} /></td>
                    <td className="suite-summary-text" title={result.expected}>{result.expected}</td>
                    <td className="suite-summary-text" title={result.actual}>{result.actual}</td>
                    <td className="mono tiny">{result.evidence_id ?? "no evidence id"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedItem && (
        <Card
          title={`${selectedItem.test_id} · ${selectedItem.name}`}
          subtitle={`${selectedItem.category} · ${selectedItem.test_kind}${selectedItem.model_adapter ? ` · ${selectedItem.model_adapter}` : ""}`}
          actions={<StatusPill status={selectedItem.status} />}
        >
          <div className="detail-grid">
            <Field label="Expected" value={selectedItem.expected} />
            <Field label="Actual" value={selectedItem.actual} />
            <Field label="Evidence reference" value={selectedItem.evidence_id ?? "not recorded"} mono />
            <Field label="Evidence sequence" value={selectedItem.evidence_seq ?? "—"} mono />
            <Field
              label="Evidence hash"
              value={
                selectedItem.evidence_hash ? (
                  <span className="mono ellipsis" title={selectedItem.evidence_hash}>
                    {selectedItem.evidence_hash}
                  </span>
                ) : (
                  "not recorded"
                )
              }
            />
            <Field label="Duration" value={selectedItem.duration_ms != null ? `${Math.round(selectedItem.duration_ms)} ms` : "—"} mono />
            <Field label="Test kind" value={selectedItem.test_kind ?? "unknown"} />
            <Field label="Model adapter" value={selectedItem.model_adapter ?? "not model-bound"} mono />
            <Field label="Recorded" value={selectedItem.ts ? new Date(selectedItem.ts).toLocaleString() : "—"} />
          </div>
          {selectedItem.detail && <div className="inline-note">{selectedItem.detail}</div>}
          {selectedItem.limitations && (
            <div className="mini-note">
              <strong>Limitation.</strong> {selectedItem.limitations}
            </div>
          )}
        </Card>
      )}

      <div className="two-col">
        <Card title="Download the report" subtitle="Same evidence, three formats">
          <div className="row-actions">
            <button className="btn btn-ghost" onClick={() => void download("/v1/reports/trust.json", "bastionloop-trust-report.json")}>
              JSON
            </button>
            <button className="btn btn-ghost" onClick={() => void download("/v1/reports/trust.pdf", "bastionloop-trust-report.pdf")}>
              PDF
            </button>
            <button className="btn btn-ghost" onClick={() => void download("/v1/reports/trust.html", "bastionloop-trust-report.html")}>
              HTML
            </button>
          </div>
          <p className="card-foot">
            The Trust Report is generated from the latest executed results and verifier response. It includes passed,
            failed, errored, untested and recorded items, the evidence integrity status, coverage gaps, residual risks and
            explicit non-claims. ERROR means the test could not complete; it is never counted as a pass.
          </p>
        </Card>
        <Card title="What we did not test" subtitle="The honest part of the report">
          <div className="issue-list">
            {items
              .filter((item) => item.status === "error" || item.status === "untested")
              .map((item) => (
                <div key={item.test_id} className={`issue ${item.status === "error" ? "issue-fail" : "issue-warn"}`}>
                  <span className="mono">{item.test_id} · {item.status.toUpperCase()}</span>
                  <span>{item.detail || item.limitations || item.status}</span>
                </div>
              ))}
            {items.filter((item) => item.status === "error" || item.status === "untested").length === 0 && (
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
              <Field label="Errors" value={report.summary?.errors ?? 0} mono />
              <Field label="Model" value={`${report.model_adapter ?? "unknown"} / ${report.model_testing_kind ?? "unknown"}`} mono />
              <Field label="Tested" value={report.coverage?.tested?.length ?? 0} mono />
              <Field label="Untested" value={report.coverage?.untested?.length ?? 0} mono />
            </div>
            {(report.coverage?.errors?.length ?? 0) > 0 && (
              <div className="issue-list">
                {report.coverage.errors.map((item: any) => (
                  <div key={item.test_id} className="issue issue-fail">
                    <span className="mono">{item.test_id} · ERROR</span>
                    <span>{item.reason ?? "test did not complete"}</span>
                  </div>
                ))}
              </div>
            )}
            {(report.coverage?.untested?.length ?? 0) > 0 && (
              <div className="issue-list">
                {report.coverage.untested.map((item: any) => (
                  <div key={item.test_id} className="issue issue-warn">
                    <span className="mono">{item.test_id} · UNTESTED</span>
                    <span>{item.reason ?? "prerequisite unavailable"}</span>
                  </div>
                ))}
              </div>
            )}
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
