"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg px-3 py-2 text-sm border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <p className="mb-1" style={{ color: "var(--txt-3)" }}>Match {label}</p>
        <p className="font-semibold" style={{ color: payload[0].payload.dismissed ? "#ef4444" : "var(--accent)" }}>
          {payload[0].value} runs
        </p>
        {payload[0].payload.dismissed && (
          <p className="text-xs mt-0.5" style={{ color: "#ef4444" }}>Dismissed</p>
        )}
      </div>
    );
  }
  return null;
};

export default function MatchupBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="match"
          tick={{ fill: "var(--txt-3)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "var(--txt-3)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(234,88,12,0.04)" }} />
        <Bar dataKey="runs" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.dismissed ? "#ef4444" : "#ea580c"}
              fillOpacity={entry.dismissed ? 0.7 : 0.9}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
