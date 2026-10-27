import { api } from "../api";
import { usePolling } from "../hooks";
import { OverheadChart } from "../components/Charts";
import { ResourceGauge } from "../components/ResourceGauge";
import { Card, Empty, ErrorBanner, Loading, SectionTitle, StatusPill } from "../components/UI";

export function ResourceGovernance() {
  const health = usePolling(() => api.get<any>("/v1/health"), 8000);
  const runs = usePolling(() => api.get<any>("/v1/runs"), 4000);
  const overview = usePolling(() => api.get<any>("/v1/dashboard/overview"), 6000);
  const limits = health.data?.limits ?? {};
  const allRuns = runs.data?.runs ?? [];
  const active = allRuns.filter((run: any) => ["starting", "running"].includes(run.status));
  const failed = allRuns.filter((run: any) => run.status === "failed");
  const services = health.data?.services ?? {};
  const connected = Object.values(services).filter((service: any) => service?.status === "ok").length;
  const model = services.model;
  const system = health.data?.system ?? {};
  const timing = overview.data?.timing ?? {};
  const overhead = timing.overhead;
  const activeCases = active.reduce((total: number, run: any) => total + Number(run.case_count ?? 0), 0);

  return (
    <div className="page">
      <SectionTitle hint="Configured execution budgets, active work and observed gateway overhead. Host CPU, memory and disk metrics are not exported by this local control plane.">
        Resource Governance
      </SectionTitle>

      {(health.error || runs.error || overview.error) && (
        <ErrorBanner
          message={health.error || runs.error || overview.error || ""}
          onRetry={() => {
            void health.refresh();
            void runs.refresh();
            void overview.refresh();
          }}
        />
      )}

      <div className="bay-metric-grid four">
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Active evaluations</span></div>
          <strong>{active.length}</strong>
          <small>{activeCases} cases queued or running</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Failed runs</span></div>
          <strong className={failed.length ? "danger-text" : ""}>{failed.length}</strong>
          <small>{allRuns.length} total runs recorded</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Model sessions</span></div>
          <strong>{model?.active_sessions ?? "—"}</strong>
          <small>{model?.adapter ? `${model.adapter} / ${model.model_id}` : "Model adapter unknown"}</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Control plane</span></div>
          <strong className="metric-status">
            <StatusPill
              status={health.error ? "disconnected" : health.data ? (connected === Object.keys(services).length ? "pass" : "warn") : "checking"}
              label={health.error ? "UNAVAILABLE" : health.data ? `${connected}/${Object.keys(services).length} UP` : "CHECKING"}
            />
          </strong>
          <small>Live service probe, not a configured assumption</small>
        </div>
      </div>

      <Card title="Host resource snapshot" subtitle="Measured by the gateway process host; not a per-evaluation quota.">
        <div className="resource-gauges">
          <ResourceGauge label="CPU" value={system.cpu_percent} tone="var(--green)" />
          <ResourceGauge label="Memory" value={system.memory_percent} tone="var(--accent)" />
          <ResourceGauge label="Disk" value={system.disk_percent} tone="var(--amber)" />
        </div>
        <div className="resource-controls">
          <span>Logical CPUs <b className="mono">{system.cpu_count ?? "—"}</b></span>
          <span>Sample <b className="mono">live gateway host</b></span>
          <span>Scope <b className="mono">host, not evaluation</b></span>
        </div>
      </Card>

      <div className="two-col">
        <Card title="Execution budgets" subtitle="Enforced by request validation and runtime configuration">
          {health.loading && !health.data ? <Loading label="Loading limits" /> : (
            <div className="limit-list">
              <div><span>Run case ceiling</span><strong className="mono">{limits.max_run_cases ?? "—"} cases</strong></div>
              <div><span>Judge case ceiling</span><strong className="mono">{limits.judge_max_cases ?? "—"} cases</strong></div>
              <div><span>Capability TTL</span><strong className="mono">{limits.token_ttl_seconds?.min ?? "—"}–{limits.token_ttl_seconds?.max ?? "—"} s</strong></div>
              <div><span>Checkpoint interval</span><strong className="mono">every {limits.checkpoint_every ?? "—"} events</strong></div>
              <div><span>Verdict padding</span><strong className="mono">{limits.padding_ms ?? "—"} ms</strong></div>
              <div><span>Naive mode</span><strong>{limits.allow_naive ? "available in development" : "disabled"}</strong></div>
              <div><span>Tamper simulator</span><strong>{limits.allow_tamper ? "available in development" : "disabled"}</strong></div>
              <div><span>Judge challenge</span><strong>{limits.allow_judge ? "enabled" : "disabled"}</strong></div>
            </div>
          )}
          <p className="card-foot">These are configured limits from the running gateway, not measured utilization.</p>
        </Card>

        <Card title="Observed model overhead" subtitle="Request latency minus model inference time">
          {!overhead?.gateway_overhead?.n ? (
            <Empty>No overhead samples yet. Run an evaluation to collect timing data.</Empty>
          ) : (
            <OverheadChart overhead={overhead} />
          )}
        </Card>
      </div>

      <Card title="Availability" subtitle="Service probes come from the gateway; missing services stay unavailable">
        <div className="service-status-list">
          {Object.entries(services).map(([name, service]: [string, any]) => (
            <div key={name} className="service-status-row">
              <span className="mono strong">{name}</span>
              <span className="dim small">
                {name === "model"
                  ? `${service.adapter ?? "adapter?"} / ${service.model_id ?? "model?"}`
                  : name === "blue"
                    ? `${service.sealed ? "sealed" : "unsealed"} · egress ${service.egress ?? "unknown"}`
                    : service.service ?? "control-plane service"}
              </span>
              <StatusPill status={service?.status === "ok" ? "pass" : "disconnected"} label={service?.status === "ok" ? "UP" : "UNAVAILABLE"} />
            </div>
          ))}
          {Object.keys(services).length === 0 && <Empty>No service health payload returned.</Empty>}
        </div>
        <p className="card-foot">
          Host CPU, memory and disk counters are deliberately not inferred from process presence. Container-level
          resource limits remain UNTESTED unless exercised under Compose.
        </p>
      </Card>
    </div>
  );
}
