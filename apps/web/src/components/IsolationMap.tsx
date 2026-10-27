import { Empty, StatusPill } from "./UI";

type Zone = { id: string; label?: string; egress?: string; trust?: string };
type Path = { from: string; to: string; label?: string };
type Attempt = { seq?: number; type?: string; tenant?: string; detail?: unknown };

export function IsolationMap({
  mode,
  zones,
  allowedPaths,
  blockedPaths,
  recentAttempts,
  loading,
  error,
}: {
  mode?: string;
  zones: Zone[];
  allowedPaths: Path[];
  blockedPaths: Path[];
  recentAttempts: Attempt[];
  loading?: boolean;
  error?: string | null;
}) {
  const naive = mode === "naive";
  const hasData = zones.length > 0 || allowedPaths.length > 0 || blockedPaths.length > 0;

  if (loading && !hasData) {
    return <Empty>Loading boundary policy…</Empty>;
  }
  if (error && !hasData) {
    return <Empty>Boundary policy unavailable: {error}</Empty>;
  }
  if (!hasData) {
    return <Empty>No boundary policy was returned by the gateway.</Empty>;
  }

  return (
    <div className="iso-wrap">
      <div>
        {naive && (
          <div className="note-line">
            Naive baseline: policy paths below are the server-reported hardened policy. The naive run still uses
            tokens; use the run evidence for what actually happened.
          </div>
        )}
        <div className={`iso-board ${zones.length ? "" : "iso-board-empty"}`}>
          {zones.map((zone) => (
            <div key={zone.id} className={`zone zone-${zone.id} ${naive ? "zone-broken" : ""}`}>
              <span className="zone-kicker">{zone.trust ?? "ZONE"}</span>
              <strong>{zone.label ?? zone.id}</strong>
              <span className="zone-note">{zone.egress ? `egress: ${zone.egress}` : "egress: unknown"}</span>
            </div>
          ))}
          {zones.length === 0 && <Empty>No zones returned.</Empty>}
        </div>

        <div className="attempt-list">
          <div className="attempt-head">
            <span>Recent boundary attempts</span>
            <span className="mono">{recentAttempts.length} recorded</span>
          </div>
          {recentAttempts.length === 0 && <div className="empty">No boundary attempts recorded in the recent ledger window.</div>}
          {recentAttempts.slice(-8).reverse().map((attempt, index) => {
            const leak = String(attempt.type ?? "").includes("leak");
            return (
              <div key={`${attempt.seq}-${index}`} className="attempt">
                <span className="mono">#{attempt.seq ?? "?"}</span>
                <span className={`attempt-type ${leak ? "danger" : ""}`}>{attempt.type ?? "attempt"}</span>
                <span className="attempt-tenant">{attempt.tenant ?? "—"}</span>
                <span className="attempt-detail mono">
                  {typeof attempt.detail === "string" ? attempt.detail : JSON.stringify(attempt.detail ?? {}).slice(0, 110)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="iso-paths">
        <h3 className="subhead">Allowed paths</h3>
        {allowedPaths.length === 0 && <div className="empty">No allowed paths returned.</div>}
        {allowedPaths.map((path, index) => (
          <div key={`allow-${path.from}-${path.to}-${index}`} className="path-row">
            <span className="path allowed" aria-label="allowed">✓</span>
            <span>{path.from} → {path.to}</span>
            <span className="mono">{path.label ?? "allowed"}</span>
          </div>
        ))}
        <h3 className="subhead">Blocked paths</h3>
        {blockedPaths.length === 0 && <div className="empty">No blocked paths returned.</div>}
        {blockedPaths.map((path, index) => (
          <div key={`block-${path.from}-${path.to}-${index}`} className="path-row">
            <span className="path blocked" aria-label="blocked">✕</span>
            <span>{path.from} → {path.to}</span>
            <span className="mono">{path.label ?? "blocked"}</span>
          </div>
        ))}
        <div className="mini-note">
          Paths are the gateway's declared policy model, not a live network measurement. Container-level probes report
          UNTESTED without Compose.
        </div>
        <StatusPill
          status={blockedPaths.length > 0 ? "untested" : "error"}
          label={blockedPaths.length > 0 ? `${blockedPaths.length} BLOCK RULES DECLARED` : "NO BLOCK RULES"}
        />
      </div>
    </div>
  );
}
