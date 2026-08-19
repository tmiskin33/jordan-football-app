import Link from "next/link";

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(1);
}

export interface SeasonDashboardRow {
  gameId: string;
  week: number | null;
  date: Date;
  opponentLabel: string;
  teamScore: number | null;
  oppScore: number | null;
  offPlays: number;
  offYards: number;
  offYardsPerPlay: number | null;
  offSuccessRate: number | null;
  offExplosiveRate: number | null;
  thirdDownRate: number | null;
  defPlays: number;
  yardsAllowed: number;
  yardsAllowedPerPlay: number | null;
  oppSuccessRate: number | null;
  takeaways: number;
}

export default function SeasonDashboardTable({
  rows,
  season,
}: {
  rows: SeasonDashboardRow[];
  season: Omit<SeasonDashboardRow, "gameId" | "week" | "date" | "opponentLabel" | "teamScore" | "oppScore">;
}) {
  const wins = rows.filter((r) => r.teamScore != null && r.oppScore != null && r.teamScore > r.oppScore).length;
  const losses = rows.filter((r) => r.teamScore != null && r.oppScore != null && r.teamScore < r.oppScore).length;

  return (
    <div className="overflow-x-auto overflow-hidden rounded-xl border border-steel-200 shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-steel-100 text-[11px] uppercase tracking-wide text-steel-500">
          <tr>
            <th className="px-2 py-2">Wk</th>
            <th className="px-2 py-2">Game</th>
            <th className="px-2 py-2">W/L</th>
            <th className="px-2 py-2">PF</th>
            <th className="px-2 py-2">PA</th>
            <th className="px-2 py-2">Off Plays</th>
            <th className="px-2 py-2">Off Yds</th>
            <th className="px-2 py-2">Yds/Play</th>
            <th className="px-2 py-2">Success %</th>
            <th className="px-2 py-2">Expl %</th>
            <th className="px-2 py-2">3rd Dn %</th>
            <th className="px-2 py-2">Def Plays</th>
            <th className="px-2 py-2">Yds Allow</th>
            <th className="px-2 py-2">Yds/Play Allow</th>
            <th className="px-2 py-2">Opp Succ %</th>
            <th className="px-2 py-2">Takeaways</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-steel-100 bg-white">
          {rows.map((r) => {
            const wl =
              r.teamScore != null && r.oppScore != null
                ? r.teamScore > r.oppScore
                  ? "W"
                  : r.teamScore < r.oppScore
                    ? "L"
                    : "T"
                : "—";
            return (
              <tr key={r.gameId} className="transition hover:bg-steel-50">
                <td className="px-2 py-1.5">{r.week ?? "—"}</td>
                <td className="px-2 py-1.5 font-medium">
                  <Link href={`/games/${r.gameId}`} className="text-maroon-700 hover:underline">
                    {r.opponentLabel} —{" "}
                    {r.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                  </Link>
                </td>
                <td
                  className={`px-2 py-1.5 font-semibold ${wl === "W" ? "text-emerald-600" : wl === "L" ? "text-red-600" : ""}`}
                >
                  {wl}
                </td>
                <td className="px-2 py-1.5">{r.teamScore ?? "—"}</td>
                <td className="px-2 py-1.5">{r.oppScore ?? "—"}</td>
                <td className="px-2 py-1.5">{r.offPlays}</td>
                <td className="px-2 py-1.5">{r.offYards}</td>
                <td className="px-2 py-1.5">{num(r.offYardsPerPlay)}</td>
                <td className="px-2 py-1.5">{pct(r.offSuccessRate)}</td>
                <td className="px-2 py-1.5">{pct(r.offExplosiveRate)}</td>
                <td className="px-2 py-1.5">{pct(r.thirdDownRate)}</td>
                <td className="px-2 py-1.5">{r.defPlays}</td>
                <td className="px-2 py-1.5">{r.yardsAllowed}</td>
                <td className="px-2 py-1.5">{num(r.yardsAllowedPerPlay)}</td>
                <td className="px-2 py-1.5">{pct(r.oppSuccessRate)}</td>
                <td className="px-2 py-1.5">{r.takeaways}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={16} className="px-2 py-6 text-center text-steel-400">
                No games charted yet.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="border-t-2 border-steel-300 bg-steel-50 font-semibold text-steel-800">
            <tr>
              <td className="px-2 py-2" colSpan={2}>
                SEASON
              </td>
              <td className="px-2 py-2">
                {wins}-{losses}
              </td>
              <td className="px-2 py-2" colSpan={2}></td>
              <td className="px-2 py-2">{season.offPlays}</td>
              <td className="px-2 py-2">{season.offYards}</td>
              <td className="px-2 py-2">{num(season.offYardsPerPlay)}</td>
              <td className="px-2 py-2">{pct(season.offSuccessRate)}</td>
              <td className="px-2 py-2">{pct(season.offExplosiveRate)}</td>
              <td className="px-2 py-2">{pct(season.thirdDownRate)}</td>
              <td className="px-2 py-2">{season.defPlays}</td>
              <td className="px-2 py-2">{season.yardsAllowed}</td>
              <td className="px-2 py-2">{num(season.yardsAllowedPerPlay)}</td>
              <td className="px-2 py-2">{pct(season.oppSuccessRate)}</td>
              <td className="px-2 py-2">{season.takeaways}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
