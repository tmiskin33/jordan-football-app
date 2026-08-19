import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OpponentsPage() {
  const opponents = await prisma.opponent.findMany({
    where: { isOwnTeam: false },
    include: {
      _count: { select: { films: true } },
      games: { orderBy: { date: "asc" }, take: 1 },
    },
  });

  // Schedule order: opponents with a game come first, earliest date first;
  // anything without a game yet (shouldn't normally happen) sorts to the end.
  const sorted = [...opponents].sort((a, b) => {
    const da = a.games[0]?.date;
    const db = b.games[0]?.date;
    if (da && db) return da.getTime() - db.getTime();
    if (da) return -1;
    if (db) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="border-l-4 border-maroon-700 pl-3 text-2xl font-bold text-steel-900">
        Scouting reports
      </h1>
      <p className="mt-1 text-sm text-steel-500">Opponent tendencies, game plan cards, and film.</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-steel-200 bg-white shadow-sm">
        {sorted.length === 0 && <p className="p-6 text-sm text-steel-500">No opponents yet.</p>}
        <ul className="divide-y divide-steel-200">
          {sorted.map((opp, index) => {
            const game = opp.games[0];
            return (
              <li key={opp.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-steel-50">
                {game && (
                  <span className="shrink-0 rounded-full bg-maroon-50 px-2.5 py-1 text-xs font-semibold text-maroon-700">
                    Game {index + 1}
                  </span>
                )}
                <div>
                  <Link href={`/opponents/${opp.id}`} className="font-medium text-steel-900 hover:underline">
                    {opp.name}
                  </Link>
                  <p className="text-xs text-steel-500">
                    {opp._count.films} film{opp._count.films === 1 ? "" : "s"}
                    {game
                      ? ` · ${game.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`
                      : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
