import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fieldZoneBucket } from "@/lib/analytics";
import LiveTendencies, { type TendencyPlay } from "@/components/LiveTendencies";

export const dynamic = "force-dynamic";

export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string }>;
}) {
  const { opponent: requestedId } = await searchParams;

  const opponents = await prisma.opponent.findMany({
    where: { isOwnTeam: false },
    include: {
      games: { orderBy: { date: "asc" }, take: 1 },
      films: {
        where: { gameId: null }, // pre-game scouting film only — never the actual Jordan matchup
        include: { offensePlays: true },
      },
    },
  });

  const sorted = [...opponents].sort((a, b) => {
    const da = a.games[0]?.date;
    const db = b.games[0]?.date;
    if (da && db) return da.getTime() - db.getTime();
    if (da) return -1;
    if (db) return 1;
    return a.name.localeCompare(b.name);
  });

  // Default to whoever Jordan plays next; fall back to the first opponent.
  const today = new Date(new Date().toDateString());
  const nextUp = sorted.find((o) => o.games[0] && o.games[0].date >= today);
  const selected = sorted.find((o) => o.id === requestedId) ?? nextUp ?? sorted[0];

  const plays: TendencyPlay[] = selected
    ? selected.films
        .flatMap((f) => f.offensePlays)
        .filter((p) => p.down != null && p.distance != null && p.playType)
        .map((p) => ({
          down: p.down!,
          distance: p.distance! <= 3 ? "Short" : p.distance! <= 6 ? "Medium" : "Long",
          type: p.playType!,
          concept: p.playCall,
          zone: fieldZoneBucket(p.yardLine),
        }))
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="border-l-4 border-maroon-700 pl-3 text-2xl font-bold text-steel-900">
        Live tendencies
      </h1>
      <p className="mt-1 text-sm text-steel-500">
        Pick the situation and get the most likely call from the opponent&apos;s charted film — built for
        the sideline.
      </p>

      {/* Opponent picker */}
      <div className="mt-5 flex flex-wrap gap-2">
        {sorted.map((o) => (
          <Link
            key={o.id}
            href={`/live?opponent=${o.id}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              o.id === selected?.id
                ? "bg-maroon-700 text-white"
                : "border border-steel-300 bg-white text-steel-700 hover:bg-steel-100"
            }`}
          >
            {o.name}
            {o.id === nextUp?.id ? " · next" : ""}
          </Link>
        ))}
      </div>

      {selected ? (
        <div className="mt-5">
          <LiveTendencies plays={plays} />
          <p className="mt-3 text-xs text-steel-500">
            Predictions use {selected.name}&apos;s pre-game scouting film only.{" "}
            <Link href={`/opponents/${selected.id}`} className="text-maroon-700 hover:underline">
              Full scouting report →
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-steel-500">No opponents on the schedule yet.</p>
      )}
    </div>
  );
}
