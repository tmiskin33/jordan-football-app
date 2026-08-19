import type { ConceptRow } from "@/lib/analytics";

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(1);
}

/** "RUN/PASS CONCEPTS CALLED" — which plays they actually run, and how each one does. */
export default function ConceptTable({
  title,
  rows: allRows,
  typeLabel,
  collapseBelow,
}: {
  title: string;
  rows: ConceptRow[];
  /** "runs" or "passes" — used for the share column header. */
  typeLabel: string;
  collapseBelow?: number;
}) {
  const rows = collapseBelow ? allRows.filter((r) => r.timesCalled >= collapseBelow) : allRows;
  const collapsed = collapseBelow ? allRows.filter((r) => r.timesCalled < collapseBelow) : [];
  const collapsedCalls = collapsed.reduce((sum, r) => sum + r.timesCalled, 0);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-steel-700">{title}</h3>
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-steel-200 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-steel-100 text-[11px] uppercase tracking-wide text-steel-500">
            <tr>
              <th className="px-2 py-2">Concept</th>
              <th className="px-2 py-2">Called</th>
              <th className="px-2 py-2">% of {typeLabel}</th>
              <th className="px-2 py-2">Avg Yds</th>
              <th className="px-2 py-2">Success %</th>
              <th className="px-2 py-2">Explosive %</th>
              <th className="px-2 py-2">Most common dir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 bg-white">
            {rows.map((r) => (
              <tr key={r.concept} className="transition hover:bg-steel-50">
                <td className="whitespace-nowrap px-2 py-1.5 font-medium text-steel-800">{r.concept}</td>
                <td className="px-2 py-1.5">{r.timesCalled}</td>
                <td className="px-2 py-1.5 text-steel-500">{pct(r.shareOfType)}</td>
                <td className="px-2 py-1.5">{num(r.avgYards)}</td>
                <td className="px-2 py-1.5">{pct(r.successRate)}</td>
                <td className="px-2 py-1.5">{pct(r.explosiveRate)}</td>
                <td className="px-2 py-1.5">{r.mostCommonDirection ?? "—"}</td>
              </tr>
            ))}
            {collapsed.length > 0 && (
              <tr className="text-steel-400">
                <td colSpan={6} className="px-2 py-1.5 italic">
                  {collapsed.length} more called fewer than {collapseBelow} times
                </td>
                <td className="px-2 py-1.5">{collapsedCalls}</td>
              </tr>
            )}
            {allRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-steel-400">
                  No play calls charted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
