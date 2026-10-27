import { api } from "../api";
import { usePolling } from "../hooks";
import { Icon, type IconName } from "../components/Icon";
import { ResourceGauge } from "../components/ResourceGauge";
import { Empty, ErrorBanner, Loading, SectionTitle, Spinner, StatusPill } from "../components/UI";

type Zone = { id: string; label?: string; egress?: string; trust?: string };
type Path = { from: string; to: string; label?: string };

const SERVICE_ICON: Record<string, "database" | "key" | "shield" | "box" | "cpu" | "activity"> = {
  notary: "database",
  signer: "key",
  witness: "shield",
  anchor: "box",
  model: "cpu",
  blue: "activity",
};

function eventIcon(type: string): IconName {
  if (type.includes("iam") || type.includes("token")) return "key";
  if (type.includes("ledger")) return "database";
  if (type.includes("finding")) return "findings";
  if (type.includes("run")) return "activity";
  if (type.includes("canary") || type.includes("dlp") || type.includes("denied")) return "alert";
  if (type.includes("verdict")) return "shield";
  return "file";
}

function serviceDetail(name: string, service: any): string {
  if (name === "notary") return `${service.events ?? "?"} events · ${service.checkpoints ?? "?"} checkpoints`;
  if (name === "signer") return `key ${service.key_id ?? "unknown"}`;
  if (name === "witness") return `last cp ${service.last_witnessed_counter ?? "—"}`;
  if (name === "anchor") return `${service.entries ?? "—"} anchor entries`;
  if (name === "model") return `${service.adapter ?? "adapter?"} / ${service.model_id ?? "model?"}`;
  if (name === "blue") return `${service.sealed ? "sealed" : "unsealed"} · egress ${service.egress ?? "unknown"}`;
  return service.service ?? "control-plane service";
}

export function Overview({ navigate }: { navigate: (route: string) => void }) {
  const overview = usePolling(() => api.get<any>("/v1/dashboard/overview"), 4000);
  const health = usePolling(() => api.get<any>("/v1/health"), 8000);
  const runs = usePolling(() => api.get<any>("/v1/runs"), 5000);
  const events = usePolling(() => api.get<any>("/v1/events?limit=500"), 5000);
  const isolation = usePolling(() => api.get<any>("/v1/dashboard/isolation"), 5000);
  const data = overview.data;
  const integrity = data?.integrity;
  const verified = integrity?.status === "VERIFIED";
  const allRuns = runs.data?.runs ?? data?.runs?.recent ?? [];
  const activeRuns = allRuns.filter((run: any) => ["starting", "running"].includes(run.status));
  const completeRuns = allRuns.filter((run: any) => run.status === "complete");
  const failedRuns = allRuns.filter((run: any) => run.status === "failed");
  const cases = allRuns.reduce((total: number, run: any) => total + Number(run.case_count ?? run.max_cases ?? 0), 0);
  const findings = data?.findings ?? 0;
  const services = health.data?.services ?? {};
  const serviceEntries = Object.entries(services);
  const connected = serviceEntries.filter(([, service]: [string, any]) => service?.status === "ok").length;
  const healthPct = serviceEntries.length > 0 ? Math.round((connected / serviceEntries.length) * 100) : null;
  const latestRun = allRuns[0] ?? null;
  const recentEvents = [...(events.data?.events ?? [])].slice(-5).reverse();
  const zones: Zone[] = isolation.data?.zones ?? [];
  const allowedPaths: Path[] = isolation.data?.allowed_paths ?? [];
  const blockedPaths: Path[] = isolation.data?.blocked_paths ?? [];
  const zoneMap = Object.fromEntries(zones.map((zone) => [zone.id, zone]));
  const system = health.data?.system ?? {};
  const ledgerStatus = verified
    ? "verified"
    : overview.error
      ? "disconnected"
      : overview.loading && !data
        ? "checking"
        : data
          ? "failed"
          : "untested";
  const ledgerLabel = verified
    ? "VALID"
    : overview.error
      ? "UNAVAILABLE"
      : overview.loading && !data
        ? "CHECKING"
        : "INVALID";

  return (
    <div className="page dashboard-page">
      <div className="page-heading">
        <SectionTitle hint="Global evaluation posture, root-of-trust verification status, sandbox health and configured execution limits.">
          Platform Control Plane
        </SectionTitle>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => { void overview.refresh(); void health.refresh(); void runs.refresh(); void events.refresh(); void isolation.refresh(); }} disabled={overview.loading || health.loading}>
            {overview.loading || health.loading ? <Spinner label="Refreshing" /> : <><Icon name="refresh" size={14} /> Refresh Control Plane</>}
          </button>
          <button className="btn btn-primary" onClick={() => navigate("red")}>
            <Icon name="plus" size={14} /> New evaluation
          </button>
        </div>
      </div>

      {(overview.error || health.error || runs.error || events.error || isolation.error) && (
        <ErrorBanner
          title="Control plane partially unavailable"
          message={overview.error || health.error || runs.error || events.error || isolation.error || ""}
          onRetry={() => {
            void overview.refresh();
            void health.refresh();
            void runs.refresh();
            void events.refresh();
            void isolation.refresh();
          }}
        />
      )}

      <div className="dashboard-context">
        <span><Icon name="activity" size={13} /> {health.data?.environment ?? "environment unknown"}</span>
        <span><Icon name="shield" size={13} /> mode <StatusPill status={health.data?.mode ?? "untested"} label={health.data?.mode ?? "unknown"} /></span>
        <span>model <StatusPill status={health.data?.services?.model?.adapter === "mock" ? "untested" : health.data?.services?.model?.adapter ? "neutral" : "warn"} label={health.data?.services?.model?.adapter ?? "unknown"} /></span>
        <span className="mono">policy {health.data?.policy?.version ?? "unknown"}</span>
      </div>

      <div className="bay-metric-grid four hero-metrics">
        <button className="bay-metric metric-link" onClick={() => navigate("red")}>
          <div className="bay-metric-head"><span className="metric-icon blue"><Icon name="box" size={16} /></span><span>Active Evaluations</span></div>
          <div className="metric-body">
            <div>
              <strong>{activeRuns.length}</strong>
              <small>{completeRuns.length} completed · {failedRuns.length} failed</small>
            </div>
            <span className="metric-corner"><Icon name="activity" size={20} /></span>
          </div>
        </button>
        <button className="bay-metric metric-link" onClick={() => navigate("red")}>
          <div className="bay-metric-head"><span className="metric-icon cyan"><Icon name="activity" size={16} /></span><span>Test Cases Executed</span></div>
          <div className="metric-body">
            <div>
              <strong>{cases}</strong>
              <small>{allRuns.length} runs · {findings} findings</small>
            </div>
            <span className="metric-corner"><Icon name="findings" size={20} /></span>
          </div>
        </button>
        <button className="bay-metric metric-link" onClick={() => navigate("governor")}>
          <div className="bay-metric-head"><span className="metric-icon green"><Icon name="activity" size={16} /></span><span>Platform Health</span></div>
          <div className="metric-body">
            <div>
              <strong className={healthPct === 100 ? "healthy-text" : ""}>{healthPct === null ? "—" : `${healthPct}%`}</strong>
              <small>{health.error ? "Health probe unavailable" : serviceEntries.length ? `${connected}/${serviceEntries.length} services connected` : "Waiting for health probe"}</small>
            </div>
            <span className="metric-ring" style={{ background: `conic-gradient(var(--green) ${healthPct ?? 0}%, #191C24 0)` }} />
          </div>
        </button>
        <button className="bay-metric metric-link" onClick={() => navigate("audit")}>
          <div className="bay-metric-head"><span className="metric-icon green"><Icon name="verification" size={16} /></span><span>Evidence Chain</span></div>
          <div className="metric-body">
            <div>
              <strong className={verified ? "healthy-text" : "danger-text"}>{ledgerLabel}</strong>
              <small className="mono">{integrity?.counts?.events ?? 0} events · {integrity?.counts?.checkpoints ?? 0} checkpoints</small>
            </div>
            <span className="metric-side"><span>Checkpoint</span><strong>{verified ? "INTACT" : "UNVERIFIED"}</strong></span>
          </div>
        </button>
      </div>

      <div className="dash-grid">
        <section className="bay-card span-5">
          <div className="bay-card-head">
            <div><h2>Infrastructure Status</h2><p>Live gateway probe of the control plane.</p></div>
            <span className="mono tiny">{health.data ? `${connected} / ${serviceEntries.length} ONLINE` : "PROBING"}</span>
          </div>
          {health.loading && !health.data ? <Loading label="Probing services" /> : serviceEntries.length === 0 ? (
            <Empty>Gateway disconnected. Service state is unknown.</Empty>
          ) : (
            <div className="infra-list">
              {serviceEntries.map(([name, service]: [string, any]) => (
                <button key={name} className="infra-row" onClick={() => navigate(name === "blue" ? "blue" : name === "model" ? "red" : "audit")}>
                  <span className="infra-icon"><Icon name={SERVICE_ICON[name] ?? "server"} size={14} /></span>
                  <span className="infra-name">
                    <strong>{name}</strong>
                    <small>{serviceDetail(name, service)}</small>
                  </span>
                  <span className="infra-metrics">
                    <span className="mono">{service.latency_ms != null ? `${Math.round(service.latency_ms)}ms` : "—"}</span>
                    <span className={`infra-health ${service?.status === "ok" ? "ok" : "bad"}`}>
                      <span className="dot" />
                      {service?.status === "ok" ? "Healthy" : "Unavailable"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="bay-card-foot">A configured service is not treated as healthy until the probe answers.</p>
        </section>

        <section className="bay-card span-7">
          <div className="bay-card-head">
            <div><h2>Network Topology</h2><p>Declared capability paths and blocked direct routes.</p></div>
            <span className="isolation-indicator"><span className="dot dot-green" /> POLICY DECLARED</span>
          </div>
          {isolation.loading && !isolation.data ? <Loading label="Loading boundary model" /> : (
            <>
              <div className="topology">
                <div className="topology-node red">
                  <span className="tiny mono">UNTRUSTED</span>
                  <strong>{zoneMap.red?.label ?? "Red zone"}</strong>
                  <small>{zoneMap.red?.egress ?? "egress unknown"}</small>
                </div>
                <span className="topology-arrow">→</span>
                <div className="topology-node gateway">
                  <span className="tiny mono">MEDIATOR</span>
                  <strong>Gateway</strong>
                  <small>signed capability tokens</small>
                </div>
                <span className="topology-arrow">→</span>
                <div className="topology-node model">
                  <span className="tiny mono">SESSION ISOLATED</span>
                  <strong>{zoneMap.model?.label ?? "Model zone"}</strong>
                  <small>{zoneMap.model?.egress ?? "egress unknown"}</small>
                </div>
              </div>
              {zoneMap.blue && (
                <div className="topology-branch">
                  <span className="topology-arrow">↳</span>
                  <div className="topology-node blue">
                    <span className="tiny mono">SEALED</span>
                    <strong>{zoneMap.blue.label ?? "Blue cell"}</strong>
                    <small>{zoneMap.blue.egress ?? "egress unknown"}</small>
                  </div>
                  <span className="tiny dim">Gateway → Blue only; direct Blue egress is denied.</span>
                </div>
              )}
              <div className="topology-blocked">
                <Icon name="alert" size={12} />
                <span>No direct Red → Blue or Red → Model access</span>
              </div>
              <div className="path-summary">
                <div>
                  <span className="tiny mono dim">ALLOWED</span>
                  {allowedPaths.map((path) => (
                    <span key={`${path.from}-${path.to}`} className="path-chip allowed mono">{path.from} → {path.to}</span>
                  ))}
                </div>
                <div>
                  <span className="tiny mono dim">BLOCKED</span>
                  {blockedPaths.slice(0, 4).map((path) => (
                    <span key={`${path.from}-${path.to}`} className="path-chip blocked mono">{path.from} ✕ {path.to}</span>
                  ))}
                </div>
              </div>
            </>
          )}
          <p className="bay-card-foot">These are gateway-declared policy paths, not a live packet capture. Container probes remain UNTESTED without Compose.</p>
        </section>
      </div>

      <div className="dash-grid">
        <section className="bay-card span-7">
          <div className="bay-card-head">
            <div><h2>Recent Audit Events</h2><p>Latest ledger entries, newest first.</p></div>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate("logs")}>View all <Icon name="arrow-right" size={12} /></button>
          </div>
          {events.loading && !events.data ? <Loading label="Loading audit events" /> : recentEvents.length === 0 ? <Empty>No audit events returned.</Empty> : (
            <div className="table-wrap flush">
              <table className="table audit-table overview-audit-table">
                <thead><tr><th>Time</th><th>Event</th><th>Actor</th><th>Run</th><th>Status</th></tr></thead>
                <tbody>
                  {recentEvents.map((event: any) => (
                    <tr key={event.event_id ?? event.seq} onClick={() => navigate("logs")}>
                      <td className="mono tiny">{new Date(event.ts).toLocaleTimeString()}</td>
                      <td className="mono event-type"><span className="event-cell"><Icon name={eventIcon(event.event_type)} size={11} />{event.event_type}</span></td>
                      <td className="mono">{event.tenant_id ?? "system"}</td>
                      <td className="mono tiny">{event.run_id ?? "—"}</td>
                      <td><StatusPill status={event.event_type.includes("denied") || event.event_type.includes("block") ? "fail" : "signed"} label={event.event_type.includes("denied") || event.event_type.includes("block") ? "DENIED" : "RECORDED"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bay-card span-5">
          <div className="bay-card-head">
            <div><h2>Resource Usage</h2><p>Host-level snapshot from the gateway.</p></div>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate("governor")}>Open governance</button>
          </div>
          <div className="resource-gauges">
            <ResourceGauge label="CPU" value={system.cpu_percent} tone="var(--green)" />
            <ResourceGauge label="Memory" value={system.memory_percent} tone="var(--accent)" />
            <ResourceGauge label="Disk" value={system.disk_percent} tone="var(--amber)" />
          </div>
          <div className="resource-controls">
            <span><Icon name="box" size={12} /> Run ceiling <b className="mono">{health.data?.limits?.max_run_cases ?? "—"}</b></span>
            <span><Icon name="database" size={12} /> Checkpoint <b className="mono">every {health.data?.limits?.checkpoint_every ?? "—"}</b></span>
            <span><Icon name="shield" size={12} /> Padding <b className="mono">{health.data?.limits?.padding_ms ?? "—"} ms</b></span>
          </div>
          <p className="bay-card-foot">Host CPU, memory and disk are measured by the gateway process host. They are not per-evaluation quotas.</p>
        </section>
      </div>

      {latestRun && (
        <section className="bay-card latest-run-card">
          <div className="bay-card-head">
            <div><h2>Latest Evaluation</h2><p>{latestRun.benchmark_id} @ {latestRun.benchmark_version} · {latestRun.model_id}</p></div>
            <StatusPill status={latestRun.status} />
          </div>
          <div className="latest-run-grid">
            <div><span>Run</span><strong className="mono">{latestRun.run_id}</strong></div>
            <div><span>Mode</span><StatusPill status={latestRun.mode} /></div>
            <div><span>Cases</span><strong className="mono">{latestRun.case_count ?? "—"}</strong></div>
            <div><span>Findings</span><strong className="mono">{latestRun.findings?.length ?? 0}</strong></div>
            <div><span>Freshness</span><strong>{latestRun.freshness?.clean === true ? "clean" : latestRun.freshness?.clean === false ? "leak" : "unknown"}</strong></div>
            <div><span>Canary scan</span><strong>{latestRun.canary_scan?.clean === true ? "clean" : latestRun.canary_scan?.clean === false ? "leaks" : "unknown"}</strong></div>
          </div>
        </section>
      )}
    </div>
  );
}
