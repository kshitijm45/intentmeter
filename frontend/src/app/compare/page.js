"use client";
import { useState, useEffect } from "react";
import PlayerCombobox from "@/components/PlayerCombobox";
import CompareRadarChart from "@/components/CompareRadarChart";
import CompareTable from "@/components/CompareTable";
import PhaseCard from "@/components/PhaseCard";

const API_BASE = "http://localhost:8000/api";

const TOURNAMENTS = ["IPL", "T20I", "SA20"];
const PHASES = [
  { key: "pp",     label: "Powerplay" },
  { key: "middle", label: "Middle Overs" },
  { key: "death",  label: "Death Overs" },
];
const P1_COLOR = "#ea580c";
const P2_COLOR = "#3b82f6";

// ─── Normalise a raw value into 0-100 for the radar chart ────────────────────
function norm(val, min, max, invert = false) {
  if (val == null || isNaN(val)) return 0;
  const pct = ((Math.max(min, Math.min(max, val)) - min) / (max - min)) * 100;
  return Math.round(invert ? 100 - pct : pct);
}

function fmt(val, decimals = 1) {
  if (val == null || isNaN(val)) return "–";
  return Number(val).toFixed(decimals);
}

// ─── Data builders (from real API result) ────────────────────────────────────
function buildRadarData(result, mode) {
  if (!result) return [];
  const o1 = result.player1[mode].overall;
  const o2 = result.player2[mode].overall;
  const phaseSr = (playerData) => {
    const vals = ["pp", "middle", "death"]
      .map((k) => playerData.phases?.[k]?.sr)
      .filter((v) => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : o1.sr;
  };
  if (mode === "batting") {
    const ps1 = phaseSr(result.player1[mode]);
    const ps2 = phaseSr(result.player2[mode]);
    return [
      { metric: "Average",     p1: norm(o1.avg,           0,  70),       p2: norm(o2.avg,           0,  70),       p1Raw: fmt(o1.avg),                    p2Raw: fmt(o2.avg) },
      { metric: "Strike Rate", p1: norm(o1.sr,           80, 220),       p2: norm(o2.sr,           80, 220),       p1Raw: fmt(o1.sr),                     p2Raw: fmt(o2.sr) },
      { metric: "Boundary %",  p1: norm(o1.boundary_pct, 20,  70),       p2: norm(o2.boundary_pct, 20,  70),       p1Raw: `${fmt(o1.boundary_pct)}%`,     p2Raw: `${fmt(o2.boundary_pct)}%` },
      { metric: "Dot Ball %",  p1: norm(o1.dot_ball_pct, 20,  60, true), p2: norm(o2.dot_ball_pct, 20,  60, true), p1Raw: `${fmt(o1.dot_ball_pct)}%`,     p2Raw: `${fmt(o2.dot_ball_pct)}%` },
      { metric: "Balls/Bdy",   p1: norm(o1.balls_per_bdy, 4,  15, true), p2: norm(o2.balls_per_bdy, 4,  15, true), p1Raw: fmt(o1.balls_per_bdy),          p2Raw: fmt(o2.balls_per_bdy) },
      { metric: "Phase SR",    p1: norm(ps1, 80, 200),                    p2: norm(ps2, 80, 200),                    p1Raw: fmt(ps1),                       p2Raw: fmt(ps2) },
    ];
  }
  return [
    { metric: "Economy",     p1: norm(o1.economy,             5, 13, true), p2: norm(o2.economy,             5, 13, true), p1Raw: fmt(o1.economy, 2),               p2Raw: fmt(o2.economy, 2) },
    { metric: "Average",     p1: norm(o1.avg,                10, 55, true), p2: norm(o2.avg,                10, 55, true), p1Raw: fmt(o1.avg),                      p2Raw: fmt(o2.avg) },
    { metric: "Strike Rate", p1: norm(o1.bowling_sr,          8, 40, true), p2: norm(o2.bowling_sr,          8, 40, true), p1Raw: fmt(o1.bowling_sr),               p2Raw: fmt(o2.bowling_sr) },
    { metric: "Dot Ball %",  p1: norm(o1.dot_ball_pct,       20, 65),       p2: norm(o2.dot_ball_pct,       20, 65),       p1Raw: `${fmt(o1.dot_ball_pct)}%`,       p2Raw: `${fmt(o2.dot_ball_pct)}%` },
    { metric: "Bdy Given %", p1: norm(o1.boundary_given_pct,  5, 25, true), p2: norm(o2.boundary_given_pct,  5, 25, true), p1Raw: `${fmt(o1.boundary_given_pct)}%`, p2Raw: `${fmt(o2.boundary_given_pct)}%` },
    { metric: "Wkts/Inn",    p1: norm(o1.wkts_per_innings,    0,  3),       p2: norm(o2.wkts_per_innings,    0,  3),       p1Raw: fmt(o1.wkts_per_innings, 2),      p2Raw: fmt(o2.wkts_per_innings, 2) },
  ];
}

function buildTableRows(result, mode, activePhaseKeys) {
  if (!result) return [];
  const o1 = result.player1[mode].overall;
  const o2 = result.player2[mode].overall;
  const ph1 = result.player1[mode].phases;
  const ph2 = result.player2[mode].phases;
  const phaseLabel = { pp: "Powerplay", middle: "Middle Overs", death: "Death Overs" };

  if (mode === "batting") {
    const phaseRows = activePhaseKeys.map((k) => ({
      metric: `${phaseLabel[k]} SR`,
      p1: fmt(ph1[k]?.sr), p2: fmt(ph2[k]?.sr),
    }));
    return [
      { metric: "Average",          p1: fmt(o1.avg),                   p2: fmt(o2.avg) },
      { metric: "Strike Rate",      p1: fmt(o1.sr),                    p2: fmt(o2.sr) },
      { metric: "Boundary %",       p1: `${fmt(o1.boundary_pct)}%`,    p2: `${fmt(o2.boundary_pct)}%` },
      { metric: "Dot Ball %",       p1: `${fmt(o1.dot_ball_pct)}%`,    p2: `${fmt(o2.dot_ball_pct)}%`,   lowerIsBetter: true },
      { metric: "Balls / Boundary", p1: fmt(o1.balls_per_bdy),         p2: fmt(o2.balls_per_bdy),        lowerIsBetter: true },
      ...(phaseRows.length > 1 ? [{ divider: true, label: "Phase Breakdown" }, ...phaseRows] : []),
    ];
  }
  const phaseRows = activePhaseKeys.map((k) => ({
    metric: `${phaseLabel[k]} Economy`,
    p1: fmt(ph1[k]?.economy), p2: fmt(ph2[k]?.economy), lowerIsBetter: true,
  }));
  return [
    { metric: "Economy",          p1: fmt(o1.economy),                   p2: fmt(o2.economy),                   lowerIsBetter: true },
    { metric: "Average",          p1: fmt(o1.avg),                       p2: fmt(o2.avg),                       lowerIsBetter: true },
    { metric: "Strike Rate",      p1: fmt(o1.bowling_sr),                p2: fmt(o2.bowling_sr),                lowerIsBetter: true },
    { metric: "Dot Ball %",       p1: `${fmt(o1.dot_ball_pct)}%`,        p2: `${fmt(o2.dot_ball_pct)}%` },
    { metric: "Boundary Given %", p1: `${fmt(o1.boundary_given_pct)}%`,  p2: `${fmt(o2.boundary_given_pct)}%`,  lowerIsBetter: true },
    { metric: "Wkts / Innings",   p1: fmt(o1.wkts_per_innings, 2),       p2: fmt(o2.wkts_per_innings, 2) },
    ...(phaseRows.length > 1 ? [{ divider: true, label: "Phase Breakdown" }, ...phaseRows] : []),
  ];
}

function buildPhaseCards(result, mode, activePhaseKeys) {
  if (!result) return [];
  const ph1 = result.player1[mode].phases;
  const ph2 = result.player2[mode].phases;
  const phaseLabel = { pp: "Powerplay", middle: "Middle Overs", death: "Death Overs" };
  return activePhaseKeys.map((k) => ({
    phase: phaseLabel[k],
    stats: mode === "batting"
      ? [
          { label: "Strike Rate", p1: ph1[k]?.sr ?? 0,            p2: ph2[k]?.sr ?? 0 },
          { label: "Boundary %",  p1: ph1[k]?.boundary_pct ?? 0,  p2: ph2[k]?.boundary_pct ?? 0 },
          { label: "Dot Ball %",  p1: ph1[k]?.dot_ball_pct ?? 0,  p2: ph2[k]?.dot_ball_pct ?? 0,  lowerIsBetter: true },
        ]
      : [
          { label: "Economy",    p1: ph1[k]?.economy ?? 0,          p2: ph2[k]?.economy ?? 0,          lowerIsBetter: true },
          { label: "Dot Ball %", p1: ph1[k]?.dot_ball_pct ?? 0,     p2: ph2[k]?.dot_ball_pct ?? 0 },
          { label: "Wkts/Inn",   p1: ph1[k]?.wkts_per_innings ?? 0, p2: ph2[k]?.wkts_per_innings ?? 0 },
        ],
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersError, setPlayersError] = useState(null);

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [tournaments, setTournaments] = useState(["IPL", "T20I", "SA20"]);
  const [phases, setPhases] = useState(["pp", "middle", "death"]);
  const [mode, setMode] = useState("batting");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/players`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setPlayers(data);
        setPlayersLoading(false);
      })
      .catch((err) => {
        setPlayersError(err.message);
        setPlayersLoading(false);
      });
  }, []);

  const toggleTournament = (t) => {
    setTournaments((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
    setResult(null);
  };

  const togglePhase = (pk) =>
    setPhases((prev) => prev.includes(pk) ? prev.filter((x) => x !== pk) : [...prev, pk]);

  // Keep phases in canonical order
  const phasesSorted = PHASES.map((p) => p.key).filter((k) => phases.includes(k));

  const p1Name = players.find((p) => p.unique_name === p1)?.display_name ?? "Player 1";
  const p2Name = players.find((p) => p.unique_name === p2)?.display_name ?? "Player 2";
  const canAnalyse = p1 && p2 && p1 !== p2 && tournaments.length > 0 && !loading;

  const handleAnalyse = async () => {
    if (!canAnalyse) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({ player1: p1, player2: p2 });
      tournaments.forEach((t) => params.append("events", t));
      const res = await fetch(`${API_BASE}/comparison?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const radarData  = buildRadarData(result, mode);
  const tableRows  = buildTableRows(result, mode, phasesSorted);
  const phaseCards = buildPhaseCards(result, mode, phasesSorted);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: "var(--txt)" }}>Player Comparison</h1>
          <p className="text-sm" style={{ color: "var(--txt-3)" }}>Compare two players head-to-head across batting and bowling metrics.</p>
        </div>

        {/* ── Controls card ─────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl border p-6 sm:p-8 mb-8 space-y-6"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {/* Player selectors */}
          {playersError && (
            <p className="text-red-400 text-sm">Failed to load players: {playersError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: P1_COLOR }}>
                Player 1
              </label>
              <PlayerCombobox
                players={players}
                value={p1}
                onChange={(v) => { setP1(v); setResult(null); }}
                placeholder="Search player 1…"
                loading={playersLoading}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: P2_COLOR }}>
                Player 2
              </label>
              <PlayerCombobox
                players={players}
                value={p2}
                onChange={(v) => { setP2(v); setResult(null); }}
                placeholder="Search player 2…"
                loading={playersLoading}
              />
            </div>
          </div>

          {/* Same-player warning */}
          {p1 && p2 && p1 === p2 && (
            <p className="text-red-400 text-xs -mt-2">Please select two different players.</p>
          )}

          {/* Tournaments */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--txt-2)" }}>
              Include Tournaments
            </label>
            <div className="flex flex-wrap gap-3">
              {TOURNAMENTS.map((t) => {
                const active = tournaments.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { toggleTournament(t); setResult(null); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150"
                    style={
                      active
                        ? { background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent)" }
                        : { background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }
                    }
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center border flex-shrink-0"
                      style={
                        active
                          ? { background: "var(--accent)", borderColor: "var(--accent)" }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      {active && (
                        <svg width="10" height="10" fill="none" stroke="var(--accent-fg)" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {t}
                  </button>
                );
              })}
            </div>
            {tournaments.length === 0 && (
              <p className="text-red-400 text-xs mt-2">Select at least one tournament.</p>
            )}
          </div>

          {/* Phases */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--txt-2)" }}>
              Include Phases
            </label>
            <div className="flex flex-wrap gap-3">
              {PHASES.map(({ key, label }) => {
                const active = phases.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePhase(key)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150"
                    style={
                      active
                        ? { background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent)" }
                        : { background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }
                    }
                  >
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center border flex-shrink-0"
                      style={
                        active
                          ? { background: "var(--accent)", borderColor: "var(--accent)" }
                          : { borderColor: "var(--border)" }
                      }
                    >
                      {active && (
                        <svg width="10" height="10" fill="none" stroke="var(--accent-fg)" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode toggle + Analyse */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div
              className="inline-flex rounded-xl p-1 border gap-1"
              style={{ background: "var(--bg-input)", borderColor: "var(--border)" }}
            >
              {["batting", "bowling"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-150"
                  style={
                    mode === m
                      ? { background: "var(--accent)", color: "var(--accent-fg)", boxShadow: "0 1px 4px rgba(234,88,12,0.25)" }
                      : { background: "transparent", color: "var(--txt-3)" }
                  }
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAnalyse}
              disabled={!canAnalyse}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {loading ? (
                <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
              )}
              {loading ? "Analysing…" : "Analyse"}
            </button>
          </div>
        </div>

        {/* ── Results ───────────────────────────────────────────────────────── */}
        {error && (
          <div
            className="rounded-2xl border px-5 py-4 mb-5 text-red-400 text-sm"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            Error: {error}
          </div>
        )}

        {result ? (
          <>
            {/* Result header */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="font-bold text-xl" style={{ color: P1_COLOR }}>{p1Name}</span>
              <span className="text-sm font-medium" style={{ color: "var(--txt-3)" }}>vs</span>
              <span className="font-bold text-xl" style={{ color: P2_COLOR }}>{p2Name}</span>
              <span
                className="ml-1 px-3 py-1 rounded-full text-xs font-semibold capitalize border"
                style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent)" }}
              >
                {mode}
              </span>
              {tournaments.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-full text-xs border"
                  style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                >
                  {t}
                </span>
              ))}
              {phasesSorted.map((k) => (
                <span
                  key={k}
                  className="px-2 py-0.5 rounded-full text-xs border"
                  style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                >
                  {PHASES.find((p) => p.key === k)?.label}
                </span>
              ))}
            </div>

            {/* Inline mode switcher */}
            <div className="flex justify-end mb-5">
              <div
                className="inline-flex rounded-xl p-1 border gap-1"
                style={{ background: "var(--bg-input)", borderColor: "var(--border)" }}
              >
                {["batting", "bowling"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-150"
                    style={
                      mode === m
                        ? { background: "var(--accent)", color: "var(--accent-fg)" }
                        : { background: "transparent", color: "var(--txt-3)" }
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Radar chart card */}
            <div
              className="rounded-2xl border p-5 mb-5"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <CompareRadarChart data={radarData} p1Name={p1Name} p2Name={p2Name} />
            </div>

            {/* Stat table card */}
            <div
              className="rounded-2xl border mb-5 overflow-hidden"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div
                className="px-5 py-4 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <h2 className="font-semibold" style={{ color: "var(--txt)" }}>Head-to-Head Stats</h2>
              </div>
              <CompareTable rows={tableRows} p1Name={p1Name} p2Name={p2Name} />
            </div>

            {/* Phase cards — only when 2+ phases are selected (single phase = the overall breakdown is already the phase) */}
            {phasesSorted.length >= 2 && (
              <div className="mb-2">
                <h2 className="font-semibold mb-4" style={{ color: "var(--txt)" }}>Phase Breakdown</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {phaseCards.map((ph) => (
                    <PhaseCard
                      key={ph.phase}
                      phase={ph.phase}
                      p1Name={p1Name}
                      p2Name={p2Name}
                      stats={ph.stats}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty / loading state */
          <div
            className="rounded-2xl border p-16 text-center"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            {loading ? (
              <>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border"
                  style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}
                >
                  <svg className="animate-spin" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeOpacity="0.25" strokeWidth="4" />
                    <path fill="var(--accent)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                </div>
                <p className="font-semibold" style={{ color: "var(--txt)" }}>Analysing…</p>
                <p className="text-sm mt-1" style={{ color: "var(--txt-3)" }}>Fetching stats from the database.</p>
              </>
            ) : (
              <>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border"
                  style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}
                >
                  <svg width="24" height="24" fill="none" stroke="var(--accent)" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="font-semibold" style={{ color: "var(--txt)" }}>Select two players and click Analyse</p>
                <p className="text-sm mt-1" style={{ color: "var(--txt-3)" }}>
                  {!p1 && !p2
                    ? "Choose a player in each slot above to get started."
                    : !p1
                    ? "Select Player 1 to continue."
                    : !p2
                    ? "Select Player 2 to continue."
                    : p1 === p2
                    ? "Please select two different players."
                    : "Hit Analyse to generate the comparison."}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
