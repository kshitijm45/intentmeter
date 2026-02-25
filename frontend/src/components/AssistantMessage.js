"use client";
import { useState } from "react";

function SQLBlock({ sql }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="mt-3 rounded-xl overflow-hidden border"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors"
        style={{ color: "var(--txt-3)" }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--txt)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--txt-3)"}
      >
        <span className="flex items-center gap-2">
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          SQL Query
        </span>
        <svg
          width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <pre
          className="px-4 py-3 text-xs font-mono overflow-x-auto border-t leading-relaxed"
          style={{ color: "var(--accent)", borderColor: "var(--border)" }}
        >
          {sql}
        </pre>
      )}
    </div>
  );
}

function ResultsTable({ columns, rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ background: "var(--bg-input)", borderColor: "var(--border)" }}>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: "var(--txt-3)" }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-b transition-colors"
                style={{ borderColor: "var(--border)" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-input)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--txt-2)" }}>
                    {row[col]}
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

export default function AssistantMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border"
        style={
          isUser
            ? { background: "var(--accent-bg)", borderColor: "var(--accent-border)", color: "var(--accent)" }
            : { background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }
        }
      >
        {isUser ? "U" : "AI"}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed border"
          style={
            isUser
              ? {
                  background: "var(--accent-bg)",
                  borderColor: "var(--accent-border)",
                  color: "var(--txt)",
                  borderTopRightRadius: "4px",
                }
              : {
                  background: "var(--bg-card)",
                  borderColor: "var(--border)",
                  color: "var(--txt)",
                  borderTopLeftRadius: "4px",
                }
          }
        >
          {message.content}
        </div>
        {message.sql     && <SQLBlock sql={message.sql} />}
        {message.results && <ResultsTable columns={message.results.columns} rows={message.results.rows} />}
      </div>
    </div>
  );
}
