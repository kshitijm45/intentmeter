"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg px-3 py-2 text-sm border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <p className="mb-1" style={{ color: "var(--txt-3)" }}>{label}</p>
        <p className="font-semibold" style={{ color: "var(--accent)" }}>
          {payload[0].value} {payload[0].name}
        </p>
      </div>
    );
  }
  return null;
};

export default function SeasonBarChart({ data, dataKey, label }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="year"
          tick={{ fill: "var(--txt-3)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--txt-3)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(234,88,12,0.06)" }} />
        <Bar dataKey={dataKey} name={label} fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
