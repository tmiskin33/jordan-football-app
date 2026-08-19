import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function resultLabel(teamScore: number | null, oppScore: number | null) {
  if (teamScore == null || oppScore == null) return null;
  const letter = teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "T";
  return `${letter} ${teamScore}-${oppScore}`;
}

export default async function SchedulePage() {
  const games = await prisma.game.findMany({
    include: { opponent: true },
    orderBy: { date: "asc" },
  });

  const wins = games.filter((g) => g.teamScore != null && g.oppScore != null && g.teamScore > g.oppScore).length;
  const losses = games.filter((g) => g.teamScore != null && g.oppScore != null && g.teamScore < g.oppScore).length;

  const today = new Date(new Date().toDateString());
  const nextGameId = games.find((g) => g.date >= today && g.teamScore == null)?.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="border-l-4 border-maroon-700 pl-3 text-2xl font-bold text-steel-900">Schedule</h1>
        <p className="text-sm font-semibold text-maroon-700">
          {wins}-{losses} overall
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-steel-200 bg-white shadow-sm">
        {games.length === 0 && (
          <p className="p-6 text-sm text-steel-500">No games on the schedule yet.</p>
        )}
        <ul className="divide-y divide-steel-200">
          {games.map((game) => {
            const result = resultLabel(game.teamScore, game.oppScore);
            const isNext = game.id === nextGameId;
            return (
              <li
                key={game.id}
                className={`flex items-center justify-between gap-4 px-4 py-3 transition ${
                  isNext ? "border-l-4 border-maroon-700 bg-maroon-50" : "hover:bg-steel-50"
                }`}
              >
                <div className="flex items-baseline gap-4">
                  <span className="w-14 shrink-0 text-sm font-medium text-steel-500">
                    {formatDate(game.date)}
                  </span>
                  <div>
                    <Link
                      href={`/opponents/${game.opponentId}`}
                      className="font-medium text-steel-900 hover:underline"
                    >
                      {game.homeAway === "HOME" ? "vs" : "@"} {game.opponent.name}
                    </Link>
                    {game.isRegion && (
                      <span className="ml-2 rounded bg-steel-100 px-1.5 py-0.5 text-xs text-steel-500">
                        Region
                      </span>
                    )}
                    <p className="text-xs text-steel-500">
                      {game.time ?? ""}
                      {isNext ? " · Up next" : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={
                    result
                      ? result.startsWith("W")
                        ? "text-sm font-semibold text-emerald-600"
                        : result.startsWith("L")
                          ? "text-sm font-semibold text-red-600"
                          : "text-sm font-semibold text-steel-600"
                      : "text-sm text-steel-400"
                  }
                >
                  {result ?? "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
