import type { ExplosiveProfile } from "@/lib/analytics";
import SituationTable from "@/components/SituationTable";

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(1);
}

function Tile({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 shadow-sm ${
        emphasis ? "border-maroon-300 bg-maroon-50" : "border-steel-200 bg-white"
      }`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-steel-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tracking-tight ${emphasis ? "text-maroon-700" : "text-steel-900"}`}>
        {value}
      </p>
    </div>
  );
}

/** Mirrors the workbook's "Explosive Plays" sheet — where the chunk plays come from. */
export default function ExplosivePanel({ profile }: { profile: ExplosiveProfile }) {
  const e = profile;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Explosive plays" value={String(e.explosivePlays)} />
          <Tile label="Explosive rate" value={pct(e.explosiveRate)} />
          <Tile label="Explosive runs (10+)" value={String(e.explosiveRuns)} />
          <Tile label="Explosive passes (15+)" value={String(e.explosivePasses)} />
          <Tile label="Rate on runs" value={pct(e.explosiveRateOnRuns)} />
          <Tile label="Rate on passes" value={pct(e.explosiveRateOnPasses)} />
          <Tile label="Avg gain on an explosive" value={num(e.averageGain)} />
          <Tile label="Share that are runs" value={pct(e.shareThatAreRuns)} />
          <Tile label="Longest explosive run" value={e.longestRun == null ? "—" : String(e.longestRun)} />
          <Tile label="Longest explosive pass" value={e.longestPass == null ? "—" : String(e.longestPass)} />
          <Tile label="Yards from explosives" value={String(e.yardsFromExplosives)} />
          <Tile label="Share of their offense" value={pct(e.shareOfOffense)} />
        </div>

        <div className="mt-3 rounded-xl border border-maroon-300 bg-maroon-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-maroon-700">
            Yards per play with explosives removed
          </p>
          <p className="mt-0.5 text-3xl font-bold tracking-tight text-maroon-700">
            {num(e.yardsPerPlayWithoutExplosives)}
          </p>
          <p className="mt-1 text-xs text-steel-600">
            Take the chunk plays away and this is what their offense actually averages. The gap between
            this and their real yards per play is how dependent they are on hitting big ones.
          </p>
        </div>
      </div>

      <SituationTable title="Explosives by down &amp; distance" splits={e.byDownDistance} showYardsPerPlay />
      <SituationTable title="Explosives by field zone" splits={e.byFieldZone} showYardsPerPlay />
      <SituationTable title="Explosives by quarter" splits={e.byQuarter} showYardsPerPlay />
      <SituationTable
        title="Formations that break one"
        splits={e.byFormation}
        showYardsPerPlay
        collapseBelow={2}
      />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-steel-700">
          Every explosive play ({e.plays.length})
        </h3>
        <div className="max-h-96 overflow-auto rounded-xl border border-steel-200 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-steel-100 text-[11px] uppercase tracking-wide text-steel-500">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Film</th>
                <th className="px-2 py-2">Q</th>
                <th className="px-2 py-2">D&amp;D</th>
                <th className="px-2 py-2">Yard Ln</th>
                <th className="px-2 py-2">Hash</th>
                <th className="px-2 py-2">Formation</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Call</th>
                <th className="px-2 py-2">Dir</th>
                <th className="px-2 py-2">Yds</th>
                <th className="px-2 py-2">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100 bg-white">
              {e.plays.map((p, i) => (
                <tr key={i} className="transition hover:bg-steel-50">
                  <td className="px-2 py-1.5 text-steel-400">{i + 1}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-steel-500">{p.film ?? ""}</td>
                  <td className="px-2 py-1.5">{p.qtr ?? ""}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{p.downDistance ?? ""}</td>
                  <td className="px-2 py-1.5">{p.yardLine ?? ""}</td>
                  <td className="px-2 py-1.5">{p.hash ?? ""}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{p.formation ?? ""}</td>
                  <td className="px-2 py-1.5">{p.playType ?? ""}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{p.playCall ?? ""}</td>
                  <td className="px-2 py-1.5">{p.direction ?? ""}</td>
                  <td className="px-2 py-1.5 font-semibold text-maroon-700">{p.yards ?? ""}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{p.resultType ?? ""}</td>
                </tr>
              ))}
              {e.plays.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-2 py-6 text-center text-steel-400">
                    No explosive plays charted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
