"use client";
import { useState, useEffect } from "react";
import PlayerCombobox from "@/components/PlayerCombobox";

const API_BASE = "http://localhost:8000/api";
const TOURNAMENTS = ["IPL", "T20I", "SA20"];

export default function MatchupPage() {
  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [playersError, setPlayersError] = useState(null);

  const [batter, setBatter] = useState("");
  const [bowler, setBowler] = useState("");
  const [selectedTournaments, setSelectedTournaments] = useState(["IPL", "T20I", "SA20"]);

  const [result, setResult] = useState(null);   // null = not yet queried, false = no data, object = data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch players list from backend on mount
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

  const toggleTournament = (t) =>
    setSelectedTournaments((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!batter || !bowler || selectedTournaments.length === 0) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const params = new URLSearchParams({ batter, bowler });
      selectedTournaments.forEach((t) => params.append("events", t));

      const res = await fetch(`${API_BASE}/matchup?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.message || data.innings == null) {
        setResult(false);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper: get display name for a unique_name
  const displayName = (uniqueName) =>
    players.find((p) => p.unique_name === uniqueName)?.display_name ?? uniqueName;

  const canSubmit = batter && bowler && selectedTournaments.length > 0 && !loading;

  const statsCards = result && result !== false ? [
    { label: "Innings",     value: result.innings     ?? "—" },
    { label: "Balls Faced", value: result.balls_faced ?? "—" },
    { label: "Runs",        value: result.runs        ?? "—" },
    { label: "Dismissals",  value: result.dismissals  ?? "—" },
    { label: "Average",     value: result.batting_avg ?? "—" },
    { label: "Strike Rate", value: result.batter_sr   ?? "—" },
    { label: "Dot Ball %",  value: result.dot_ball_pct != null ? `${result.dot_ball_pct}%` : "—" },
    { label: "Boundary %",  value: result.boundary_pct != null ? `${result.boundary_pct}%` : "—" },
  ] : [];

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--txt)] mb-2">Matchup Analysis</h1>
          <p className="text-[var(--txt-3)] text-sm">Select a batter, a bowler and the competitions you want included, then hit Analyse.</p>
        </div>

        {/* Query form */}
        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl p-6 sm:p-8 mb-8 space-y-6 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>

            {/* Players error banner */}
            {playersError && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                Could not load players from backend ({playersError}). Make sure the API server is running on port 8000.
              </div>
            )}

            {/* Dropdowns row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Batter */}
              <div>
                <label className="block text-orange-600 text-xs font-semibold uppercase tracking-wider mb-2">
                  Batter
                </label>
                <PlayerCombobox
                  players={players}
                  value={batter}
                  onChange={setBatter}
                  placeholder="Search batter…"
                  loading={playersLoading}
                />
              </div>

              {/* Bowler */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--p2)" }}>
                  Bowler
                </label>
                <PlayerCombobox
                  players={players}
                  value={bowler}
                  onChange={setBowler}
                  placeholder="Search bowler…"
                  loading={playersLoading}
                />
              </div>
            </div>

            {/* Tournaments */}
            <div>
              <label className="block text-[var(--txt-2)] text-xs font-semibold uppercase tracking-wider mb-3">
                Include Tournaments
              </label>
              <div className="flex flex-wrap gap-3">
                {TOURNAMENTS.map((t) => {
                  const active = selectedTournaments.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTournament(t)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150"
                      style={active ? {
                        background: "var(--accent-bg)",
                        borderColor: "var(--accent-border)",
                        color: "var(--accent)",
                      } : {
                        background: "var(--bg-input)",
                        borderColor: "var(--border)",
                        color: "var(--txt-3)",
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors"
                        style={active
                          ? { background: "var(--accent)", borderColor: "var(--accent)" }
                          : { borderColor: "var(--border)" }}
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
              {selectedTournaments.length === 0 && (
                <p className="text-red-400 text-xs mt-2">Select at least one tournament.</p>
              )}
            </div>

            {/* Submit */}
            <div className="flex items-center gap-4 pt-1">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-[var(--accent-fg)] font-semibold rounded-xl text-sm transition-colors duration-200"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    Analysing…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                    </svg>
                    Analyse Matchup
                  </>
                )}
              </button>
              {batter && bowler && (
                <span className="text-[var(--txt-3)] text-sm">
                  <span className="text-orange-600">{displayName(batter)}</span>
                  <span className="mx-2">vs</span>
                  <span style={{ color: "var(--p2)" }}>{displayName(bowler)}</span>
                </span>
              )}
            </div>
          </div>
        </form>

        {/* API error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            Failed to fetch matchup data: {error}
          </div>
        )}

        {/* No data */}
        {result === false && (
          <div className="rounded-2xl p-12 text-center border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--bg-input)" }}>
              <svg width="20" height="20" fill="none" stroke="var(--txt-3)" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-[var(--txt-2)] text-sm font-medium">No matchup data found</p>
            <p className="text-[var(--txt-3)] text-xs mt-1">These two players may not have faced each other in the database.</p>
          </div>
        )}

        {/* Results */}
        {result && result !== false && (
          <>
            {/* Result header */}
            <div className="rounded-2xl p-6 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div>
                <h2 className="text-[var(--txt)] font-bold text-xl">
                  <span className="text-orange-600">{displayName(batter)}</span>
                  <span className="text-[var(--txt-3)] mx-3">vs</span>
                  <span style={{ color: "var(--p2)" }}>{displayName(bowler)}</span>
                </h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTournaments.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-orange-600 text-xs font-medium border" style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right text-sm text-[var(--txt-3)]">
                <span className="text-[var(--txt)] font-semibold text-lg">{result.innings ?? "—"}</span>{" "}
                innings
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {statsCards.map((s) => (
                <div key={s.label} className="rounded-xl p-4 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="text-[var(--txt-3)] text-xs uppercase tracking-wider mb-1">{s.label}</div>
                  <div className="text-[var(--txt)] font-bold text-xl">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Ball-type breakdown */}
            {(result.fours != null || result.sixes != null) && (
              <div className="rounded-2xl p-6 mb-5 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h3 className="text-[var(--txt)] font-semibold text-sm mb-4">Shot Distribution</h3>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                  {[
                    { label: "Dots",  value: result.dot_balls },
                    { label: "1s",    value: result.ones },
                    { label: "2s",    value: result.twos },
                    { label: "3s",    value: result.threes },
                    { label: "4s",    value: result.fours,  accent: true },
                    { label: "5s",    value: result.fives },
                    { label: "6s",    value: result.sixes,  accent: true },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className={`text-lg font-bold ${s.accent ? "text-orange-600" : "text-[var(--txt)]"}`}>{s.value ?? "—"}</div>
                      <div className="text-[var(--txt-3)] text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}