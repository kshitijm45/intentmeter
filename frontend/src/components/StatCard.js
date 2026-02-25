export default function StatCard({ label, value, sub, highlight }) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{
        background: "var(--bg-card)",
        borderColor: highlight ? "var(--accent-border)" : "var(--border)",
      }}
    >
      <div className="text-[var(--txt-3)] text-xs font-medium uppercase tracking-wider mb-2">{label}</div>
      <div
        className="text-2xl font-bold"
        style={{ color: highlight ? "var(--accent)" : "var(--txt)" }}
      >
        {value}
      </div>
      {sub && <div className="text-[var(--txt-3)] text-xs mt-1">{sub}</div>}
    </div>
  );
}
