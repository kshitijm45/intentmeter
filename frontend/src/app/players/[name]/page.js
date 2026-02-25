"use client";
import { useState } from "react";
import { use } from "react";
import StatCard from "@/components/StatCard";
import SeasonBarChart from "@/components/SeasonBarChart";

const mockPlayers = {
  "virat-kohli": {
    name: "Virat Kohli",
    country: "India",
    role: "Batsman",
    battingStyle: "Right-hand bat",
    bowlingStyle: "Right-arm medium",
    batting: {
      stats: [
        { label: "Matches",     value: "237",   sub: "T20 career" },
        { label: "Runs",        value: "8,167", sub: "Total runs",   highlight: true },
        { label: "Average",     value: "52.73", sub: "Batting avg" },
        { label: "Strike Rate", value: "139.6", sub: "Career SR" },
        { label: "50s / 100s",  value: "71 / 1", sub: "Milestones" },
        { label: "Highest",     value: "122*",  sub: "Best innings" },
      ],
      seasons: [
        { season: "2017", runs: 308 },
        { season: "2018", runs: 530 },
        { season: "2019", runs: 464 },
        { season: "2020", runs: 466 },
        { season: "2021", runs: 405 },
        { season: "2022", runs: 341 },
        { season: "2023", runs: 639 },
        { season: "2024", runs: 741 },
      ],
    },
    bowling: {
      stats: [
        { label: "Matches",  value: "237",   sub: "T20 career" },
        { label: "Wickets",  value: "4",     sub: "Career wickets", highlight: true },
        { label: "Economy",  value: "8.62",  sub: "Runs per over" },
        { label: "Average",  value: "86.25", sub: "Bowling avg" },
        { label: "Best",     value: "1/13",  sub: "Best figures" },
        { label: "Overs",    value: "18.2",  sub: "Total overs" },
      ],
      seasons: [
        { season: "2017", wickets: 0 },
        { season: "2018", wickets: 0 },
        { season: "2019", wickets: 1 },
        { season: "2020", wickets: 0 },
        { season: "2021", wickets: 1 },
        { season: "2022", wickets: 1 },
        { season: "2023", wickets: 1 },
        { season: "2024", wickets: 0 },
      ],
    },
  },
  "rohit-sharma": {
    name: "Rohit Sharma",
    country: "India",
    role: "Batsman / Captain",
    battingStyle: "Right-hand bat",
    bowlingStyle: "Right-arm off-break",
    batting: {
      stats: [
        { label: "Matches",     value: "159",   sub: "T20I career" },
        { label: "Runs",        value: "4,231", sub: "Total runs",   highlight: true },
        { label: "Average",     value: "32.05", sub: "Batting avg" },
        { label: "Strike Rate", value: "140.9", sub: "Career SR" },
        { label: "50s / 100s",  value: "26 / 4", sub: "Milestones" },
        { label: "Highest",     value: "118",   sub: "Best innings" },
      ],
      seasons: [
        { season: "2017", runs: 333 },
        { season: "2018", runs: 394 },
        { season: "2019", runs: 397 },
        { season: "2020", runs: 480 },
        { season: "2021", runs: 381 },
        { season: "2022", runs: 268 },
        { season: "2023", runs: 531 },
        { season: "2024", runs: 447 },
      ],
    },
    bowling: {
      stats: [
        { label: "Matches",  value: "159",  sub: "T20I career" },
        { label: "Wickets",  value: "15",   sub: "Career wickets", highlight: true },
        { label: "Economy",  value: "8.11", sub: "Runs per over" },
        { label: "Average",  value: "28.93", sub: "Bowling avg" },
        { label: "Best",     value: "4/2",  sub: "Best figures" },
        { label: "Overs",    value: "53.2", sub: "Total overs" },
      ],
      seasons: [
        { season: "2017", wickets: 2 },
        { season: "2018", wickets: 3 },
        { season: "2019", wickets: 4 },
        { season: "2020", wickets: 1 },
        { season: "2021", wickets: 2 },
        { season: "2022", wickets: 1 },
        { season: "2023", wickets: 2 },
        { season: "2024", wickets: 0 },
      ],
    },
  },
};

const defaultPlayer = {
  name: "Unknown Player",
  country: "—",
  role: "—",
  battingStyle: "—",
  bowlingStyle: "—",
  batting: {
    stats: [
      { label: "Matches",     value: "—" },
      { label: "Runs",        value: "—" },
      { label: "Average",     value: "—" },
      { label: "Strike Rate", value: "—" },
      { label: "50s / 100s",  value: "—" },
      { label: "Highest",     value: "—" },
    ],
    seasons: [],
  },
  bowling: {
    stats: [
      { label: "Matches",  value: "—" },
      { label: "Wickets",  value: "—" },
      { label: "Economy",  value: "—" },
      { label: "Average",  value: "—" },
      { label: "Best",     value: "—" },
      { label: "Overs",    value: "—" },
    ],
    seasons: [],
  },
};

export default function PlayerProfilePage({ params }) {
  const { name }   = use(params);
  const player     = mockPlayers[name] || { ...defaultPlayer, name: name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) };
  const [tab, setTab] = useState("batting");
  const current    = player[tab];
  const initials   = player.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-8 py-10" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto">

        {/* ── Player header ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 border-2"
            style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}
          >
            <span className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{initials}</span>
          </div>

          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--txt)" }}>{player.name}</h1>
            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border"
                style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
              >
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                </svg>
                {player.country}
              </span>
              <span
                className="px-2.5 py-1 rounded-lg text-xs border font-medium"
                style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent)" }}
              >
                {player.role}
              </span>
              <span
                className="px-2.5 py-1 rounded-lg text-xs border"
                style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
              >
                {player.battingStyle}
              </span>
              <span
                className="px-2.5 py-1 rounded-lg text-xs border"
                style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
              >
                {player.bowlingStyle}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <div
          className="inline-flex rounded-xl p-1 border gap-1 mb-6"
          style={{ background: "var(--bg-input)", borderColor: "var(--border)" }}
        >
          {["batting", "bowling"].map((t) => (
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
              {t} Stats
            </button>
          ))}
        </div>

        {/* ── Stats grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {current.stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* ── Season chart ───────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 border"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <h2 className="font-semibold mb-6" style={{ color: "var(--txt)" }}>
            {tab === "batting" ? "Runs by Season" : "Wickets by Season"}
          </h2>
          {current.seasons.length > 0 ? (
            <SeasonBarChart
              data={current.seasons}
              dataKey={tab === "batting" ? "runs" : "wickets"}
              label={tab === "batting" ? "Runs" : "Wickets"}
            />
          ) : (
            <div className="h-60 flex items-center justify-center text-sm" style={{ color: "var(--txt-3)" }}>
              No season data available
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
