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
  background: "#0b1220",
  border: "1px solid #223247",
  borderRadius: 10,
  color: "#dbe7f5",
  fontSize: 12,
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
      mode: "BastionLoop",
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
          <CartesianGrid stroke="#162235" vertical={false} />
          <XAxis dataKey="mode" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            unit="ms"
            width={52}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(122,162,255,0.06)" }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
          <Bar dataKey="allow" name="allow verdict" fill="#5eead4" radius={[4, 4, 0, 0]} maxBarSize={42} />
          <Bar dataKey="block" name="block verdict" fill="#f472b6" radius={[4, 4, 0, 0]} maxBarSize={42} />
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
          <CartesianGrid stroke="#162235" vertical={false} />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="ms" width={52} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(122,162,255,0.06)" }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
          <Bar dataKey="p50" name="p50" fill="#7aa2ff" radius={[4, 4, 0, 0]} maxBarSize={48} />
          <Bar dataKey="p95" name="p95" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
