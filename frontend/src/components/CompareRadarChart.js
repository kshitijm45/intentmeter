"use client";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const P1_COLOR = "#ea580c";
const P2_COLOR = "#3b82f6";

// Custom tick that renders metric name + both player raw values on the radar itself
function CustomAngleTick({ x, y, cy, payload, textAnchor, data }) {
  const entry = data?.find((d) => d.metric === payload?.value);
  const dy = y - cy;
  const isBelow = dy > 10;

  // For axes below the center, push label down; above the center, push up
  const nameY = isBelow ? y + 14 : y - 18;
  const valY  = isBelow ? y + 28 : y - 5;

  return (
    <g>
      <text
        x={x}
        y={nameY}
        textAnchor={textAnchor}
        fill="var(--txt-2)"
        fontSize={11}
        fontWeight={500}
        fontFamily="inherit"
      >
        {payload?.value}
      </text>
      {entry && (
        <text x={x} y={valY} textAnchor={textAnchor} fontSize={12} fontFamily="inherit">
          <tspan fill={P1_COLOR} fontWeight={700}>{entry.p1Raw}</tspan>
          <tspan fill="var(--txt-3)" fontSize={10}> · </tspan>
          <tspan fill={P2_COLOR} fontWeight={700}>{entry.p2Raw}</tspan>
        </text>
      )}
    </g>
  );
}

export default function CompareRadarChart({ data, p1Name, p2Name }) {
  return (
    <div>
      {/* Prominent player legend */}
      <div className="flex items-center justify-center gap-10 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: P1_COLOR }} />
          <span className="font-bold text-sm" style={{ color: P1_COLOR }}>{p1Name}</span>
        </div>
        <div className="w-px h-5 flex-shrink-0" style={{ background: "var(--border)" }} />
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: P2_COLOR }} />
          <span className="font-bold text-sm" style={{ color: P2_COLOR }}>{p2Name}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={520}>
        <RadarChart
          data={data}
          outerRadius="55%"
          margin={{ top: 36, right: 80, bottom: 36, left: 80 }}
        >
          <PolarGrid
            stroke="var(--border)"
            strokeOpacity={0.5}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <PolarAngleAxis
            dataKey="metric"
            tick={<CustomAngleTick data={data} />}
            tickLine={false}
          />
          <Radar
            name={p1Name}
            dataKey="p1"
            stroke={P1_COLOR}
            fill={P1_COLOR}
            fillOpacity={0.2}
            strokeWidth={2.5}
            dot={{ r: 4, fill: P1_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: P1_COLOR }}
          />
          <Radar
            name={p2Name}
            dataKey="p2"
            stroke={P2_COLOR}
            fill={P2_COLOR}
            fillOpacity={0.15}
            strokeWidth={2.5}
            dot={{ r: 4, fill: P2_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: P2_COLOR }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
