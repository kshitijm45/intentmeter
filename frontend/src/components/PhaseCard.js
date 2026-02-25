const P1_COLOR = "#ea580c";
const P2_COLOR = "#3b82f6";

const PHASE_META = {
  "Powerplay": { icon: "⚡", overs: "Overs 1–6" },
  "Middle Overs": { icon: "🎯", overs: "Overs 7–15" },
  "Death Overs": { icon: "💥", overs: "Overs 16–20" },
};

export default function PhaseCard({ phase, p1Name, p2Name, stats }) {
  const meta = PHASE_META[phase] ?? {};

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-base">{meta.icon}</span>
          <h3 className="text-[var(--txt)] font-semibold text-sm">{phase}</h3>
        </div>
        <p className="text-[var(--txt-3)] text-xs">{meta.overs}</p>
      </div>

      {/* Stats */}
      <div className="space-y-3 flex-1">
        {stats.map((s) => {
          const p1Num = parseFloat(s.p1);
          const p2Num = parseFloat(s.p2);
          let p1Better = false;
          let p2Better = false;

          if (!isNaN(p1Num) && !isNaN(p2Num) && p1Num !== p2Num) {
            p1Better = s.lowerIsBetter ? p1Num < p2Num : p1Num > p2Num;
            p2Better = s.lowerIsBetter ? p2Num < p1Num : p2Num > p1Num;
          }

          return (
            <div key={s.label}>
              <p className="text-[var(--txt-3)] text-xs mb-1.5">{s.label}</p>
              <div className="flex items-center gap-2">
                {/* P1 bar */}
                <div className="flex-1 flex flex-col items-end gap-1">
                  <span
                    className="text-sm font-bold"
                    style={{ color: p1Better ? P1_COLOR : "var(--txt)" }}
                  >
                    {s.p1}
                  </span>
                  {/* visual bar */}
                  <div
                    className="h-1 rounded-full w-full"
                    style={{ background: "var(--bg-input)" }}
                  >
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${Math.min(100, (p1Num / (Math.max(p1Num, p2Num) || 1)) * 100)}%`,
                        background: P1_COLOR,
                        opacity: p1Better ? 1 : 0.4,
                        marginLeft: "auto",
                      }}
                    />
                  </div>
                  <p
                    className="text-xs truncate max-w-full text-right"
                    style={{ color: P1_COLOR, opacity: 0.8 }}
                  >
                    {p1Name}
                  </p>
                </div>

                {/* Divider */}
                <div
                  className="text-xs font-semibold px-1 shrink-0"
                  style={{ color: "var(--txt-3)" }}
                >
                  vs
                </div>

                {/* P2 bar */}
                <div className="flex-1 flex flex-col items-start gap-1">
                  <span
                    className="text-sm font-bold"
                    style={{ color: p2Better ? P2_COLOR : "var(--txt)" }}
                  >
                    {s.p2}
                  </span>
                  <div
                    className="h-1 rounded-full w-full"
                    style={{ background: "var(--bg-input)" }}
                  >
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${Math.min(100, (p2Num / (Math.max(p1Num, p2Num) || 1)) * 100)}%`,
                        background: P2_COLOR,
                        opacity: p2Better ? 1 : 0.4,
                      }}
                    />
                  </div>
                  <p
                    className="text-xs truncate max-w-full"
                    style={{ color: P2_COLOR, opacity: 0.8 }}
                  >
                    {p2Name}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
