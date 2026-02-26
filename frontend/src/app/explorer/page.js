"use client";
import { useState, useEffect } from "react";
import PlayerCombobox from "@/components/PlayerCombobox";

const API_BASE = "http://localhost:8000/api";

const TOURNAMENTS = ["IPL", "T20I", "SA20"];
const PHASES = [
  { key: "all",    label: "All" },
  { key: "pp",     label: "Powerplay" },
  { key: "middle", label: "Middle" },
  { key: "death",  label: "Death" },
];
const BOWLER_TYPES = [
  { key: "",               label: "Any" },
  { key: "right-pace",     label: "Right-arm Pace" },
  { key: "left-pace",      label: "Left-arm Pace" },
  { key: "off-spin",       label: "Off-spin" },
  { key: "leg-spin",       label: "Leg-spin" },
  { key: "right-orthodox", label: "Right-arm Orthodox" },
  { key: "left-orthodox",  label: "Left-arm Orthodox" },
  { key: "right-wrist",    label: "Right-arm Wrist-spin" },
  { key: "left-wrist",     label: "Left-arm Wrist-spin" },
  { key: "pace",           label: "Any Pace" },
  { key: "spin",           label: "Any Spin" },
];
const BATTER_HANDS = [
  { key: "",      label: "Any" },
  { key: "right", label: "Right-hand" },
  { key: "left",  label: "Left-hand" },
];
const BALLS_OPTIONS = [
  { key: "",   label: "Whole innings" },
  { key: "10", label: "First 10 balls" },
  { key: "15", label: "First 15 balls" },
  { key: "20", label: "First 20 balls" },
  { key: "25", label: "First 25 balls" },
  { key: "30", label: "First 30 balls" },
];
const YEAR_OPTIONS = [
  { key: "",     label: "All time" },
  { key: "2019", label: "Since 2019" },
  { key: "2020", label: "Since 2020" },
  { key: "2021", label: "Since 2021" },
  { key: "2022", label: "Since 2022" },
  { key: "2023", label: "Since 2023" },
  { key: "2024", label: "Since 2024" },
  { key: "2025", label: "Since 2025" },
];

function fmt(val, dec = 1) {
  if (val == null || isNaN(val)) return "—";
  return Number(val).toFixed(dec);
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function SegmentedControl({ options, value, onChange }) {
  return (
    <div
      className="inline-flex rounded-xl p-1 gap-1 border"
      style={{ background: "var(--bg-input)", borderColor: "var(--border)" }}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
          style={
            value === o.key
              ? { background: "var(--accent)", color: "var(--accent-fg)" }
              : { background: "transparent", color: "var(--txt-3)" }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      {label && (
        <label
          className="block text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--txt-3)" }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-sm border transition-colors appearance-none cursor-pointer outline-none"
        style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt)" }}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
      style={
        active
          ? { background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent)" }
          : { background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }
      }
    >
      <span
        className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border"
        style={active ? { background: "var(--accent)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}
      >
        {active && (
          <svg width="8" height="8" fill="none" stroke="var(--accent-fg)" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--txt-3)" }}>{label}</div>
      <div
        className="font-bold text-2xl"
        style={{ color: accent ? "var(--accent)" : "var(--txt)" }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Results renderers ────────────────────────────────────────────────────────

function BatterStats({ stats }) {
  const cards = [
    { label: "Innings",        value: stats.innings ?? "—" },
    { label: "Runs",           value: stats.runs ?? "—", accent: true },
    { label: "Average",        value: fmt(stats.avg) },
    { label: "Strike Rate",    value: fmt(stats.sr), accent: true },
    { label: "Dot Ball %",     value: stats.dot_ball_pct != null ? `${fmt(stats.dot_ball_pct)}%` : "—" },
    { label: "Boundary %",     value: stats.boundary_pct != null ? `${fmt(stats.boundary_pct)}%` : "—" },
    { label: "Balls/Boundary", value: fmt(stats.balls_per_bdy) },
    { label: "Dismissals",     value: stats.dismissals ?? "—" },
    ...(stats.fifties != null ? [
      { label: "Fifties",  value: stats.fifties },
      { label: "Hundreds", value: stats.hundreds },
    ] : []),
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => <StatCard key={c.label} {...c} />)}
    </div>
  );
}

function BowlerStats({ stats }) {
  const cards = [
    { label: "Innings",          value: stats.innings ?? "—" },
    { label: "Wickets",          value: stats.wickets ?? "—", accent: true },
    { label: "Economy",          value: fmt(stats.economy, 2) },
    { label: "Average",          value: fmt(stats.avg) },
    { label: "Strike Rate",      value: fmt(stats.bowling_sr, 1) },
    { label: "Dot Ball %",       value: stats.dot_ball_pct != null ? `${fmt(stats.dot_ball_pct)}%` : "—", accent: true },
    { label: "Boundary Given %", value: stats.boundary_given_pct != null ? `${fmt(stats.boundary_given_pct)}%` : "—" },
    { label: "Wkts / Innings",   value: fmt(stats.wkts_per_innings, 2) },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {cards.map((c) => <StatCard key={c.label} {...c} />)}
    </div>
  );
}

function TeamStats({ stats }) {
  const cards = [
    { label: "Matches",    value: stats.matches ?? "—" },
    { label: "Wins",       value: stats.wins ?? "—", accent: true },
    { label: "Losses",     value: stats.losses ?? "—" },
    { label: "No Results", value: stats.no_results ?? "—" },
    { label: "Win %",      value: stats.win_pct != null ? `${stats.win_pct}%` : "—", accent: true },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => <StatCard key={c.label} {...c} />)}
    </div>
  );
}

// Group-by table
function GroupTable({ groups, mode }) {
  const battingCols = [
    { key: "innings",      label: "Inn",  fmt: (s) => s.innings ?? "—" },
    { key: "avg",          label: "Avg",  fmt: (s) => fmt(s.avg) },
    { key: "sr",           label: "SR",   fmt: (s) => fmt(s.sr) },
    { key: "dot_ball_pct", label: "Dot%", fmt: (s) => s.dot_ball_pct != null ? `${fmt(s.dot_ball_pct)}%` : "—" },
    { key: "boundary_pct", label: "Bdry%",fmt: (s) => s.boundary_pct != null ? `${fmt(s.boundary_pct)}%` : "—" },
  ];
  const bowlingCols = [
    { key: "innings",  label: "Inn",  fmt: (s) => s.innings ?? "—" },
    { key: "wickets",  label: "Wkts", fmt: (s) => s.wickets ?? "—" },
    { key: "economy",  label: "Econ", fmt: (s) => fmt(s.economy, 2) },
    { key: "avg",      label: "Avg",  fmt: (s) => fmt(s.avg) },
    { key: "dot_ball_pct", label: "Dot%", fmt: (s) => s.dot_ball_pct != null ? `${fmt(s.dot_ball_pct)}%` : "—" },
  ];
  const cols = mode === "bowling" ? bowlingCols : battingCols;

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--txt-3)" }}>
                Category
              </th>
              {cols.map((c) => (
                <th key={c.key} className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--txt-3)" }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="py-3 px-4 font-medium" style={{ color: "var(--accent)" }}>{g.label}</td>
                {cols.map((c) => (
                  <td key={c.key} className="py-3 px-4 text-right tabular-nums" style={{ color: "var(--txt)" }}>
                    {c.fmt(g.stats)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExplorerPage() {
  const [subject, setSubject] = useState("batter");

  // Data
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  // Selection
  const [player, setPlayer] = useState("");
  const [team, setTeam] = useState("");

  // Shared filters
  const [events, setEvents] = useState([]);
  const [phase, setPhase] = useState("all");
  const [opposition, setOpposition] = useState("");
  const [venue, setVenue] = useState("");
  const [yearFrom, setYearFrom] = useState("");

  // Batter-only
  const [bowlerType, setBowlerType] = useState("");
  const [balls, setBalls] = useState("");
  const [groupBy, setGroupBy] = useState("none");

  // Bowler-only
  const [batterHand, setBatterHand] = useState("");

  // Team-only
  const [inningsFilter, setInningsFilter] = useState("any");
  const [city, setCity] = useState("");

  // Results
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/players`)
      .then((r) => r.json())
      .then((d) => { setPlayers(d); setPlayersLoading(false); })
      .catch(() => setPlayersLoading(false));

    fetch(`${API_BASE}/teams`)
      .then((r) => r.json())
      .then(setTeams)
      .catch(() => {});
  }, []);

  const toggleEvent = (t) =>
    setEvents((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const handleReset = () => {
    setPlayer(""); setTeam(""); setEvents([]); setPhase("all");
    setOpposition(""); setVenue(""); setYearFrom(""); setBowlerType("");
    setBalls(""); setGroupBy("none"); setBatterHand(""); setInningsFilter("any");
    setCity(""); setResult(null); setError(null);
  };

  const canRun =
    subject === "team"
      ? !!team
      : !!player;

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let url;
      if (subject === "team") {
        const p = new URLSearchParams({ team });
        if (opposition) p.set("opposition", opposition);
        if (venue)      p.set("venue", venue);
        if (city)       p.set("city", city);
        events.forEach((e) => p.append("events", e));
        if (yearFrom)   p.set("year_from", yearFrom);
        if (inningsFilter !== "any") p.set("innings", inningsFilter);
        url = `${API_BASE}/stats/team?${p}`;
      } else {
        const mode = subject === "bowler" ? "bowling" : "batting";
        const p = new URLSearchParams({ player, mode });
        if (phase !== "all") p.set("phase", phase);
        events.forEach((e) => p.append("events", e));
        if (subject === "batter" && bowlerType)  p.set("bowler_type", bowlerType);
        if (subject === "bowler" && batterHand)  p.set("batter_hand", batterHand);
        if (opposition) p.set("opposition", opposition);
        if (venue)      p.set("venue", venue);
        if (yearFrom)   p.set("year_from", yearFrom);
        if (subject === "batter" && balls) p.set("balls", balls);
        if (groupBy !== "none") p.set("group_by", groupBy);
        url = `${API_BASE}/stats/player?${p}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const playerName = players.find((p) => p.unique_name === player)?.display_name ?? player;

  // Build a human-readable summary of active filters
  const filterSummary = [
    phase !== "all" && PHASES.find((p) => p.key === phase)?.label,
    events.length > 0 && events.join(" + "),
    subject === "batter" && bowlerType && BOWLER_TYPES.find((b) => b.key === bowlerType)?.label,
    subject === "bowler" && batterHand && BATTER_HANDS.find((b) => b.key === batterHand)?.label,
    opposition && `vs ${opposition}`,
    venue && `at ${venue}`,
    city && `in ${city}`,
    yearFrom && `since ${yearFrom}`,
    subject === "batter" && balls && `first ${balls} balls`,
  ].filter(Boolean);

  const SUBJECT_OPTIONS = [
    { key: "batter", label: "Batter" },
    { key: "bowler", label: "Bowler" },
    { key: "team",   label: "Team" },
  ];

  const groupByOptions = [
    { key: "none", label: "No grouping" },
    ...(subject === "batter" ? [{ key: "bowler_type", label: "By bowler type" }] : []),
    ...(subject === "bowler" ? [{ key: "batter_hand", label: "By batter hand" }] : []),
    ...(subject !== "team"   ? [{ key: "phase",       label: "By phase" }] : []),
  ];

  const teamOptions = [
    { key: "", label: "Any opposition" },
    ...teams.map((t) => ({ key: t, label: t })),
  ];

  const inningsOptions = [
    { key: "any",       label: "Any" },
    { key: "defending", label: "Batting first" },
    { key: "chasing",   label: "Chasing" },
  ];

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--txt)" }}>
            Advanced Stats
          </h1>
          <p className="text-sm" style={{ color: "var(--txt-3)" }}>
            Query batting, bowling and team stats with granular filters — phase, bowler type, opposition, venue, and more.
          </p>
        </div>

        {/* Query builder card */}
        <div
          className="rounded-2xl border p-6 sm:p-8 mb-6 space-y-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--txt-2)" }}>
              Analyse
            </label>
            <SegmentedControl
              options={SUBJECT_OPTIONS}
              value={subject}
              onChange={(v) => { setSubject(v); setResult(null); setGroupBy("none"); }}
            />
          </div>

          {/* Player / Team selector */}
          {subject === "team" ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>
                Team
              </label>
              <select
                value={team}
                onChange={(e) => { setTeam(e.target.value); setResult(null); }}
                className="w-full sm:w-80 rounded-xl px-3 py-2.5 text-sm border appearance-none cursor-pointer outline-none"
                style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt)" }}
              >
                <option value="">Select team…</option>
                {teams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          ) : (
            <div className="sm:w-96">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>
                {subject === "batter" ? "Batter" : "Bowler"}
              </label>
              <PlayerCombobox
                players={players}
                value={player}
                onChange={(v) => { setPlayer(v); setResult(null); }}
                placeholder={`Search ${subject}…`}
                loading={playersLoading}
              />
            </div>
          )}

          {/* Divider */}
          <div className="border-t" style={{ borderColor: "var(--border)" }} />

          {/* Filters grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Competitions */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--txt-3)" }}>
                Competitions
              </label>
              <div className="flex flex-wrap gap-2">
                {TOURNAMENTS.map((t) => (
                  <ToggleChip
                    key={t}
                    label={t}
                    active={events.includes(t)}
                    onClick={() => { toggleEvent(t); setResult(null); }}
                  />
                ))}
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--txt-3)" }}>
                {events.length === 0 ? "All competitions" : events.join(", ")}
              </p>
            </div>

            {/* Phase — not shown for team */}
            {subject !== "team" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--txt-3)" }}>
                  Phase
                </label>
                <div className="flex flex-wrap gap-2">
                  {PHASES.map((ph) => (
                    <ToggleChip
                      key={ph.key}
                      label={ph.label}
                      active={phase === ph.key}
                      onClick={() => { setPhase(ph.key); setResult(null); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Batter-only: vs Bowler Type */}
            {subject === "batter" && (
              <SelectField
                label="Vs Bowler Type"
                value={bowlerType}
                onChange={(v) => { setBowlerType(v); setResult(null); }}
                options={BOWLER_TYPES}
              />
            )}

            {/* Bowler-only: vs Batter Hand */}
            {subject === "bowler" && (
              <SelectField
                label="Vs Batter Hand"
                value={batterHand}
                onChange={(v) => { setBatterHand(v); setResult(null); }}
                options={BATTER_HANDS}
              />
            )}

            {/* Opposition */}
            <SelectField
              label={subject === "bowler" ? "Vs Opposition (batting)" : "Vs Opposition"}
              value={opposition}
              onChange={(v) => { setOpposition(v); setResult(null); }}
              options={teamOptions}
            />

            {/* Venue */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--txt-3)" }}>
                {subject === "team" ? "At Venue" : "At Venue"}
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => { setVenue(e.target.value); setResult(null); }}
                placeholder="e.g. Wankhede, Eden Gardens…"
                className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
                style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt)" }}
              />
            </div>

            {/* City — team mode only */}
            {subject === "team" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--txt-3)" }}>
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setResult(null); }}
                  placeholder="e.g. Chennai, Mumbai…"
                  className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
                  style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt)" }}
                />
              </div>
            )}

            {/* Since year */}
            <SelectField
              label="Since Year"
              value={yearFrom}
              onChange={(v) => { setYearFrom(v); setResult(null); }}
              options={YEAR_OPTIONS}
            />

            {/* Batter-only: first X balls */}
            {subject === "batter" && (
              <SelectField
                label="First X Balls of Innings"
                value={balls}
                onChange={(v) => { setBalls(v); setResult(null); }}
                options={BALLS_OPTIONS}
              />
            )}

            {/* Innings context — team mode only */}
            {subject === "team" && (
              <SelectField
                label="Innings"
                value={inningsFilter}
                onChange={(v) => { setInningsFilter(v); setResult(null); }}
                options={inningsOptions}
              />
            )}

            {/* Group by — batter + bowler only */}
            {subject !== "team" && (
              <SelectField
                label="Group By"
                value={groupBy}
                onChange={(v) => { setGroupBy(v); setResult(null); }}
                options={groupByOptions}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleRun}
              disabled={!canRun || loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {loading ? (
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
              )}
              {loading ? "Running…" : "Run Query"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-sm border transition-colors"
              style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-2xl border px-5 py-4 mb-5 text-sm"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "#ef4444" }}
          >
            Failed to run query: {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            {/* Result header */}
            <div className="flex flex-wrap items-baseline gap-2 mb-4">
              <span className="font-bold text-xl" style={{ color: "var(--accent)" }}>
                {subject === "team" ? team : playerName}
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--txt-3)" }}>
                {subject === "batter" ? "batting" : subject === "bowler" ? "bowling" : "team stats"}
              </span>
              {filterSummary.length > 0 && (
                <span className="text-sm" style={{ color: "var(--txt-3)" }}>
                  — {filterSummary.join(" · ")}
                </span>
              )}
            </div>

            {/* Grouped results */}
            {result.groups ? (
              result.groups.length === 0 ? (
                <div
                  className="rounded-2xl border p-10 text-center text-sm"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                >
                  No data found for any group with these filters.
                </div>
              ) : (
                <GroupTable groups={result.groups} mode={result.mode} />
              )
            ) : subject === "team" ? (
              <TeamStats stats={result} />
            ) : result.mode === "bowling" ? (
              (result.stats?.innings ?? 0) === 0 && (result.stats?.legal_balls ?? 0) === 0 ? (
                <div
                  className="rounded-2xl border p-10 text-center text-sm"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                >
                  No bowling data found with these filters.
                </div>
              ) : (
                <BowlerStats stats={result.stats} />
              )
            ) : (
              (result.stats?.innings ?? 0) === 0 ? (
                <div
                  className="rounded-2xl border p-10 text-center text-sm"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                >
                  No batting data found with these filters.
                </div>
              ) : (
                <BatterStats stats={result.stats} />
              )
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div
            className="rounded-2xl border p-14 text-center"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border"
              style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}
            >
              <svg width="24" height="24" fill="none" stroke="var(--accent)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="font-semibold mb-1" style={{ color: "var(--txt)" }}>
              Configure your query above
            </p>
            <p className="text-sm" style={{ color: "var(--txt-3)" }}>
              Select a player or team, apply any filters, then hit Run Query.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
