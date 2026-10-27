import { Card, StatusPill, Spinner } from "./UI";

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
  const services = health?.services ?? {};
  const names = ["notary", "signer", "witness", "anchor", "model", "blue"];
  const unavailable = names.filter((name) => services[name]?.status !== "ok");

  return (
    <Card
      title="Service health"
      subtitle="Live probes through the gateway. A missing service is unknown, not healthy."
      actions={
        <button className="btn btn-ghost btn-xs" onClick={onRetry} disabled={loading}>
          {loading ? <Spinner label="Probing" /> : "Probe again"}
        </button>
      }
    >
      {!health && loading && <div className="loading-state"><Spinner label="Probing services" /></div>}
      {!health && !loading && (
        <div className="empty" role="status">
          Gateway disconnected. Service health is unknown.
        </div>
      )}
      {health && (
        <>
          <div className="service-grid">
            {names.map((name) => {
              const item = services[name];
              const connected = item?.status === "ok";
              return (
                <div key={name} className={`service-cell ${connected ? "service-ok" : "service-bad"}`}>
                  <div className="service-top">
                    <span className="mono strong">{name}</span>
                    <StatusPill
                      status={connected ? "pass" : item ? "disconnected" : "untested"}
                      label={connected ? "CONNECTED" : item ? "UNAVAILABLE" : "UNKNOWN"}
                    />
                  </div>
                  <span className="service-detail mono">
                    {connected
                      ? name === "model"
                        ? `${item.adapter ?? "adapter?"} / ${item.model_id ?? "model?"}`
                        : item.service ?? "ok"
                      : item?.detail ?? "no response"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="card-foot">
            {unavailable.length === 0
              ? "All six control-plane services answered this probe."
              : `${unavailable.length} service(s) unavailable: ${unavailable.join(", ")}. Dependent tests should be read as ERROR or UNTESTED.`}
            {error && health && " The latest refresh failed; values above may be stale."}
          </p>
        </>
      )}
    </Card>
  );
}
