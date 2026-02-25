"use client";
import { useState, useRef, useEffect } from "react";
import AssistantMessage from "@/components/AssistantMessage";

const suggestions = [
  "Virat Kohli batting average vs off spinners in T20Is?",
  "Jasprit Bumrah economy in death overs in IPL?",
  "Rohit Sharma strike rate vs leg spinners in powerplay IPL?",
  "India vs Pakistan head to head in T20Is?",
  "Mumbai Indians win percentage at Wankhede in IPL?",
  "Tilak Varma dot ball percentage vs left arm pace in IPL?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi! I'm the Intentmeter AI assistant. Ask me anything about cricket — I'll convert your question into a SQL query and fetch the results from the database. Try one of the suggestions below.",
    },
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const query = (text || input).trim();
    if (!query) return;
    setInput("");

    const userMsg = { id: Date.now(), role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res  = await fetch("http://localhost:8000/api/assistant", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: query }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id:      Date.now() + 1,
            role:    "assistant",
            content: `Sorry, I ran into an issue: ${data.error}`,
            sql:     data.sql || null,
          },
        ]);
      } else {
        const hasRows = data.rows && data.rows.length > 0;
        setMessages((prev) => [
          ...prev,
          {
            id:      Date.now() + 1,
            role:    "assistant",
            content: hasRows
              ? `Here are the results for your query:`
              : "The query ran successfully but returned no data. Try broadening your criteria.",
            sql:     data.sql,
            results: hasRows ? { columns: data.columns, rows: data.rows } : null,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id:      Date.now() + 1,
          role:    "assistant",
          content: `Connection error: ${err.message}. Make sure the backend server is running on port 8000.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); sendMessage(); };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)", background: "var(--bg)" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0"
            style={{ background: "var(--accent-bg)", borderColor: "var(--accent-border)" }}
          >
            <svg width="17" height="17" fill="none" stroke="#ea580c" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-sm" style={{ color: "var(--txt)" }}>Cricket AI Assistant</h1>
            <p className="text-xs" style={{ color: "var(--txt-3)" }}>Ask in plain English · Powered by a fine-tuned LLM + SQL</p>
          </div>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <AssistantMessage key={msg.id} message={msg} />
          ))}

          {loading && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border"
                style={{ background: "var(--bg-input)", borderColor: "var(--border)", color: "var(--txt-3)" }}
              >
                AI
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center border"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--txt-3)", animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--txt-3)", animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--txt-3)", animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Suggestions + Input ────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t px-4 sm:px-6 py-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-xs transition-all duration-150 border disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--txt-3)" }}
                onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.color = "var(--txt)"; e.currentTarget.style.borderColor = "var(--accent-border)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--txt-3)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div
              className="flex items-center gap-2 rounded-xl overflow-hidden border transition-colors"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              onFocusCapture={(e) => e.currentTarget.style.borderColor = "var(--accent-border)"}
              onBlurCapture={(e) => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any cricket stat…"
                className="flex-1 bg-transparent px-4 py-3.5 text-sm outline-none"
                style={{ color: "var(--txt)" }}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="m-1.5 px-4 py-2.5 font-semibold text-sm rounded-lg transition-colors duration-200 flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: "var(--accent-fg)" }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" />
                </svg>
                Send
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
