import { useMemo } from "react";
import { api } from "../api";
import { usePolling } from "../hooks";
import { Icon } from "../components/Icon";
import { Card, Empty, ErrorBanner, Loading, SectionTitle, StatusPill } from "../components/UI";

type EventRecord = {
  seq: number;
  ts: string;
  event_type: string;
  tenant_id?: string | null;
  run_id?: string | null;
  event_id?: string;
  metadata?: Record<string, any>;
};

function ageLabel(ts: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function UsersTeams() {
  const events = usePolling(() => api.get<any>("/v1/events?limit=1000"), 5000);
  const runs = usePolling(() => api.get<any>("/v1/runs"), 5000);

  const items: EventRecord[] = events.data?.events ?? [];
  const allRuns = runs.data?.runs ?? [];
  const grants = useMemo(
    () =>
      items
        .filter((event) => event.event_type === "iam.token.issued")
        .map((event) => {
          const meta = event.metadata ?? {};
          const ttl = Number(meta.ttl_seconds ?? 0);
          const issued = new Date(event.ts).getTime();
          const active = Boolean(ttl) && Date.now() - issued < ttl * 1000;
          return {
            seq: event.seq,
            ts: event.ts,
            tenant: meta.tenant ?? event.tenant_id ?? "unknown",
            actions: Array.isArray(meta.actions) ? meta.actions : [],
            runId: meta.run_id ?? event.run_id ?? null,
            ttl,
            active,
            eventId: event.event_id,
          };
        })
        .reverse(),
    [items],
  );
  const activeGrants = grants.filter((grant) => grant.active).length;
  const denied = items.filter((event) => event.event_type === "iam.denied").length;
  const tenants = Array.from(new Set(grants.map((grant) => String(grant.tenant)))).sort();
  const inFlight = allRuns.filter((run: any) => ["starting", "running"].includes(run.status)).length;

  return (
    <div className="page">
      <SectionTitle hint="BastionLoop authorizes per-run capability tokens, not username accounts. This view is built from the append-only token-issuance ledger.">
        Users & Teams
      </SectionTitle>

      {(events.error || runs.error) && (
        <ErrorBanner
          message={events.error || runs.error || ""}
          onRetry={() => {
            void events.refresh();
            void runs.refresh();
          }}
        />
      )}

      <div className="governance-note">
        <Icon name="key" size={15} />
        <span>
          The control plane has no password directory. A subject is a tenant-scoped bearer capability with an explicit
          action list, optional run binding and expiry.
        </span>
      </div>

      <div className="bay-metric-grid four">
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Active capability grants</span><Icon name="key" size={16} /></div>
          <strong>{activeGrants}</strong>
          <small>{grants.length} total issued in the ledger window</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Tenant subjects</span><Icon name="users" size={16} /></div>
          <strong>{tenants.length}</strong>
          <small>{tenants.join(" · ") || "No tenant grants yet"}</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Runs in flight</span><Icon name="activity" size={16} /></div>
          <strong>{inFlight}</strong>
          <small>{allRuns.length} total evaluation runs</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Denied requests</span><Icon name="alert" size={16} /></div>
          <strong className={denied > 0 ? "danger-text" : ""}>{denied}</strong>
          <small>Recorded policy denials in this window</small>
        </div>
      </div>

      <Card title="Capability subjects" subtitle={`${grants.length} issued grants · ${activeGrants} currently unexpired`}>
        {events.loading && !events.data && <Loading label="Loading capability grants" />}
        {!events.loading && grants.length === 0 && <Empty>No token issuances have been recorded yet.</Empty>}
        {grants.length > 0 && (
          <div className="table-wrap">
            <table className="table users-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Capability scope</th>
                  <th>Run binding</th>
                  <th>TTL</th>
                  <th>Issued</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {grants.slice(0, 60).map((grant) => (
                  <tr key={`${grant.seq}-${grant.eventId}`}>
                    <td><span className="mono strong">{grant.tenant}</span></td>
                    <td>
                      <div className="capability-list">
                        {grant.actions.length === 0 ? <span className="dim">no actions</span> : grant.actions.map((action: string) => (
                          <span key={action} className="capability-chip mono">{action}</span>
                        ))}
                      </div>
                    </td>
                    <td className="mono">{grant.runId ?? "tenant-wide"}</td>
                    <td className="mono">{grant.ttl ? `${grant.ttl}s` : "—"}</td>
                    <td className="mono">{ageLabel(grant.ts)}</td>
                    <td>
                      <StatusPill
                        status={grant.active ? "signed" : "neutral"}
                        label={grant.active ? "UNEXPIRED" : "EXPIRED"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Why there is no user roster" subtitle="The authorization boundary is the token, not a display name">
        <ul className="clean-list">
          <li>Every protected action is checked against the signed capability and the policy bundle.</li>
          <li>Capabilities can be scoped to one tenant, one run and a short TTL.</li>
          <li>Denials are recorded as <span className="mono">iam.denied</span> ledger events, not hidden client-side.</li>
          <li>Token material itself is never rendered in this interface.</li>
        </ul>
      </Card>
    </div>
  );
}
