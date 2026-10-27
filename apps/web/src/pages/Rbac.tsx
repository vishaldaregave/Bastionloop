import { api } from "../api";
import { usePolling } from "../hooks";
import { Card, Empty, ErrorBanner, Loading, SectionTitle, StatusPill } from "../components/UI";

function conditionText(when: Record<string, any> | undefined): string {
  if (!when || Object.keys(when).length === 0) return "always";
  return Object.entries(when)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join("|") : String(value)}`)
    .join(" · ");
}

export function Rbac() {
  const policy = usePolling(() => api.get<any>("/v1/policy"), 15000);
  const bundle = policy.data?.bundle ?? {};
  const rules: any[] = Array.isArray(bundle.rules) ? bundle.rules : [];
  const allow = rules.filter((rule) => rule.effect === "allow").length;
  const deny = rules.filter((rule) => rule.effect === "deny").length;
  const unavailable = Boolean(policy.error) || policy.data?.status === "UNAVAILABLE";

  return (
    <div className="page">
      <SectionTitle hint="The gateway evaluates this signed policy bundle on every protected request. Client-side state cannot elevate a capability.">
        Roles & Permissions
      </SectionTitle>

      {(policy.error || policy.data?.error) && (
        <ErrorBanner
          title="Policy bundle unavailable"
          message={policy.error || policy.data?.error || ""}
          onRetry={() => void policy.refresh()}
        />
      )}

      <div className="bay-metric-grid four">
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Policy version</span></div>
          <strong className="mono metric-text">{policy.data?.version ?? "unknown"}</strong>
          <small className="mono ellipsis">{policy.data?.hash ?? "hash unavailable"}</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Signature</span></div>
          <strong className="metric-status">
            <StatusPill
              status={unavailable ? "disconnected" : policy.data?.signature_verified ? "verified" : "failed"}
              label={unavailable ? "UNAVAILABLE" : policy.data?.signature_verified ? "VERIFIED" : "FAILED"}
            />
          </strong>
          <small>Pinned control key verifies the bundle</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Allow rules</span></div>
          <strong>{allow}</strong>
          <small>Explicit capabilities in the bundle</small>
        </div>
        <div className="bay-metric">
          <div className="bay-metric-head"><span>Deny rules</span></div>
          <strong className={deny > 0 ? "danger-text" : ""}>{deny}</strong>
          <small>Default decision: {bundle.default ?? "unknown"}</small>
        </div>
      </div>

      <Card title="Capability matrix" subtitle={`${rules.length} server-enforced rules · default ${bundle.default ?? "unknown"}`}>
        {policy.loading && !policy.data && <Loading label="Loading policy bundle" />}
        {!policy.loading && rules.length === 0 && (
          <Empty>{unavailable ? "The gateway did not return a policy bundle." : "The policy bundle has no rules."}</Empty>
        )}
        {rules.length > 0 && (
          <div className="table-wrap">
            <table className="table rbac-table">
              <thead>
                <tr><th>Rule</th><th>Effect</th><th>Actions</th><th>Conditions</th><th>Source</th></tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td className="mono strong">{rule.id}</td>
                    <td>
                      <StatusPill
                        status={rule.effect === "allow" ? "pass" : "fail"}
                        label={String(rule.effect).toUpperCase()}
                      />
                    </td>
                    <td>
                      <div className="capability-list">
                        {(rule.actions ?? []).map((action: string) => (
                          <span key={action} className="capability-chip mono">{action}</span>
                        ))}
                      </div>
                    </td>
                    <td className="mono small">{conditionText(rule.when)}</td>
                    <td className="mono tiny">{policy.data?.hash?.slice(0, 12) ?? "unknown"}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Enforcement path" subtitle="Every request traverses the same decision point">
        <div className="enforcement-path">
          <div><span className="path-number">01</span><strong>Bearer capability</strong><small>Tenant, actions, optional run binding and expiry.</small></div>
          <div><span className="path-number">02</span><strong>Ownership check</strong><small>Cross-tenant access is rejected before policy evaluation.</small></div>
          <div><span className="path-number">03</span><strong>Signed policy</strong><small>Allow and deny rules are evaluated with default deny.</small></div>
          <div><span className="path-number">04</span><strong>Evidence</strong><small>Grant, denial and protected effects are appended to the ledger.</small></div>
        </div>
      </Card>
    </div>
  );
}
