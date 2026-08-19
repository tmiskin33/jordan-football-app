import type { SpecialTeamsSplit } from "@/lib/analytics";

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(1);
}

/**
 * The kicking game as charted. The workbooks keep these rows raw with no
 * analysis built on them, so this stays descriptive rather than inventing
 * efficiency numbers the charting can't support.
 */
export default function SpecialTeamsTable({ splits }: { splits: SpecialTeamsSplit[] }) {
  const total = splits.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-steel-700">
        Kicking game ({total} snap{total === 1 ? "" : "s"})
      </h3>
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-steel-200 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-steel-100 text-[11px] uppercase tracking-wide text-steel-500">
            <tr>
              <th className="px-2 py-2">Play type</th>
              <th className="px-2 py-2">Snaps</th>
              <th className="px-2 py-2">Avg Yds</th>
              <th className="px-2 py-2">Results charted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 bg-white">
            {splits.map((s) => (
              <tr key={s.playType} className="transition hover:bg-steel-50">
                <td className="whitespace-nowrap px-2 py-1.5 font-medium text-steel-800">{s.playType}</td>
                <td className="px-2 py-1.5">{s.count}</td>
                <td className="px-2 py-1.5">{num(s.avgYards)}</td>
                <td className="px-2 py-1.5 text-steel-600">
                  {s.results.length > 0
                    ? s.results.map((r) => `${r.result} (${r.count})`).join(", ")
                    : "—"}
                </td>
              </tr>
            ))}
            {splits.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-steel-400">
                  No kicking-game snaps charted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
