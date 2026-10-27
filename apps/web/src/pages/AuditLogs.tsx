import { useMemo, useState } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { Icon, type IconName } from "../components/Icon";
import { Card, Empty, ErrorBanner, Loading, SectionTitle, StatusPill } from "../components/UI";

type EventRecord = {
  seq: number;
  ts: string;
  event_type: string;
  tenant_id?: string | null;
  run_id?: string | null;
  event_id?: string;
  event_hash?: string;
  metadata?: Record<string, any>;
};

const FILTERS = ["all", "iam", "run", "finding", "ledger", "attack", "verdict", "canary", "dlp"];

function eventIcon(type: string): IconName {
  if (type.includes("iam") || type.includes("token")) return "key";
  if (type.includes("ledger")) return "database";
  if (type.includes("finding")) return "findings";
  if (type.includes("run")) return "activity";
  if (type.includes("canary") || type.includes("dlp") || type.includes("denied")) return "alert";
  if (type.includes("verdict")) return "shield";
  return "file";
}

function isAlert(event: EventRecord): boolean {
  if (event.event_type.includes("denied")) return true;
  if (event.event_type.includes("block")) return true;
  if (event.event_type.includes("failed")) return true;
  if (event.event_type.includes("mismatch")) return true;
  return false;
}

export function AuditLogs() {
  const events = usePolling(() => api.get<any>("/v1/events?limit=500"), 4000);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const items: EventRecord[] = useMemo(
    () => [...(events.data?.events ?? [])].reverse(),
    [events.data],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((event) => {
      if (filter !== "all" && !event.event_type.includes(filter)) return false;
      if (!needle) return true;
      return `${event.event_type} ${event.tenant_id ?? ""} ${event.run_id ?? ""} ${JSON.stringify(event.metadata ?? {})}`
        .toLowerCase()
        .includes(needle);
    });
  }, [filter, items, query]);
  const alerts = items.filter(isAlert).length;

  return (
    <div className="page">
      <SectionTitle hint="A tamper-evident timeline of authentication, policy, run, finding and evidence events.">
        Audit Logs
      </SectionTitle>

      {events.error && <ErrorBanner message={events.error} onRetry={() => void events.refresh()} />}

      <div className="log-toolbar">
        <div className="segmented" role="group" aria-label="Filter audit events">
          {FILTERS.map((name) => (
            <button
              key={name}
              className={filter === name ? "active" : ""}
              aria-pressed={filter === name}
              onClick={() => setFilter(name)}
            >
              {name === "all" ? "ALL" : name.toUpperCase()}
            </button>
          ))}
        </div>
        <input
          className="input compact"
          aria-label="Search audit events"
          placeholder="Search actor, run or metadata…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="bay-metric-grid four">
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Ledger entries</span></div>
          <strong>{items.length}</strong>
          <small>Latest 500 events requested</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Visible after filters</span></div>
          <strong>{filtered.length}</strong>
          <small>{filter === "all" ? "No event-type filter" : `Event type contains “${filter}”`}</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Denials / blocks</span></div>
          <strong className={alerts > 0 ? "danger-text" : ""}>{alerts}</strong>
          <small>Security-relevant events in the window</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Timeline source</span></div>
          <strong className="metric-status">
            <StatusPill status={events.error ? "disconnected" : events.data ? "neutral" : "checking"} label={events.error ? "UNAVAILABLE" : events.data ? "LEDGER READ" : "CHECKING"} />
          </strong>
          <small>Chain validity is proven on Evidence Verification</small>
        </div>
      </div>

      <Card title="Immutable event ledger" subtitle={`${filtered.length} visible events · newest first`}>
        {events.loading && !events.data && <Loading label="Loading audit events" />}
        {!events.loading && filtered.length === 0 && <Empty>No events match the current filters.</Empty>}
        {filtered.length > 0 && (
          <div className="table-wrap audit-table-wrap">
            <table className="table audit-table full-audit-table">
              <thead>
                <tr><th>Seq</th><th>Time</th><th>Event</th><th>Actor</th><th>Run</th><th>Hash</th><th>State</th></tr>
              </thead>
              <tbody>
                {filtered.slice(0, 300).map((event) => (
                  <tr key={event.event_id ?? event.seq}>
                    <td className="mono">{event.seq}</td>
                    <td className="mono small">{new Date(event.ts).toLocaleString()}</td>
                    <td className="mono event-type"><span className="event-cell"><Icon name={eventIcon(event.event_type)} size={11} />{event.event_type}</span></td>
                    <td className="mono">{event.tenant_id ?? "system"}</td>
                    <td className="mono tiny">{event.run_id ?? "—"}</td>
                    <td className="mono tiny">{String(event.event_hash ?? "").slice(0, 14)}…</td>
                    <td>
                      <StatusPill
                        status={isAlert(event) ? "fail" : "signed"}
                        label={isAlert(event) ? "DENIED" : "RECORDED"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="About this ledger" subtitle="What the timeline does and does not establish">
        <ul className="clean-list">
          <li>Each row is an event in the append-only hash chain, not a reconstructed activity feed.</li>
          <li>Signature, checkpoint, witness and anchor validity are established on the <span className="mono">Evidence Verification</span> page.</li>
          <li>A recorded event means the arena observed it; it does not by itself prove a control held.</li>
        </ul>
      </Card>
    </div>
  );
}
