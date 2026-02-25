const P1_COLOR = "#ea580c";
const P2_COLOR = "#3b82f6";

/**
 * rows: Array of { metric, p1, p2, lowerIsBetter?, divider? }
 * p1Name, p2Name: display strings
 */
export default function CompareTable({ rows, p1Name, p2Name }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--border)" }}>
            <th
              className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider w-1/3"
              style={{ color: "var(--txt-3)" }}
            >
              Stat
            </th>
            <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider w-1/3">
              <span style={{ color: P1_COLOR }}>{p1Name}</span>
            </th>
            <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider w-1/3">
              <span style={{ color: P2_COLOR }}>{p2Name}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.divider) {
              return (
                <tr key={`divider-${i}`}>
                  <td
                    colSpan={3}
                    className="px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                    style={{
                      background: "var(--bg-input)",
                      color: "var(--txt-3)",
                      borderTop: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }

            const p1Num = parseFloat(row.p1);
            const p2Num = parseFloat(row.p2);
            let p1Better = false;
            let p2Better = false;

            if (!isNaN(p1Num) && !isNaN(p2Num) && p1Num !== p2Num) {
              if (row.lowerIsBetter) {
                p1Better = p1Num < p2Num;
                p2Better = p2Num < p1Num;
              } else {
                p1Better = p1Num > p2Num;
                p2Better = p2Num > p1Num;
              }
            }

            return (
              <tr
                key={row.metric}
                className="border-b transition-colors"
                style={{
                  borderColor: "var(--border)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-input)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td
                  className="px-5 py-3 font-medium"
                  style={{ color: "var(--txt-2)" }}
                >
                  {row.metric}
                </td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={p1Better ? "font-bold" : ""}
                    style={{
                      color: p1Better ? P1_COLOR : "var(--txt)",
                    }}
                  >
                    {row.p1}
                    {p1Better && (
                      <svg
                        className="inline ml-1.5 mb-0.5"
                        width="10"
                        height="10"
                        fill="none"
                        stroke={P1_COLOR}
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span
                    className={p2Better ? "font-bold" : ""}
                    style={{
                      color: p2Better ? P2_COLOR : "var(--txt)",
                    }}
                  >
                    {row.p2}
                    {p2Better && (
                      <svg
                        className="inline ml-1.5 mb-0.5"
                        width="10"
                        height="10"
                        fill="none"
                        stroke={P2_COLOR}
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
