import type { PlayerUsageRow } from "@/lib/analytics";

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(1);
}

export default function PlayerUsageTable({ rows }: { rows: PlayerUsageRow[] }) {
  const totalTouches = rows.reduce((sum, r) => sum + r.touches, 0);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-steel-700">Player usage</h3>
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-steel-200 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-steel-100 text-[11px] uppercase tracking-wide text-steel-500">
            <tr>
              <th className="px-2 py-2">Player</th>
              <th className="px-2 py-2">Touches</th>
              <th className="px-2 py-2">Yards</th>
              <th className="px-2 py-2">Yds/Touch</th>
              <th className="px-2 py-2">Success %</th>
              <th className="px-2 py-2">Explosive %</th>
              <th className="px-2 py-2">TDs</th>
              <th className="px-2 py-2">% of Touches</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 bg-white">
            {rows.map((r) => (
              <tr key={r.player} className="transition hover:bg-steel-50">
                <td className="px-2 py-1.5 font-medium text-steel-800">{r.player}</td>
                <td className="px-2 py-1.5">{r.touches}</td>
                <td className="px-2 py-1.5">{r.yards}</td>
                <td className="px-2 py-1.5">{num(r.yardsPerTouch)}</td>
                <td className="px-2 py-1.5">{pct(r.successRate)}</td>
                <td className="px-2 py-1.5">{pct(r.explosiveRate)}</td>
                <td className="px-2 py-1.5">{r.touchdowns}</td>
                <td className="px-2 py-1.5 text-steel-500">
                  {totalTouches > 0 ? `${Math.round((r.touches / totalTouches) * 100)}%` : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-4 text-center text-steel-400">
                  No key player charted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
