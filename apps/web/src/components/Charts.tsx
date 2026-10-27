import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  color: "var(--text)",
  fontSize: 11,
  boxShadow: "var(--shadow-menu)",
};

export function TimingChart({ timing }: { timing: any }) {
  const data = [
    {
      mode: "Naive",
      allow: timing?.naive?.allow?.p50 ?? 0,
      block: timing?.naive?.block?.p50 ?? 0,
      p: timing?.naive?.distinguishability?.p_value,
    },
    {
      mode: "Hardened",
      allow: timing?.hardened?.allow?.p50 ?? 0,
      block: timing?.hardened?.block?.p50 ?? 0,
      p: timing?.hardened?.distinguishability?.p_value,
    },
  ];
  const hasData = data.some((row) => row.allow > 0 || row.block > 0);
  if (!hasData) {
    return <div className="empty">No timing samples yet. Run red-team cases in both modes.</div>;
  }
  return (
    <div className="chart" style={{ height: 250 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={6} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="mode" stroke="var(--muted)" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} unit="ms" width={46} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent-soft)" }} />
          <Legend wrapperStyle={{ fontSize: 10, color: "var(--muted)" }} />
          <Bar dataKey="allow" name="allow verdict" fill="var(--green)" radius={[3, 3, 0, 0]} maxBarSize={36} />
          <Bar dataKey="block" name="block verdict" fill="var(--red)" radius={[3, 3, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function OverheadChart({ overhead }: { overhead: any }) {
  const base = overhead?.baseline_model ?? {};
  const gateway = overhead?.gateway_overhead ?? {};
  const data = [
    { name: "Baseline model", p50: base.p50 ?? 0, p95: base.p95 ?? 0 },
    { name: "Gateway overhead", p50: gateway.p50 ?? 0, p95: gateway.p95 ?? 0 },
  ];
  if (!base.n && !gateway.n) return <div className="empty">No overhead samples yet.</div>;
  return (
    <div className="chart" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" stroke="var(--muted)" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--muted)" tick={{ fontSize: 10, fill: "var(--muted)" }} tickLine={false} axisLine={false} unit="ms" width={46} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent-soft)" }} />
          <Legend wrapperStyle={{ fontSize: 10, color: "var(--muted)" }} />
          <Bar dataKey="p50" name="p50" fill="var(--accent)" radius={[3, 3, 0, 0]} maxBarSize={40} />
          <Bar dataKey="p95" name="p95" fill="var(--text-secondary)" radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
