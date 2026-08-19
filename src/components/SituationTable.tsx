import type { SituationSplit } from "@/lib/analytics";

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(1);
}

export default function SituationTable({
  title,
  splits: allSplits,
  showYardsPerPlay = false,
  showShare = false,
  collapseBelow,
}: {
  title: string;
  splits: SituationSplit[];
  showYardsPerPlay?: boolean;
  /** Show the "% of snaps" column the workbook carries on every tendency table. */
  showShare?: boolean;
  /** Fold rows with fewer than this many snaps into one muted summary line — keeps big tables readable. */
  collapseBelow?: number;
}) {
  const splits = collapseBelow ? allSplits.filter((s) => s.snaps >= collapseBelow) : allSplits;
  const collapsed = collapseBelow ? allSplits.filter((s) => s.snaps < collapseBelow) : [];
  const collapsedSnaps = collapsed.reduce((sum, s) => sum + s.snaps, 0);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-steel-700">{title}</h3>
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-steel-200 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-steel-100 text-[11px] uppercase tracking-wide text-steel-500">
            <tr>
              <th className="px-2 py-2">Situation</th>
              {showShare && <th className="px-2 py-2">% of snaps</th>}
              <th className="px-2 py-2">Run %</th>
              <th className="px-2 py-2">Tendency</th>
              {showYardsPerPlay && <th className="px-2 py-2">Yds/Play</th>}
              <th className="px-2 py-2">Success %</th>
              <th className="px-2 py-2">Explosive %</th>
              <th className="px-2 py-2">n</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 bg-white">
            {splits.map((s) => {
              const strong = s.tendency != null && s.tendency >= 0.4 && s.snaps >= 8;
              return (
                <tr key={s.situation} className="transition hover:bg-steel-50">
                  <td className="px-2 py-1.5 font-medium text-steel-800">{s.situation}</td>
                  {showShare && <td className="px-2 py-1.5 text-steel-500">{pct(s.shareOfSnaps)}</td>}
                  <td className={`px-2 py-1.5 ${strong ? "font-semibold text-red-600" : ""}`}>
                    {pct(s.runRate)}
                  </td>
                  <td className="px-2 py-1.5">{pct(s.tendency)}</td>
                  {showYardsPerPlay && <td className="px-2 py-1.5">{num(s.yardsPerPlay)}</td>}
                  <td className="px-2 py-1.5">{pct(s.successRate)}</td>
                  <td className="px-2 py-1.5">{pct(s.explosiveRate)}</td>
                  <td className="px-2 py-1.5 text-steel-500">{s.snaps}</td>
                </tr>
              );
            })}
            {collapsed.length > 0 && (
              <tr className="text-steel-400">
                <td colSpan={5 + (showYardsPerPlay ? 1 : 0) + (showShare ? 1 : 0)} className="px-2 py-1.5 italic">
                  {collapsed.length} more seen fewer than {collapseBelow} times — too small a sample to read
                  anything into
                </td>
                <td className="px-2 py-1.5">{collapsedSnaps}</td>
              </tr>
            )}
            {splits.length === 0 && collapsed.length === 0 && (
              <tr>
                <td colSpan={6 + (showYardsPerPlay ? 1 : 0) + (showShare ? 1 : 0)} className="px-2 py-4 text-center text-steel-400">
                  No charted snaps yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
