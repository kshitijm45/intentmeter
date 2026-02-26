"use client";
import { useState, useEffect } from "react";
import { use } from "react";
import StatCard from "@/components/StatCard";
import SeasonBarChart from "@/components/SeasonBarChart";

const API = "http://localhost:8000/api";
const ACCENT = "#ea580c";
const BLUE   = "#3b82f6";

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(v, d = 2) {
  if (v == null) return "—";
  if (typeof v !== "number") return String(v);
  return parseFloat(v.toFixed(d)).toString();
}

function fmtInt(v) {
  if (v == null) return "—";
  return Math.round(v).toLocaleString();
}

function fmtOvers(balls) {
  if (!balls) return "—";
  return `${Math.floor(balls / 6)}.${balls % 6} ov`;
}

// ── Phase Card (single player) ────────────────────────────────────────────────

const PHASE_META = {
  pp:     { label: "Powerplay",    icon: "⚡", overs: "Overs 1–6" },
  middle: { label: "Middle Overs", icon: "🎯", overs: "Overs 7–15" },
  death:  { label: "Death Overs",  icon: "💥", overs: "Overs 16–20" },
};

function PlayerPhaseCard({ phaseKey, stats, mode }) {
  const meta = PHASE_META[phaseKey] ?? {};

  const rows = mode === "batting"
    ? [
        { label: "Strike Rate", value: fmt(stats?.sr) },
        { label: "Average",     value: fmt(stats?.avg) },
        { label: "Boundary %",  value: fmt(stats?.boundary_pct) },
        { label: "Dot Ball %",  value: fmt(stats?.dot_ball_pct) },
      ]
    : [
        { label: "Economy",      value: fmt(stats?.economy) },
        { label: "Average",      value: fmt(stats?.avg) },
        { label: "Dot Ball %",   value: fmt(stats?.dot_ball_pct) },
        { label: "Wkts / Inn",   value: fmt(stats?.wkts_per_innings) },
      ];

  const sample = mode === "batting"
    ? (stats?.balls_faced ? `${fmtInt(stats.balls_faced)} balls` : null)
    : (stats?.legal_balls  ? fmtOvers(stats.legal_balls) : null);

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base">{meta.icon}</span>
            <span className="font-semibold text-sm" style={{ color: "var(--txt)" }}>
              {meta.label}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--txt-3)" }}>{meta.overs}</p>
        </div>
        {sample && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--bg-input)", color: "var(--txt-3)" }}
          >
            {sample}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map(r => (
          <div key={r.label}>
            <div className="text-xs mb-0.5" style={{ color: "var(--txt-3)" }}>{r.label}</div>
            <div className="text-xl font-bold" style={{ color: "var(--txt)" }}>{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Split Comparison Card ─────────────────────────────────────────────────────

function SplitCard({ labelA, labelB, statsA, statsB, metrics }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <span className="text-sm font-semibold" style={{ color: ACCENT }}>{labelA}</span>
        <span className="text-xs" style={{ color: "var(--txt-3)" }}>vs</span>
        <span className="text-sm font-semibold" style={{ color: BLUE }}>{labelB}</span>
      </div>

      <div className="space-y-4">
        {metrics.map(m => {
          const a = parseFloat(statsA?.[m.key]);
          const b = parseFloat(statsB?.[m.key]);
          const maxVal = Math.max(!isNaN(a) ? a : 0, !isNaN(b) ? b : 0) || 1;
          const aWins  = !isNaN(a) && !isNaN(b) && a !== b && (m.lowerIsBetter ? a < b : a > b);
          const bWins  = !isNaN(a) && !isNaN(b) && a !== b && (m.lowerIsBetter ? b < a : b > a);

          return (
            <div key={m.key}>
              <p className="text-xs mb-1.5" style={{ color: "var(--txt-3)" }}>{m.label}</p>
              <div className="flex items-center gap-2">

                {/* A side (right-aligned bar) */}
                <div className="flex-1 flex flex-col items-end gap-1">
                  <span className="text-sm font-bold" style={{ color: aWins ? ACCENT : "var(--txt)" }}>
                    {isNaN(a) ? "—" : fmt(a)}
                  </span>
                  <div className="h-1 rounded-full w-full" style={{ background: "var(--bg-input)" }}>
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width:       `${!isNaN(a) ? Math.min(100, (a / maxVal) * 100) : 0}%`,
                        background:  ACCENT,
                        opacity:     aWins ? 1 : 0.4,
                        marginLeft:  "auto",
                      }}
                    />
                  </div>
                </div>

                <div className="text-xs shrink-0 px-0.5" style={{ color: "var(--txt-3)" }}>|</div>

                {/* B side (left-aligned bar) */}
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-sm font-bold" style={{ color: bWins ? BLUE : "var(--txt)" }}>
                    {isNaN(b) ? "—" : fmt(b)}
                  </span>
                  <div className="h-1 rounded-full w-full" style={{ background: "var(--bg-input)" }}>
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width:      `${!isNaN(b) ? Math.min(100, (b / maxVal) * 100) : 0}%`,
                        background: BLUE,
                        opacity:    bWins ? 1 : 0.4,
                      }}
                    />
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Detail stats mini-grid ────────────────────────────────────────────────────

function DetailGrid({ rows }) {
  return (
    <div
      className="rounded-2xl border p-5 grid grid-cols-2 gap-x-6 gap-y-4 content-start"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {rows.map(({ label, value }) => (
        <div key={label}>
          <div className="text-xs mb-0.5" style={{ color: "var(--txt-3)" }}>{label}</div>
          <div className="font-bold text-base" style={{ color: "var(--txt)" }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Event filter options ──────────────────────────────────────────────────────

const EVENTS_OPTS = [
  { label: "All",  value: [] },
  { label: "IPL",  value: ["IPL"] },
  { label: "SA20", value: ["SA20"] },
  { label: "T20I", value: ["T20I"] },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlayerProfilePage({ params }) {
  const { name: rawName } = use(params);
  const name = decodeURIComponent(rawName);

  const [eventsIdx, setEventsIdx] = useState(0);
  const [tab,       setTab]       = useState("batting");
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    const evts = EVENTS_OPTS[eventsIdx].value;
    setLoading(true);
    setError(null);
    const qs  = evts.length ? evts.map(e => `events=${e}`).join("&") : "";
    const url = `${API}/profile?player=${encodeURIComponent(name)}${qs ? "&" + qs : ""}`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { setData(json); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, [name, eventsIdx]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const player  = data?.player  ?? {};
  const batting = data?.batting ?? {};
  const bowling = data?.bowling ?? {};

  const initials = (player.display_name || name)
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const battingCards = [
    { label: "Matches",     value: fmtInt(batting.overall?.matches) },
    { label: "Innings",     value: fmtInt(batting.overall?.innings) },
    { label: "Runs",        value: fmtInt(batting.overall?.runs),    highlight: true },
    { label: "Average",     value: fmt(batting.overall?.avg) },
    { label: "Strike Rate", value: fmt(batting.overall?.sr) },
    { label: "50s / 100s",  value: `${fmtInt(batting.overall?.fifties)} / ${fmtInt(batting.overall?.hundreds)}` },
    { label: "Balls Faced", value: fmtInt(batting.overall?.balls_faced) },
    { label: "Boundary %",  value: fmt(batting.overall?.boundary_pct) },
    { label: "Dot Ball %",  value: fmt(batting.overall?.dot_ball_pct) },
  ];

  const bowlingCards = [
    { label: "Matches",          value: fmtInt(bowling.overall?.matches) },
    { label: "Innings",          value: fmtInt(bowling.overall?.innings_bowled) },
    { label: "Wickets",          value: fmtInt(bowling.overall?.wickets),          highlight: true },
    { label: "Economy",          value: fmt(bowling.overall?.economy) },
    { label: "Average",          value: fmt(bowling.overall?.avg) },
    { label: "Strike Rate",      value: fmt(bowling.overall?.bowling_sr) },
    { label: "Legal Balls",      value: fmtOvers(bowling.overall?.legal_balls) },
    { label: "Dot Ball %",       value: fmt(bowling.overall?.dot_ball_pct) },
    { label: "Boundary Given %", value: fmt(bowling.overall?.boundary_given_pct) },
  ];

  const battingSplitMetrics = [
    { label: "Strike Rate", key: "sr" },
    { label: "Average",     key: "avg" },
    { label: "Boundary %",  key: "boundary_pct" },
    { label: "Dot Ball %",  key: "dot_ball_pct", lowerIsBetter: true },
  ];

  const bowlingSplitMetrics = [
    { label: "Economy",      key: "economy",          lowerIsBetter: true },
    { label: "Average",      key: "avg",              lowerIsBetter: true },
    { label: "Dot Ball %",   key: "dot_ball_pct" },
    { label: "Wkts / Inn",   key: "wkts_per_innings" },
  ];

  const seasons = tab === "batting"
    ? (batting.by_season ?? [])
    : (bowling.by_season ?? []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto">

        {/* ── Player header ────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 border-2"
            style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}
          >
            <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{initials}</span>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--txt)" }}>
              {player.display_name || name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </h1>
            <div className="flex flex-wrap gap-2">
              {player.country && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border"
                  style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                >
                  {player.country}
                </span>
              )}
              {player.batting_style && (
                <span
                  className="px-2.5 py-1 rounded-lg text-xs border"
                  style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                >
                  {player.batting_style}
                </span>
              )}
              {player.bowling_style && (
                <span
                  className="px-2.5 py-1 rounded-lg text-xs border"
                  style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                >
                  {player.bowling_style}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Controls: tabs + event filter ───────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">

          {/* Tab switcher */}
          <div
            className="inline-flex rounded-xl p-1 border gap-1"
            style={{ background: "var(--bg-input)", borderColor: "var(--border)" }}
          >
            {["batting", "bowling"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-150"
                style={
                  tab === t
                    ? { background: "var(--accent)", color: "var(--accent-fg)", boxShadow: "0 1px 4px rgba(234,88,12,0.3)" }
                    : { background: "transparent", color: "var(--txt-3)" }
                }
              >
                {t}
              </button>
            ))}
          </div>

          {/* Event filter */}
          <div
            className="inline-flex rounded-xl p-1 border gap-1"
            style={{ background: "var(--bg-input)", borderColor: "var(--border)" }}
          >
            {EVENTS_OPTS.map((opt, i) => (
              <button
                key={opt.label}
                onClick={() => setEventsIdx(i)}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                style={
                  eventsIdx === i
                    ? { background: "var(--bg-card)", color: "var(--txt)", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }
                    : { background: "transparent", color: "var(--txt-3)" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {loading && (
          <div className="text-center py-20 text-sm" style={{ color: "var(--txt-3)" }}>
            Loading stats…
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {!loading && error && (
          <div className="text-center py-20 text-sm" style={{ color: "var(--txt-3)" }}>
            Could not load player data.
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        {!loading && !error && data && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
              {(tab === "batting" ? battingCards : bowlingCards).map(c => (
                <StatCard key={c.label} {...c} />
              ))}
            </div>

            {/* Phase breakdown */}
            <div className="mb-8">
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: "var(--txt-3)" }}
              >
                By Phase
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {["pp", "middle", "death"].map(ph => (
                  <PlayerPhaseCard
                    key={ph}
                    phaseKey={ph}
                    stats={tab === "batting" ? batting.phases?.[ph] : bowling.phases?.[ph]}
                    mode={tab}
                  />
                ))}
              </div>
            </div>

            {/* vs Bowler Type / vs Batter Hand */}
            <div className="mb-8">
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: "var(--txt-3)" }}
              >
                {tab === "batting" ? "vs Bowler Type" : "vs Batter Hand"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tab === "batting" ? (
                  <>
                    <SplitCard
                      labelA="Pace"
                      labelB="Spin"
                      statsA={batting.vs_pace}
                      statsB={batting.vs_spin}
                      metrics={battingSplitMetrics}
                    />
                    <DetailGrid rows={[
                      { label: "SR vs Pace",    value: fmt(batting.vs_pace?.sr) },
                      { label: "SR vs Spin",    value: fmt(batting.vs_spin?.sr) },
                      { label: "Avg vs Pace",   value: fmt(batting.vs_pace?.avg) },
                      { label: "Avg vs Spin",   value: fmt(batting.vs_spin?.avg) },
                      { label: "Balls vs Pace", value: fmtInt(batting.vs_pace?.balls_faced) },
                      { label: "Balls vs Spin", value: fmtInt(batting.vs_spin?.balls_faced) },
                      { label: "Dot % vs Pace", value: fmt(batting.vs_pace?.dot_ball_pct) },
                      { label: "Dot % vs Spin", value: fmt(batting.vs_spin?.dot_ball_pct) },
                    ]} />
                  </>
                ) : (
                  <>
                    <SplitCard
                      labelA="vs LHB"
                      labelB="vs RHB"
                      statsA={bowling.vs_left}
                      statsB={bowling.vs_right}
                      metrics={bowlingSplitMetrics}
                    />
                    <DetailGrid rows={[
                      { label: "Wkts vs LHB",  value: fmtInt(bowling.vs_left?.wickets) },
                      { label: "Wkts vs RHB",  value: fmtInt(bowling.vs_right?.wickets) },
                      { label: "Econ vs LHB",  value: fmt(bowling.vs_left?.economy) },
                      { label: "Econ vs RHB",  value: fmt(bowling.vs_right?.economy) },
                      { label: "Avg vs LHB",   value: fmt(bowling.vs_left?.avg) },
                      { label: "Avg vs RHB",   value: fmt(bowling.vs_right?.avg) },
                      { label: "Dot % vs LHB", value: fmt(bowling.vs_left?.dot_ball_pct) },
                      { label: "Dot % vs RHB", value: fmt(bowling.vs_right?.dot_ball_pct) },
                    ]} />
                  </>
                )}
              </div>
            </div>

            {/* Season chart */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <h2 className="font-semibold mb-6" style={{ color: "var(--txt)" }}>
                {tab === "batting" ? "Runs by Year" : "Wickets by Year"}
              </h2>
              {seasons.length > 0 ? (
                <SeasonBarChart
                  data={seasons}
                  dataKey={tab === "batting" ? "runs" : "wickets"}
                  label={tab === "batting" ? "Runs" : "Wickets"}
                />
              ) : (
                <div className="h-60 flex items-center justify-center text-sm" style={{ color: "var(--txt-3)" }}>
                  No season data available
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
