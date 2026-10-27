import { useState } from "react";
import { Icon } from "./Icon";
import { Card, Spinner, StatusPill } from "./UI";

function serviceDetail(name: string, item: any): string {
  if (name === "notary") return `${item.events ?? "?"} events · cp ${item.latest_checkpoint ?? "?"}`;
  if (name === "signer") return `key ${item.key_id ?? "unknown"}`;
  if (name === "witness") return `last cp ${item.last_witnessed_counter ?? "?"}`;
  if (name === "anchor") return `${item.entries ?? "?"} entries`;
  if (name === "model") return `${item.adapter ?? "adapter?"} / ${item.model_id ?? "model?"}`;
  if (name === "blue") return `${item.sealed ? "sealed" : "unsealed"} · egress ${item.egress ?? "unknown"}`;
  return item.service ?? "ok";
}

export function ServiceHealth({
  health,
  error,
  loading,
  onRetry,
}: {
  health: any;
  error: string | null;
  loading: boolean;
  onRetry?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const services = health?.services ?? {};
  const names = Object.keys(services);
  const unavailable = names.filter((name) => services[name]?.status !== "ok");
  const connected = names.length - unavailable.length;

  return (
    <Card
      title="Service health"
      subtitle="Live gateway probe; configuration is not treated as health."
      actions={
        <div className="row-actions">
          <button className="btn btn-ghost btn-xs" onClick={onRetry} disabled={loading} aria-label="Probe services again">
            {loading ? <Spinner label="Probing" /> : <Icon name="refresh" size={13} />}
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-controls="service-health-details"
          >
            {expanded ? "Hide details" : "Details"}
            <Icon name={expanded ? "chevron-down" : "chevron-right"} size={12} />
          </button>
        </div>
      }
    >
      {!health && loading && <div className="loading-state"><Spinner label="Probing services" /></div>}
      {!health && !loading && (
        <div className="empty" role="status">Gateway disconnected. Service health is unknown.</div>
      )}
      {health && (
        <>
          <div className="service-summary">
            <StatusPill
              status={error ? "disconnected" : unavailable.length ? "warn" : "pass"}
              label={error ? "Disconnected" : `${connected}/${names.length} connected`}
            />
            <span className="service-summary-copy">
              {error
                ? "Latest probe failed; values may be stale."
                : unavailable.length
                  ? `${unavailable.join(", ")} unavailable`
                  : "All control-plane services answered."}
            </span>
          </div>
          {expanded && (
            <div className="service-grid" id="service-health-details">
              {names.map((name) => {
                const item = services[name];
                const isConnected = item?.status === "ok";
                return (
                  <div key={name} className={`service-cell ${isConnected ? "service-ok" : "service-bad"}`}>
                    <div className="service-top">
                      <span className="mono strong">{name}</span>
                      <StatusPill
                        status={isConnected ? "pass" : item ? "disconnected" : "untested"}
                        label={isConnected ? "Connected" : item ? "Unavailable" : "Unknown"}
                      />
                    </div>
                    <span className="service-detail mono">
                      {isConnected ? serviceDetail(name, item) : item?.detail ?? "no response"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
