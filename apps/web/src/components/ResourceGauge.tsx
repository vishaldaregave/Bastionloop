export function ResourceGauge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null | undefined;
  tone: string;
}) {
  const pct = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="resource-gauge">
      <div
        className="gauge-ring"
        style={{ background: `conic-gradient(${tone} ${pct}%, #191C24 0)` }}
      >
        <span>{typeof value === "number" ? `${Math.round(value)}%` : "—"}</span>
      </div>
      <small>{label}</small>
    </div>
  );
}
