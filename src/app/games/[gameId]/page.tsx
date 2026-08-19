import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildOffenseProfile, buildDefenseProfile } from "@/lib/analytics";
import SituationTable from "@/components/SituationTable";
import ConversionTable from "@/components/ConversionTable";
import PlayerUsageTable from "@/components/PlayerUsageTable";

function pct(v: number | null) {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

function num(v: number | null) {
  return v == null ? "—" : v.toFixed(1);
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-steel-200 bg-white px-4 py-3 shadow-sm transition hover:border-steel-300 hover:shadow">
      <p className="text-[11px] font-medium uppercase tracking-wide text-steel-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold tracking-tight text-steel-900">{value}</p>
    </div>
  );
}

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const session = await auth();
  if (!session) redirect("/admin/login");

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { opponent: true },
  });
  if (!game) notFound();

  const films = await prisma.film.findMany({
    where: { gameId },
    include: {
      opponent: true,
      offensePlays: true,
      defensePlays: true,
    },
  });

  const ourFilms = films.filter((f) => f.opponent.isOwnTeam);
  const theirFilms = films.filter((f) => !f.opponent.isOwnTeam);

  const ourOffense = ourFilms.flatMap((f) => f.offensePlays);
  const ourDefense = ourFilms.flatMap((f) => f.defensePlays);
  const ourOffenseProfile = buildOffenseProfile(ourOffense);
  const ourDefenseProfile = buildDefenseProfile(ourDefense);

  const theirOffense = theirFilms.flatMap((f) => f.offensePlays);
  const theirDefense = theirFilms.flatMap((f) => f.defensePlays);
  const theirOffenseProfile = buildOffenseProfile(theirOffense);
  const theirDefenseProfile = buildDefenseProfile(theirDefense);

  const dateLabel = game.date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const matchupLabel = `${game.homeAway === "HOME" ? "vs" : "@"} ${game.opponent.name}`;
  const result =
    game.teamScore != null && game.oppScore != null
      ? `${game.teamScore > game.oppScore ? "W" : game.teamScore < game.oppScore ? "L" : "T"} ${game.teamScore}-${game.oppScore}`
      : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="border-l-4 border-maroon-700 pl-3 text-2xl font-bold text-steel-900">
            {game.week != null ? `Week ${game.week}: ` : ""}
            {matchupLabel}
          </h1>
          <p className="mt-1 text-sm text-steel-500">
            {dateLabel}
            {result && (
              <span
                className={`ml-2 font-semibold ${
                  result.startsWith("W") ? "text-emerald-600" : result.startsWith("L") ? "text-red-600" : ""
                }`}
              >
                {result}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/opponents/${game.opponentId}`}
            className="rounded-md border border-steel-300 px-3 py-1.5 text-steel-700 hover:bg-steel-100"
          >
            Scouting report
          </Link>
          <Link
            href={`/admin/games/${game.id}`}
            className="rounded-md border border-steel-300 px-3 py-1.5 text-steel-700 hover:bg-steel-100"
          >
            Chart / upload film
          </Link>
        </div>
      </div>

      {/* Our team analytics */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-steel-900">Our offense — this game</h2>
        <p className="text-xs text-steel-500">
          {ourOffenseProfile.totalSnaps} snaps charted
          {ourFilms.length === 0 && " — no chart uploaded for this game yet."}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total plays" value={String(ourOffenseProfile.runs + ourOffenseProfile.passes)} />
          <StatTile label="Run / pass split" value={pct(ourOffenseProfile.overallRunRate)} />
          <StatTile label="Total yards" value={String(ourOffenseProfile.totalYards)} />
          <StatTile label="Yards / play" value={num(ourOffenseProfile.yardsPerPlay)} />
          <StatTile label="Success rate" value={pct(ourOffenseProfile.successRate)} />
          <StatTile label="Explosive rate" value={pct(ourOffenseProfile.explosiveRate)} />
          <StatTile label="Touchdowns" value={String(ourOffenseProfile.touchdowns)} />
          <StatTile label="Turnovers" value={String(ourOffenseProfile.interceptions + ourOffenseProfile.fumblesLost)} />
        </div>

        {ourOffenseProfile.totalSnaps > 0 && (
          <div className="mt-6 flex flex-col gap-6">
            <SituationTable title="By down & distance" splits={ourOffenseProfile.byDownDistance} showYardsPerPlay />
            <ConversionTable title="3rd & 4th down conversions" rows={ourOffenseProfile.conversions} />
            <SituationTable title="By formation" splits={ourOffenseProfile.byFormation} showYardsPerPlay collapseBelow={2} />
            <SituationTable title="By field zone" splits={ourOffenseProfile.byFieldZone} showYardsPerPlay />
            <SituationTable title="By quarter" splits={ourOffenseProfile.byQuarter} showYardsPerPlay />
            <PlayerUsageTable rows={ourOffenseProfile.playerUsage} />
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-steel-900">Our defense — this game</h2>
        <p className="text-xs text-steel-500">{ourDefenseProfile.totalSnaps} snaps charted.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Opponent plays" value={String(ourDefenseProfile.runs + ourDefenseProfile.passes)} />
          <StatTile label="Yards allowed" value={String(ourDefenseProfile.yardsAllowed)} />
          <StatTile label="Yards allowed / play" value={num(ourDefenseProfile.yardsAllowedPerPlay)} />
          <StatTile label="Opponent success rate" value={pct(ourDefenseProfile.opponentSuccessRate)} />
          <StatTile label="Our stop rate" value={pct(ourDefenseProfile.stopRate)} />
          <StatTile label="Touchdowns allowed" value={String(ourDefenseProfile.touchdownsAllowed)} />
          <StatTile label="Takeaways" value={String(ourDefenseProfile.takeaways)} />
          <StatTile label="Sacks recorded" value={String(ourDefenseProfile.sacksRecorded)} />
        </div>

        {ourDefenseProfile.totalSnaps > 0 && (
          <div className="mt-6 flex flex-col gap-6">
            <SituationTable title="By down & distance" splits={ourDefenseProfile.byDownDistance} showYardsPerPlay />
            <SituationTable title="By opponent formation" splits={ourDefenseProfile.byFormationFaced} showYardsPerPlay collapseBelow={2} />
            <SituationTable title="By field zone" splits={ourDefenseProfile.byFieldZone} showYardsPerPlay />
          </div>
        )}
      </section>

      {/* Opponent's own charting of this game, if tagged */}
      {theirFilms.length > 0 && (
        <section className="mt-10 border-t border-steel-200 pt-8">
          <h2 className="text-lg font-semibold text-steel-900">
            {game.opponent.name}&apos;s film of this game
          </h2>
          <p className="text-xs text-steel-500">
            Their own charting of the head-to-head matchup — kept separate from their pre-game scouting
            report.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Their offensive snaps" value={String(theirOffenseProfile.totalSnaps)} />
            <StatTile label="Their run %" value={pct(theirOffenseProfile.overallRunRate)} />
            <StatTile label="Their success rate" value={pct(theirOffenseProfile.successRate)} />
            <StatTile label="Their explosive rate" value={pct(theirOffenseProfile.explosiveRate)} />
            <StatTile label="Their defensive snaps" value={String(theirDefenseProfile.totalSnaps)} />
            <StatTile label="Most-used front" value={theirDefenseProfile.mostUsedFront ?? "—"} />
            <StatTile label="Most-used coverage" value={theirDefenseProfile.mostUsedCoverage ?? "—"} />
            <StatTile label="Their blitz rate" value={pct(theirDefenseProfile.blitzRate)} />
          </div>
        </section>
      )}
    </div>
  );
}
