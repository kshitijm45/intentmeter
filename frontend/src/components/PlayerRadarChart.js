"use client";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function PlayerRadarChart({ player1, player2, data }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#1f2937" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name={player1}
          dataKey="p1"
          stroke="#22c55e"
          fill="#22c55e"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Radar
          name={player2}
          dataKey="p2"
          stroke="#60a5fa"
          fill="#60a5fa"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-gray-400">{value}</span>
          )}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
