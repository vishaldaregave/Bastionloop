import { StatusPill } from "./UI";

export function IsolationMap({
  mode,
  recentAttempts,
}: {
  mode: string;
  recentAttempts: any[];
}) {
  const naive = mode === "naive";
  return (
    <div className="iso-wrap">
      <div className="iso-board">
        <div className={`zone zone-red ${naive ? "zone-broken" : ""}`}>
          <span className="zone-kicker">TENANT</span>
          <strong>Red</strong>
          <span className="zone-note">{naive ? "can read Blue storage" : "gateway-only egress"}</span>
        </div>
        <div className={`zone zone-gateway ${naive ? "zone-broken" : ""}`}>
          <span className="zone-kicker">MEDIATOR</span>
          <strong>Gateway</strong>
          <span className="zone-note">{naive ? "policy bypassed" : "tokens + OPA-style policy"}</span>
        </div>
        <div className={`zone zone-blue ${naive ? "zone-broken" : ""}`}>
          <span className="zone-kicker">SEALED</span>
          <strong>Blue</strong>
          <span className="zone-note">{naive ? "logic exposed" : "verdicts only, no egress"}</span>
        </div>
        <div className={`zone zone-model ${naive ? "zone-broken" : ""}`}>
          <span className="zone-kicker">INFERENCE</span>
          <strong>Model</strong>
          <span className="zone-note">{naive ? "shared session" : "one session per test"}</span>
        </div>
      </div>

      <div className="iso-paths">
        <div className="path-row">
          <span className={naive ? "path blocked" : "path allowed"}>{naive ? "✕" : "✓"}</span>
          <span>Red → Gateway</span>
          <span className="mono">{naive ? "token still verified" : "signed capability"}</span>
        </div>
        <div className="path-row">
          <span className={naive ? "path allowed" : "path blocked"}>{naive ? "✓" : "✕"}</span>
          <span>Red → Blue directly</span>
          <span className="mono">{naive ? "demo network" : "blocked"}</span>
        </div>
        <div className="path-row">
          <span className={naive ? "path allowed" : "path blocked"}>{naive ? "✓" : "✕"}</span>
          <span>Blue → external egress</span>
          <span className="mono">{naive ? "demo network" : "denied"}</span>
        </div>
        <div className="path-row">
          <span className={naive ? "path allowed" : "path blocked"}>{naive ? "✓" : "✕"}</span>
          <span>Model context across sessions</span>
          <span className="mono">{naive ? "shared" : "isolated"}</span>
        </div>
      </div>

      <div className="attempt-list">
        <div className="attempt-head">
          <span>Recent boundary attempts</span>
          <StatusPill status={recentAttempts.length ? "fail" : "pass"} label={`${recentAttempts.length} recorded`} />
        </div>
        {recentAttempts.length === 0 && <div className="empty">No boundary attempts yet. Use the judge challenge.</div>}
        {recentAttempts.slice(-8).reverse().map((attempt, index) => (
          <div key={`${attempt.seq}-${index}`} className="attempt">
            <span className="mono">#{attempt.seq}</span>
            <span className={`attempt-type ${attempt.type === "canary.leak" ? "danger" : ""}`}>{attempt.type}</span>
            <span className="attempt-tenant">{attempt.tenant}</span>
            <span className="attempt-detail mono">
              {typeof attempt.detail === "string" ? attempt.detail : JSON.stringify(attempt.detail).slice(0, 90)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
