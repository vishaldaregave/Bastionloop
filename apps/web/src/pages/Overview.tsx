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
  EvidenceValue,
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
  const evidenceStatus = !data
    ? overview.error || health.error
      ? "disconnected"
      : "untested"
    : verified
      ? "verified"
      : "unverified";
  const mode = data?.mode ?? health.data?.mode;
  const timing = data?.timing ?? {};
  const hardenedP = timing?.hardened?.distinguishability?.p_value;
  const runs = data?.runs?.recent ?? [];
  const recentFindings = findings.data?.findings?.slice(0, 6) ?? [];
  const services = health.data?.services ?? {};
  const serviceCount = Object.keys(services).length;
  const unavailable = Object.entries(services).filter(([, item]: [string, any]) => item?.status !== "ok");

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

      <div className="summary-strip">
        <div className="summary-item">
          <span className="summary-label">Ledger</span>
          <div className="summary-value">
            <StatusPill
              status={verified ? "verified" : overview.error || health.error ? "disconnected" : data ? "failed" : "untested"}
              label={verified ? "Verified" : overview.error || health.error ? "Disconnected" : data ? "Failed" : "No evidence"}
            />
          </div>
          <span className="summary-detail mono">
            {integrity?.counts?.events ?? 0} events · {integrity?.counts?.checkpoints ?? 0} checkpoints · {integrity?.counts?.anchor_entries ?? 0} anchors
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Services</span>
          <div className="summary-value">
            <StatusPill
              status={health.error ? "disconnected" : health.data ? (unavailable.length ? "warn" : "pass") : "untested"}
              label={health.error ? "Disconnected" : health.data ? (unavailable.length ? `${serviceCount - unavailable.length}/${serviceCount} connected` : "All connected") : "Unknown"}
            />
          </div>
          <span className="summary-detail">{health.data ? "Live gateway probe" : "Waiting for health probe"}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Workspace</span>
          <div className="summary-value mono">
            <EvidenceValue value={data?.runs?.total ?? 0} evidenceId="gateway:overview" status={evidenceStatus} />
          </div>
          <span className="summary-detail">
            {data?.runs ? `${data.runs.active ?? 0} active · ${data.runs.failed ?? 0} failed` : "Run state unknown"}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Model</span>
          <div className="summary-value">
            <StatusPill
              status={health.data?.services?.model?.adapter === "mock" ? "untested" : health.data?.services?.model?.adapter ? "pass" : "warn"}
              label={health.data?.services?.model?.adapter ? `${health.data.services.model.adapter} adapter` : "adapter unknown"}
            />
          </div>
          <span className="summary-detail">
            {mode ? mode.toUpperCase() : "mode unknown"} · {health.data?.services?.model?.model_id ?? "model id unknown"}
          </span>
        </div>
      </div>

      <div className="overview-columns">
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
              <table className="table">
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

        <div className="overview-side">
          <ServiceHealth health={health.data} error={health.error} loading={health.loading} onRetry={() => void health.refresh()} />
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
                      <small className="mono">{finding.finding_id} · {finding.case_id ?? "case?"}</small>
                    </span>
                    <span className="activity-meta">
                      <span className={`sev sev-${finding.severity}`}>{finding.severity}</span>
                      <StatusPill status={finding.status === "signed" ? "pass" : "untested"} label={finding.status === "signed" ? "signed" : "unknown"} />
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
        </div>
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
