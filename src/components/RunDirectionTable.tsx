import type { RunDirectionRow } from "@/lib/analytics";

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(1);
}

/** "RUN DIRECTION BY FORMATION" — where each formation actually runs it. */
export default function RunDirectionTable({
  rows: allRows,
  collapseBelow = 2,
}: {
  rows: RunDirectionRow[];
  collapseBelow?: number;
}) {
  const rows = allRows.filter((r) => r.runs >= collapseBelow);
  const collapsed = allRows.filter((r) => r.runs < collapseBelow);

  // Highlight a lopsided direction so a coach can spot the tell at a glance.
  const strong = (share: number | null, runs: number) => share != null && share >= 0.7 && runs >= 4;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-steel-700">Run direction by formation</h3>
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-steel-200 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-steel-100 text-[11px] uppercase tracking-wide text-steel-500">
            <tr>
              <th className="px-2 py-2">Formation</th>
              <th className="px-2 py-2">Runs</th>
              <th className="px-2 py-2">Left %</th>
              <th className="px-2 py-2">Mid %</th>
              <th className="px-2 py-2">Right %</th>
              <th className="px-2 py-2">Yds L</th>
              <th className="px-2 py-2">Yds M</th>
              <th className="px-2 py-2">Yds R</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 bg-white">
            {rows.map((r) => (
              <tr key={r.formation} className="transition hover:bg-steel-50">
                <td className="whitespace-nowrap px-2 py-1.5 font-medium text-steel-800">{r.formation}</td>
                <td className="px-2 py-1.5 text-steel-500">{r.runs}</td>
                <td className={`px-2 py-1.5 ${strong(r.leftShare, r.runs) ? "font-semibold text-red-600" : ""}`}>
                  {pct(r.leftShare)}
                </td>
                <td className={`px-2 py-1.5 ${strong(r.middleShare, r.runs) ? "font-semibold text-red-600" : ""}`}>
                  {pct(r.middleShare)}
                </td>
                <td className={`px-2 py-1.5 ${strong(r.rightShare, r.runs) ? "font-semibold text-red-600" : ""}`}>
                  {pct(r.rightShare)}
                </td>
                <td className="px-2 py-1.5">{num(r.avgYardsLeft)}</td>
                <td className="px-2 py-1.5">{num(r.avgYardsMiddle)}</td>
                <td className="px-2 py-1.5">{num(r.avgYardsRight)}</td>
              </tr>
            ))}
            {collapsed.length > 0 && (
              <tr className="text-steel-400">
                <td colSpan={8} className="px-2 py-1.5 italic">
                  {collapsed.length} more formations with fewer than {collapseBelow} charted runs
                </td>
              </tr>
            )}
            {allRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-4 text-center text-steel-400">
                  No run direction charted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
