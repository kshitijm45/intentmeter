"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FeatureCard from "@/components/FeatureCard";

const features = [
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="#ea580c" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: "Player Profiles",
    description: "Career stats for 17,000+ T20 players. Batting and bowling breakdowns, season-by-season charts, and playing style context.",
    href: "/players/virat-kohli",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="#ea580c" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Player Comparison",
    description: "Side-by-side analysis of any two players. Radar charts across six key metrics, phase breakdowns, and a head-to-head stat table.",
    href: "/compare",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="#ea580c" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Matchup Analysis",
    description: "Ball-by-ball batter vs bowler records. Dismissal rates, scoring patterns, and shot distribution across every delivery faced.",
    href: "/matchup",
  },
  {
    icon: (
      <svg width="20" height="20" fill="none" stroke="#ea580c" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
    title: "Stats Explorer",
    description: "Multi-dimensional filtering by competition, phase, bowling style, venue, and opposition. Surface the exact insight you're hunting for.",
    href: "/explorer",
  },
];

const exampleQueries = [
  {
    question: "Jasprit Bumrah's economy in IPL powerplay overs",
    category: "Bowling",
    categoryColor: "#3b82f6",
    href: "/matchup",
  },
  {
    question: "Virat Kohli's strike rate vs leg spin in middle overs",
    category: "Batting",
    categoryColor: "#ea580c",
    href: "/compare",
  },
  {
    question: "Rohit Sharma vs Kagiso Rabada — head-to-head IPL record",
    category: "Matchup",
    categoryColor: "#a855f7",
    href: "/matchup",
  },
  {
    question: "Tim David's boundary % in IPL death overs",
    category: "Batting",
    categoryColor: "#ea580c",
    href: "/compare",
  },
  {
    question: "Rashid Khan's dot ball percentage in SA20",
    category: "Bowling",
    categoryColor: "#3b82f6",
    href: "/compare",
  },
  {
    question: "Suryakumar Yadav vs left-arm pace bowling",
    category: "Matchup",
    categoryColor: "#a855f7",
    href: "/matchup",
  },
];

const suggestedPlayers = ["Virat Kohli", "Rohit Sharma", "Jasprit Bumrah", "Suryakumar Yadav", "KL Rahul", "Rashid Khan"];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/players/${query.trim().toLowerCase().replace(/\s+/g, "-")}`);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-24 pb-28 text-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(ellipse, rgba(234,88,12,0.07) 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-7 border"
            style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
            T20 Cricket Analytics · IPL, SA20 &amp; T20I · 2017–2024
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6" style={{ color: "var(--txt)" }}>
            Decode{" "}
            <span style={{ color: "var(--accent)" }}>every intent</span>
            <br />
            behind every ball.
          </h1>

          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "var(--txt-2)" }}>
            Ball-by-ball T20 data across IPL, SA20, and international cricket. Matchup records, phase breakdowns, radar comparisons, and an AI assistant that speaks SQL.
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-4">
            <div
              className="flex items-center rounded-xl overflow-hidden shadow-lg border transition-colors"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <div className="pl-4 flex-shrink-0">
                <svg width="17" height="17" fill="none" stroke="var(--txt-3)" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any player… e.g. Virat Kohli"
                className="flex-1 bg-transparent px-3 py-4 text-sm outline-none placeholder-[var(--txt-3)]"
                style={{ color: "var(--txt)" }}
              />
              <button
                type="submit"
                className="m-1.5 px-5 py-2.5 font-semibold text-sm rounded-lg transition-colors duration-200 bg-orange-600 hover:bg-orange-500"
                style={{ color: "var(--accent-fg)" }}
              >
                Search
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2">
            {suggestedPlayers.map((p) => (
              <button
                key={p}
                onClick={() => router.push(`/players/${p.toLowerCase().replace(/\s+/g, "-")}`)}
                className="px-3 py-1 rounded-full text-xs transition-all duration-150 border"
                style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--txt)"; e.currentTarget.style.borderColor = "var(--accent-border)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--txt-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────────────── */}
      <section className="border-y" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "17,000+", label: "Players Tracked" },
              { value: "3",       label: "Competitions" },
              { value: "1M+",     label: "Balls Analysed" },
              { value: "8",       label: "Seasons of Data" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--txt)" }}>{s.value}</div>
                <div className="text-sm mt-1" style={{ color: "var(--txt-3)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Example queries ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--txt)" }}>
            Answer the questions that matter
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--txt-3)" }}>
            Phase-specific stats, bowler-type splits, venue records, head-to-heads — if it happened on a T20 pitch, you can ask it here.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {exampleQueries.map((q) => (
            <Link
              key={q.question}
              href={q.href}
              className="group flex items-start gap-4 rounded-xl p-5 border transition-all duration-200"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-border)"; e.currentTarget.style.background = "var(--bg-input)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card)"; }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${q.categoryColor}1a`, border: `1px solid ${q.categoryColor}35` }}
              >
                <svg width="13" height="13" fill="none" stroke={q.categoryColor} strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug mb-2.5" style={{ color: "var(--txt)" }}>
                  {q.question}
                </p>
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: `${q.categoryColor}1a`, color: q.categoryColor }}
                >
                  {q.category}
                </span>
              </div>
              <svg
                width="14" height="14" fill="none" stroke="var(--txt-3)" strokeWidth="2" viewBox="0 0 24 24"
                className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/assistant"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200"
            style={{ color: "var(--txt-3)" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--txt-3)"}
          >
            Ask any question via the AI assistant
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Feature cards ──────────────────────────────────────────────────── */}
      <section
        className="border-y"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--txt)" }}>
              Everything you need to analyse T20 cricket
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: "var(--txt-3)" }}>
              Four tools, one platform. From granular player data to AI-driven query results.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Assistant CTA ───────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div
          className="rounded-2xl border p-10 sm:p-14 text-center relative overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--accent-border)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(234,88,12,0.07) 0%, transparent 65%)" }}
          />
          <div className="relative">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6 border"
              style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}
            >
              <svg width="24" height="24" fill="none" stroke="#ea580c" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "var(--txt)" }}>
              Ask anything about cricket
            </h3>
            <p className="text-base max-w-md mx-auto mb-8" style={{ color: "var(--txt-3)" }}>
              A fine-tuned LLM trained on 230+ cricket SQL examples converts your plain English question into a live database query and returns the results instantly.
            </p>
            <a
              href="/assistant"
              className="inline-flex items-center gap-2 px-7 py-3 font-semibold rounded-xl text-sm transition-colors duration-200 bg-orange-600 hover:bg-orange-500"
              style={{ color: "var(--accent-fg)" }}
            >
              Try the AI Assistant
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
