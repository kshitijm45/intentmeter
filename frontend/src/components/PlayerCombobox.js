"use client";
import { useState, useEffect, useRef } from "react";

export default function PlayerCombobox({
  players = [],
  value,
  onChange,
  placeholder = "Select player…",
  loading = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selected = players.find((p) => p.unique_name === value) ?? null;

  // What to show inside the input field
  const inputValue = open
    ? query
    : selected
    ? `${selected.display_name}${selected.country ? ` · ${selected.country}` : ""}`
    : "";

  const filtered =
    query.trim() === ""
      ? players
      : players.filter(
          (p) =>
            p.display_name.toLowerCase().includes(query.toLowerCase()) ||
            (p.country && p.country.toLowerCase().includes(query.toLowerCase()))
        );

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.children[highlighted];
      if (item) item.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted, open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openDropdown = () => {
    setQuery("");
    setHighlighted(selected ? Math.max(0, players.indexOf(selected)) : 0);
    setOpen(true);
  };

  const select = (player) => {
    onChange(player.unique_name);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown") {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted]) select(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    } else if (e.key === "Tab") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger input */}
      <div
        className="flex items-center rounded-xl border transition-colors overflow-hidden"
        style={{
          background: "var(--bg-input)",
          borderColor: open ? "rgba(234,88,12,0.55)" : "var(--border)",
          boxShadow: open ? "0 0 0 3px rgba(234,88,12,0.08)" : "none",
        }}
      >
        {/* Search icon when open, person icon when closed */}
        <div className="pl-3 shrink-0" style={{ color: "var(--txt-3)" }}>
          {open ? (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          ) : (
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          placeholder={loading ? "Loading players…" : placeholder}
          disabled={loading}
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent px-3 py-3 text-sm outline-none disabled:opacity-50 min-w-0"
          style={{ color: "var(--txt)" }}
        />

        {/* Clear button */}
        {value && !open && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={clear}
            className="pr-1 transition-colors shrink-0"
            style={{ color: "var(--txt-3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--txt)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--txt-3)")}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Chevron */}
        <div
          className="pr-3 pl-1 shrink-0 transition-transform duration-200"
          style={{
            color: "var(--txt-3)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1.5 rounded-xl border shadow-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {/* Result count */}
          {query && (
            <div
              className="px-4 py-1.5 text-xs border-b"
              style={{ color: "var(--txt-3)", borderColor: "var(--border)" }}
            >
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </div>
          )}

          <ul ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-sm text-center" style={{ color: "var(--txt-3)" }}>
                No players match &ldquo;{query}&rdquo;
              </li>
            ) : (
              filtered.map((p, i) => {
                const isSelected = p.unique_name === value;
                const isHighlighted = i === highlighted;
                return (
                  <li
                    key={p.unique_name}
                    onMouseDown={() => select(p)}
                    onMouseEnter={() => setHighlighted(i)}
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none transition-colors"
                    style={{
                      background: isHighlighted ? "var(--accent-bg)" : "transparent",
                    }}
                  >
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: isSelected ? "var(--accent)" : "var(--txt)" }}
                    >
                      {p.display_name}
                    </span>
                    <span className="flex items-center gap-2 shrink-0 ml-3">
                      {p.country && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: "var(--bg-input)", color: "var(--txt-3)" }}
                        >
                          {p.country}
                        </span>
                      )}
                      {isSelected && (
                        <svg
                          width="13"
                          height="13"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
