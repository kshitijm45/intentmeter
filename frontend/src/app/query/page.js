"use client";
import { useState, useRef } from "react";
import API_BASE from "@/lib/api";

const EXAMPLES = [
  "SELECT * FROM matches ORDER BY date DESC LIMIT 10",
  "SELECT batter, COUNT(*) AS balls, SUM(runs_batter) AS runs, ROUND(SUM(runs_batter)*100.0/COUNT(*),2) AS sr FROM deliveries WHERE extras_type != 'wides' OR extras_type IS NULL GROUP BY batter ORDER BY runs DESC LIMIT 20",
  "SELECT event_name, season, COUNT(DISTINCT match_id) AS matches FROM matches GROUP BY event_name, season ORDER BY season DESC",
];

export default function QueryPage() {
  const [sql, setSql] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(null);
  const textareaRef = useRef(null);

  async function runQuery() {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const t0 = performance.now();
    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Query failed");
      setResult(data);
      setElapsed(((performance.now() - t0) / 1000).toFixed(2));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
    // Tab → insert 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const el = textareaRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = sql.substring(0, start) + "  " + sql.substring(end);
      setSql(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--txt)", padding: "2rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            SQL Query Runner
          </h1>
          <p style={{ color: "var(--txt-2)", fontSize: "0.85rem" }}>
            Read-only · max 500 rows · <kbd style={{ background: "var(--bg-input)", padding: "1px 5px", borderRadius: 4, fontSize: "0.8rem", border: "1px solid var(--border)" }}>⌘ Enter</kbd> to run
          </p>
        </div>

        {/* Examples */}
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setSql(ex)}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: "0.75rem",
                color: "var(--txt-2)",
                cursor: "pointer",
              }}
            >
              Example {i + 1}
            </button>
          ))}
        </div>

        {/* Editor */}
        <textarea
          ref={textareaRef}
          value={sql}
          onChange={e => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="SELECT ..."
          spellCheck={false}
          rows={8}
          style={{
            width: "100%",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.875rem 1rem",
            color: "var(--txt)",
            fontSize: "0.875rem",
            fontFamily: "var(--font-geist-mono, monospace)",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Run button */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.75rem" }}>
          <button
            onClick={runQuery}
            disabled={loading || !sql.trim()}
            style={{
              background: loading ? "var(--bg-input)" : "#ea580c",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              padding: "0.5rem 1.4rem",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Running…" : "Run Query"}
          </button>
          {result && (
            <span style={{ color: "var(--txt-2)", fontSize: "0.82rem" }}>
              {result.count} row{result.count !== 1 ? "s" : ""} · {elapsed}s
              {result.count === 500 && (
                <span style={{ color: "#f59e0b", marginLeft: "0.4rem" }}>
                  (capped at 500)
                </span>
              )}
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: "1rem",
            background: "#7f1d1d22",
            border: "1px solid #ef444455",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            color: "#f87171",
            fontFamily: "var(--font-geist-mono, monospace)",
            fontSize: "0.83rem",
          }}>
            {error}
          </div>
        )}

        {/* Results table */}
        {result && result.columns.length > 0 && (
          <div style={{
            marginTop: "1.25rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "auto",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {result.columns.map(col => (
                    <th
                      key={col}
                      style={{
                        padding: "0.6rem 0.9rem",
                        textAlign: "left",
                        color: "var(--txt-2)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        background: "var(--bg-input)",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--bg-input)" }}
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        style={{
                          padding: "0.5rem 0.9rem",
                          color: "var(--txt)",
                          whiteSpace: "nowrap",
                          fontFamily: typeof cell === "number" ? "var(--font-geist-mono, monospace)" : "inherit",
                        }}
                      >
                        {cell === null ? <span style={{ color: "var(--txt-3)" }}>NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && result.columns.length === 0 && (
          <p style={{ marginTop: "1rem", color: "var(--txt-2)", fontSize: "0.85rem" }}>
            Query executed — no rows returned.
          </p>
        )}
      </div>
    </div>
  );
}
