export default function ComparisonTable({ rows, player1Name, player2Name }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-3 px-4 text-gray-500 font-medium uppercase text-xs tracking-wider">Metric</th>
            <th className="text-center py-3 px-4 text-white font-semibold">{player1Name}</th>
            <th className="text-center py-3 px-4 text-blue-400 font-semibold">{player2Name}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-900">
          {rows.map((row) => (
            <tr key={row.metric} className="hover:bg-gray-800/40 transition-colors duration-100">
              <td className="py-3 px-4 text-gray-500 text-xs uppercase tracking-wider">{row.metric}</td>
              <td
                className={`py-3 px-4 text-center font-semibold ${
                  row.better === "p1" ? "text-green-400" : "text-gray-300"
                }`}
              >
                {row.p1}
              </td>
              <td
                className={`py-3 px-4 text-center font-semibold ${
                  row.better === "p2" ? "text-green-400" : "text-gray-300"
                }`}
              >
                {row.p2}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
