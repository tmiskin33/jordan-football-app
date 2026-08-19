import type { ConversionRow } from "@/lib/analytics";

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(1);
}

export default function ConversionTable({
  title,
  rows,
  conversionLabel = "Conversion %",
}: {
  title: string;
  rows: ConversionRow[];
  conversionLabel?: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-steel-700">{title}</h3>
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-steel-200 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-steel-100 text-[11px] uppercase tracking-wide text-steel-500">
            <tr>
              <th className="px-2 py-2">Situation</th>
              <th className="px-2 py-2">Attempts</th>
              <th className="px-2 py-2">Conversions</th>
              <th className="px-2 py-2">{conversionLabel}</th>
              <th className="px-2 py-2">Run %</th>
              <th className="px-2 py-2">Avg Yds</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 bg-white">
            {rows.map((r) => (
              <tr key={r.situation} className="transition hover:bg-steel-50">
                <td className="px-2 py-1.5 font-medium text-steel-800">{r.situation}</td>
                <td className="px-2 py-1.5">{r.attempts}</td>
                <td className="px-2 py-1.5">{r.conversions}</td>
                <td className="px-2 py-1.5">{pct(r.conversionRate)}</td>
                <td className="px-2 py-1.5">{pct(r.runRate)}</td>
                <td className="px-2 py-1.5">{num(r.avgYards)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-4 text-center text-steel-400">
                  No 3rd/4th down snaps charted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
