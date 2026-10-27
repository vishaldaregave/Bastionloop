import { useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { Icon } from "../components/Icon";
import { OverheadChart, TimingChart } from "../components/Charts";
import { ServiceHealth } from "../components/ServiceHealth";
import {
  Card,
  Empty,
  ErrorBanner,
  Loading,
  ModeSwitch,
  SectionTitle,
  Spinner,
  StatusPill,
} from "../components/UI";

export function Overview({ navigate }: { navigate: (route: string) => void }) {
  const overview = usePolling(() => api.get<any>("/v1/dashboard/overview"), 3000);
  const findings = usePolling(() => api.get<any>("/v1/findings"), 5000);
  const health = usePolling(() => api.get<any>("/v1/health"), 10000);
  const latestFindingId = findings.data?.findings?.[0]?.finding_id;
  const latestFinding = usePolling(
    () =>
      latestFindingId
        ? api.get<any>(`/v1/findings/${encodeURIComponent(latestFindingId)}?verify=true`)
        : Promise.resolve(null),
    12000,
    [latestFindingId],
  );
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const data = overview.data;
  const integrity = data?.integrity;
  const verified = integrity?.status === "VERIFIED";
  const mode = data?.mode ?? health.data?.mode;
  const timing = data?.timing ?? {};
  const hardenedP = timing?.hardened?.distinguishability?.p_value;
  const runs = data?.runs?.recent ?? [];
  const recentFindings = findings.data?.findings?.slice(0, 4) ?? [];
  const allFindings = findings.data?.findings ?? [];
  const attentionFindings = allFindings.filter((finding: any) => ["critical", "high"].includes(finding.severity)).length;
  const modelAdapter = health.data?.services?.model?.adapter;
  const modelId = health.data?.services?.model?.model_id;
  const healthLoading = health.loading && !health.data;
  const overviewLoading = overview.loading && !data;
  const findingsLoading = findings.loading && !findings.data;
  const ledgerStatus = verified
    ? "verified"
    : overview.error || health.error
      ? "disconnected"
      : overviewLoading
        ? "checking"
        : data
          ? "failed"
          : "untested";
  const ledgerLabel = verified
    ? "Verified"
    : overview.error || health.error
      ? "Disconnected"
      : overviewLoading
        ? "Checking"
        : data
          ? "Failed"
          : "No evidence";

  async function changeMode(next: "hardened" | "naive") {
    if (!mode) return;
    setBusy(true);
    setNote(null);
    try {
      await api.post("/v1/demo/mode", { mode: next });
      await Promise.all([overview.refresh(), health.refresh()]);
      setNote(`Mode set to ${next}. Existing runs retain their original mode.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function quickRun() {
    if (!mode) {
      setNote("Mode is unknown because the health probe failed.");
      return;
    }
    setBusy(true);
    setNote("Running six attacks and finalizing evidence…");
    try {
      const run = await api.post<any>("/v1/runs", {
        benchmark_id: "jailbreakbench-subset.v1",
        mode,
        max_cases: 6,
        tenant_id: "red",
      });
      await api.post(`/v1/runs/${run.run_id}/start?sync=true`);
      await Promise.all([overview.refresh(), findings.refresh(), health.refresh()]);
      setNote(`Run ${run.run_id} complete.`);
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page overview-page">
      <div className="page-heading">
        <SectionTitle hint="Operational state, recent test activity and the evidence path. Every value is read from the gateway.">
          Overview
        </SectionTitle>
        <div className="page-actions">
          <ModeSwitch mode={mode ?? "hardened"} onChange={changeMode} busy={busy || !mode} />
          <button className="btn btn-primary" onClick={quickRun} disabled={busy || !mode}>
            {busy ? <Spinner label="Running" /> : <><Icon name="play" size={14} /> Run evaluation</>}
          </button>
        </div>
      </div>

      {overview.error && (
        <ErrorBanner
          title="Dashboard unavailable"
          message={overview.error}
          onRetry={() => {
            void overview.refresh();
            void health.refresh();
          }}
        />
      )}
      {note && <div className="inline-note">{note}</div>}

      <div className="page-context" aria-label="Runtime context">
        <span className="context-group">
          <span className="context-label">Environment</span>
          <span className="context-value mono">{healthLoading ? "checking" : health.data?.environment ?? "unknown"}</span>
        </span>
        <span className="context-group">
          <span className="context-label">Mode</span>
          {healthLoading ? (
            <StatusPill status="checking" label="checking" />
          ) : mode ? (
            <StatusPill status={mode} label={mode} />
          ) : (
            <StatusPill status="untested" label="unknown" />
          )}
        </span>
        <span className="context-group">
          <span className="context-label">Model adapter</span>
          <StatusPill
            status={healthLoading ? "checking" : modelAdapter === "mock" ? "untested" : modelAdapter ? "neutral" : "warn"}
            label={healthLoading ? "checking" : modelAdapter ?? "unknown"}
          />
          <span className="context-value mono">{healthLoading ? "checking model id" : modelId ?? "model id unknown"}</span>
        </span>
        <span className="context-group">
          <span className="context-label">Policy</span>
          <span className="context-value mono">{healthLoading ? "checking" : health.data?.policy?.version ?? "unknown"}</span>
        </span>
      </div>

      <div className="summary-strip">
        <div className="summary-item">
          <span className="summary-label">Ledger</span>
          <div className="summary-value">
            <StatusPill status={ledgerStatus} label={ledgerLabel} />
          </div>
          <span className="summary-detail mono">
            {data
              ? `${integrity?.counts?.events ?? 0} events · ${integrity?.counts?.checkpoints ?? 0} checkpoints · ${integrity?.counts?.anchor_entries ?? 0} anchors`
              : overview.error || health.error
                ? "Evidence state unavailable"
                : "Reading evidence state"}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Test runs</span>
          <div className="summary-value">
            {data?.runs ? (
              <span className="summary-number">{data.runs.total ?? 0}</span>
            ) : overviewLoading ? (
              <span className="summary-unavailable">CHECKING</span>
            ) : (
              <span className="summary-unavailable">UNKNOWN</span>
            )}
          </div>
          <span className="summary-detail">
            {data?.runs
              ? `${data.runs.active ?? 0} active · ${data.runs.failed ?? 0} failed · gateway`
              : overviewLoading
                ? "Loading run state"
                : "Run state unknown"}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Findings</span>
          <div className="summary-value">
            {findings.error ? (
              <span className="summary-unavailable">DISCONNECTED</span>
            ) : findings.data ? (
              <span className="summary-number">{allFindings.length}</span>
            ) : data ? (
              <span className="summary-number">{data.findings ?? 0}</span>
            ) : findingsLoading ? (
              <span className="summary-unavailable">CHECKING</span>
            ) : (
              <span className="summary-unavailable">UNKNOWN</span>
            )}
          </div>
          <span className="summary-detail">
            {findings.error
              ? "Findings endpoint unreachable"
              : findings.data
                ? `${attentionFindings} high/critical · ${latestFinding.data?.verification?.status ? `latest PCF ${latestFinding.data.verification.status}` : "verification on selection"}`
                : "Loading findings"}
          </span>
        </div>
      </div>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Recent test runs</h2>
            <p>Execution state from the gateway, not a fixture.</p>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={() => navigate("red")}>Open Test Runs <Icon name="arrow-right" size={13} /></button>
        </header>
        {overview.loading && !data ? (
          <Loading label="Loading runs" />
        ) : runs.length === 0 ? (
          <Empty>No runs yet. Run an evaluation to create evidence.</Empty>
        ) : (
          <div className="table-wrap flush">
            <table className="table runs-table">
              <thead>
                <tr><th>Run</th><th>Status</th><th>Mode</th><th>Model</th><th>Cases</th><th>Findings</th></tr>
              </thead>
              <tbody>
                {runs.map((run: any) => (
                  <tr key={run.run_id} onClick={() => navigate("red")} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") navigate("red"); }}>
                    <td className="mono">{run.run_id}</td>
                    <td><StatusPill status={run.status} /></td>
                    <td><StatusPill status={run.mode} /></td>
                    <td className="mono">{run.adapter ?? "unknown"}</td>
                    <td className="mono">{run.case_count ?? "—"}</td>
                    <td className="mono">{run.findings?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="overview-columns">
        <section className="panel">
          <header className="panel-head">
            <div><h2>Recent findings</h2><p>Signed PCFs and selected verification state.</p></div>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate("findings")}>View all <Icon name="arrow-right" size={13} /></button>
          </header>
          {findings.loading && !findings.data ? <Loading label="Loading findings" /> : recentFindings.length === 0 ? (
            <Empty>No findings yet.</Empty>
          ) : (
            <div className="activity-list">
              {recentFindings.map((finding: any) => (
                <button key={finding.finding_id} className="activity-row" onClick={() => navigate("findings")}>
                  <span className={`severity-dot severity-${finding.severity ?? "medium"}`} aria-hidden="true" />
                  <span className="activity-copy">
                    <strong>{finding.finding_type}</strong>
                    <small className="mono">{finding.finding_id} · {finding.case_id ?? "case?"} · {finding.chain_seq ? `seq ${finding.chain_seq}` : "no seq"}</small>
                  </span>
                  <span className="activity-meta">
                    <span className={`sev sev-${finding.severity}`}>{finding.severity}</span>
                    <StatusPill status={finding.status === "signed" ? "signed" : "untested"} label={finding.status === "signed" ? "signed" : "unknown"} />
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="panel-foot">
            <span className="mono">{latestFinding.data?.verification?.status ? `latest PCF ${latestFinding.data.verification.status}` : latestFinding.error ? "latest PCF disconnected" : "latest PCF not verified"}</span>
            <span className="mono">{latestFinding.data?.verification?.anchor_source ? `anchor ${latestFinding.data.verification.anchor_source}` : ""}</span>
          </div>
        </section>

        <ServiceHealth health={health.data} error={health.error} loading={health.loading} onRetry={() => void health.refresh()} />
      </div>

      <div className="overview-columns lower">
        <Card title="Verdict timing" subtitle="Allow versus block latency, computed from arena samples.">
          {hardenedP === undefined ? <Empty>Not enough samples. Run both modes to collect timing data.</Empty> : <TimingChart timing={timing} />}
        </Card>
        <Card title="Gateway overhead" subtitle="Total request time minus model inference time.">
          {!timing?.overhead?.gateway_overhead?.n ? <Empty>No overhead samples yet.</Empty> : <OverheadChart overhead={timing.overhead} />}
        </Card>
      </div>
    </div>
  );
}
