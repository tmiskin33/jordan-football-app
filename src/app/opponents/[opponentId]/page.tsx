import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  buildOffenseProfile,
  buildDefenseProfile,
  buildExplosiveProfile,
  buildSpecialTeamsSplits,
  type OffensePlayLike,
  type DefensePlayLike,
} from "@/lib/analytics";
import SituationTable from "@/components/SituationTable";
import ConversionTable from "@/components/ConversionTable";
import ConceptTable from "@/components/ConceptTable";
import RunDirectionTable from "@/components/RunDirectionTable";
import ExplosivePanel from "@/components/ExplosivePanel";
import SpecialTeamsTable from "@/components/SpecialTeamsTable";
import PlayerUsageTable from "@/components/PlayerUsageTable";
import SeasonDashboardTable, { type SeasonDashboardRow } from "@/components/SeasonDashboardTable";
import PlayLogTable, { type PlayLogRow } from "@/components/PlayLogTable";
import { updateOpponentNotes } from "@/lib/actions/games";
import { importWorkbook } from "@/lib/actions/import";
import FilmUploadForm from "@/components/FilmUploadForm";
import SubmitButton from "@/components/SubmitButton";

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

export default async function OpponentPage({
  params,
}: {
  params: Promise<{ opponentId: string }>;
}) {
  const { opponentId } = await params;
  const session = await auth();

  const opponent = await prisma.opponent.findUnique({
    where: { id: opponentId },
    include: {
      games: { orderBy: { date: "asc" } },
      films: {
        orderBy: { uploadedAt: "asc" },
        include: {
          offensePlays: true,
          defensePlays: true,
          specialTeamsPlays: true,
        },
      },
    },
  });

  if (!opponent) notFound();
  if (opponent.isOwnTeam && !session) {
    redirect("/admin/login");
  }

  // A self-scout "opponent" (our own team) isn't the opponentId on any Game
  // row — Games are always keyed by the real team we played. So its season
  // schedule comes from the full Game table, joined back to whichever real
  // opponent each week's film belongs to.
  const relevantGames = opponent.isOwnTeam
    ? await prisma.game.findMany({ include: { opponent: true }, orderBy: { date: "asc" } })
    : opponent.games.map((g) => ({ ...g, opponent }));

  const offensePlays: (OffensePlayLike & { id: string; filmLabel: string; gameId: string | null })[] =
    opponent.films.flatMap((f) => f.offensePlays.map((p) => ({ ...p, filmLabel: f.label, gameId: f.gameId })));
  const defensePlays: (DefensePlayLike & { gameId: string | null })[] = opponent.films.flatMap((f) =>
    f.defensePlays.map((p) => ({ ...p, filmLabel: f.label, gameId: f.gameId }))
  );
  const specialTeamsPlays = opponent.films.flatMap((f) =>
    f.specialTeamsPlays.map((p) => ({ ...p, filmLabel: f.label, gameId: f.gameId }))
  );

  // For a real opponent, film tagged to a game is the actual head-to-head
  // matchup, not advance scouting — keep it out of the pre-game numbers
  // below and point to that game's own page instead. Self-scout film is
  // always tied to a game by design, so this split doesn't apply there.
  const actualGameId = opponent.isOwnTeam
    ? null
    : (offensePlays.find((p) => p.gameId)?.gameId ?? defensePlays.find((p) => p.gameId)?.gameId ?? null);
  const scoutingOffensePlays = opponent.isOwnTeam ? offensePlays : offensePlays.filter((p) => !p.gameId);
  const scoutingDefensePlays = opponent.isOwnTeam ? defensePlays : defensePlays.filter((p) => !p.gameId);
  const actualGameSnapCount = offensePlays.length - scoutingOffensePlays.length + (defensePlays.length - scoutingDefensePlays.length);

  const offenseProfile = buildOffenseProfile(scoutingOffensePlays);
  const defenseProfile = buildDefenseProfile(scoutingDefensePlays);
  const explosiveProfile = buildExplosiveProfile(scoutingOffensePlays);
  const scoutingSpecialTeams = opponent.isOwnTeam
    ? specialTeamsPlays
    : specialTeamsPlays.filter((p) => !p.gameId);
  const specialTeamsSplits = buildSpecialTeamsSplits(scoutingSpecialTeams);

  const playLogRows: PlayLogRow[] = scoutingOffensePlays.map((p) => ({
    id: p.id,
    film: p.filmLabel,
    qtr: p.qtr ?? null,
    down: p.down ?? null,
    distance: p.distance ?? null,
    yardLine: p.yardLine ?? null,
    formation: p.formation ?? null,
    playType: p.playType ?? null,
    playCall: (p as { playCall?: string | null }).playCall ?? null,
    yards: p.yards ?? null,
    resultType: p.resultType ?? null,
  }));

  const thirdDownAll = (conversions: { situation: string; conversionRate: number | null }[]) =>
    conversions.find((c) => c.situation === "3rd Down — All")?.conversionRate ?? null;

  // Season dashboard: same season totals broken out game by game. Only games
  // with a film tagged via the per-game chart upload show up with numbers.
  const seasonRows: SeasonDashboardRow[] = opponent.isOwnTeam
    ? relevantGames.map((g) => {
        const gameOffense = offensePlays.filter((p) => p.gameId === g.id);
        const gameDefense = defensePlays.filter((p) => p.gameId === g.id);
        const offProfile = buildOffenseProfile(gameOffense);
        const defProfile = buildDefenseProfile(gameDefense);
        return {
          gameId: g.id,
          week: g.week,
          date: g.date,
          opponentLabel: `${g.homeAway === "HOME" ? "vs" : "@"} ${g.opponent.name}`,
          teamScore: g.teamScore,
          oppScore: g.oppScore,
          offPlays: offProfile.runs + offProfile.passes,
          offYards: offProfile.totalYards,
          offYardsPerPlay: offProfile.yardsPerPlay,
          offSuccessRate: offProfile.successRate,
          offExplosiveRate: offProfile.explosiveRate,
          thirdDownRate: thirdDownAll(offProfile.conversions),
          defPlays: defProfile.runs + defProfile.passes,
          yardsAllowed: defProfile.yardsAllowed,
          yardsAllowedPerPlay: defProfile.yardsAllowedPerPlay,
          oppSuccessRate: defProfile.opponentSuccessRate,
          takeaways: defProfile.takeaways,
        };
      })
    : [];

  const seasonTotals = {
    offPlays: offenseProfile.runs + offenseProfile.passes,
    offYards: offenseProfile.totalYards,
    offYardsPerPlay: offenseProfile.yardsPerPlay,
    offSuccessRate: offenseProfile.successRate,
    offExplosiveRate: offenseProfile.explosiveRate,
    thirdDownRate: thirdDownAll(offenseProfile.conversions),
    defPlays: defenseProfile.runs + defenseProfile.passes,
    yardsAllowed: defenseProfile.yardsAllowed,
    yardsAllowedPerPlay: defenseProfile.yardsAllowedPerPlay,
    oppSuccessRate: defenseProfile.opponentSuccessRate,
    takeaways: defenseProfile.takeaways,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="border-l-4 border-maroon-700 pl-3 text-2xl font-bold text-steel-900">
            {opponent.name}
          </h1>
          {opponent.isOwnTeam && (
            <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Private — our team
            </span>
          )}
        </div>
        {session && (
          <Link
            href={`/admin/opponents/${opponent.id}`}
            className="rounded-md border border-steel-300 px-3 py-1.5 text-sm text-steel-700 hover:bg-steel-100"
          >
            Manage
          </Link>
        )}
      </div>

      {/* Games */}
      {relevantGames.length > 0 && (
        <section className="mt-4">
          <ul className="flex flex-wrap gap-2 text-sm">
            {relevantGames.map((g) => (
              <li key={g.id} className="flex items-center gap-1 rounded-full bg-steel-100 px-3 py-1">
                <span className="text-steel-700">
                  {g.week != null ? `Wk ${g.week} — ` : ""}
                  {g.homeAway === "HOME" ? "vs" : "@"} {g.opponent.name} —{" "}
                  {g.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                </span>
                {session && (
                  <>
                    <Link href={`/admin/games/${g.id}`} className="text-steel-500 hover:underline">
                      chart/film
                    </Link>
                    <span className="text-steel-300">·</span>
                    <Link href={`/games/${g.id}`} className="text-maroon-700 hover:underline">
                      team analytics
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {opponent.isOwnTeam ? (
        <>
          {/* Season Dashboard */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-steel-900">Season dashboard</h2>
            <p className="text-xs text-steel-500">
              Game-by-game trends, plus a season total. Pulled from every game with a chart tagged to it.
            </p>
            <div className="mt-3">
              <SeasonDashboardTable rows={seasonRows} season={seasonTotals} />
            </div>
          </section>

          {/* Offense efficiency */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-steel-900">Our offense — efficiency</h2>
            <p className="text-xs text-steel-500">
              {offenseProfile.totalSnaps} snaps charted across {opponent.films.length} film
              {opponent.films.length === 1 ? "" : "s"}.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Total plays" value={String(offenseProfile.runs + offenseProfile.passes)} />
              <StatTile label="Run / pass split" value={pct(offenseProfile.overallRunRate)} />
              <StatTile label="Total yards" value={String(offenseProfile.totalYards)} />
              <StatTile label="Yards / play" value={num(offenseProfile.yardsPerPlay)} />
              <StatTile label="Yards / rush" value={num(offenseProfile.yardsPerRun)} />
              <StatTile label="Yards / pass play" value={num(offenseProfile.yardsPerPass)} />
              <StatTile label="Success rate" value={pct(offenseProfile.successRate)} />
              <StatTile label="Explosive rate" value={pct(offenseProfile.explosiveRate)} />
              <StatTile label="First downs" value={String(offenseProfile.firstDowns)} />
              <StatTile label="Touchdowns" value={String(offenseProfile.touchdowns)} />
              <StatTile label="Interceptions" value={String(offenseProfile.interceptions)} />
              <StatTile label="Fumbles lost" value={String(offenseProfile.fumblesLost)} />
              <StatTile label="Sacks taken" value={String(offenseProfile.sacks)} />
              <StatTile label="Penalties" value={String(offenseProfile.penalties)} />
            </div>

            <div className="mt-6 flex flex-col gap-6">
              <SituationTable title="By down & distance" splits={offenseProfile.byDownDistance} showYardsPerPlay showShare />
              <ConversionTable title="3rd & 4th down conversions" rows={offenseProfile.conversions} />
              <SituationTable title="By formation" splits={offenseProfile.byFormation} showYardsPerPlay showShare collapseBelow={2} />
              <SituationTable title="By formation strength" splits={offenseProfile.byStrength} showYardsPerPlay showShare />
              <SituationTable title="By personnel grouping" splits={offenseProfile.byPersonnel} showYardsPerPlay showShare />
              <SituationTable title="By backfield alignment" splits={offenseProfile.byBackfield} showYardsPerPlay showShare />
              <SituationTable title="Motion vs no motion" splits={offenseProfile.byMotion} showYardsPerPlay showShare />
              <SituationTable title="By field zone" splits={offenseProfile.byFieldZone} showYardsPerPlay showShare />
              <SituationTable title="By score situation" splits={offenseProfile.byScoreSituation} showYardsPerPlay showShare />
              <SituationTable title="By quarter" splits={offenseProfile.byQuarter} showYardsPerPlay showShare />
              <SituationTable title="By hash" splits={offenseProfile.byHash} showYardsPerPlay showShare />
              <SituationTable title="By play direction" splits={offenseProfile.byDirection} showYardsPerPlay showShare />
              <SituationTable title="By game" splits={offenseProfile.byGame} showYardsPerPlay showShare />
              <RunDirectionTable rows={offenseProfile.runDirectionByFormation} />
              <ConceptTable title="Run concepts called" rows={offenseProfile.runConcepts} typeLabel="runs" collapseBelow={2} />
              <ConceptTable title="Pass concepts called" rows={offenseProfile.passConcepts} typeLabel="passes" collapseBelow={2} />
              <PlayerUsageTable rows={offenseProfile.playerUsage} />
            </div>
          </section>

          {/* Defense efficiency */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-steel-900">Our defense — efficiency</h2>
            <p className="text-xs text-steel-500">
              What the opponent did against us and how we held up — lower opponent success is good.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Opponent plays" value={String(defenseProfile.runs + defenseProfile.passes)} />
              <StatTile label="Opponent run %" value={pct(defenseProfile.opponentRunRate)} />
              <StatTile label="Yards allowed" value={String(defenseProfile.yardsAllowed)} />
              <StatTile label="Yards allowed / play" value={num(defenseProfile.yardsAllowedPerPlay)} />
              <StatTile label="Yards allowed / rush" value={num(defenseProfile.yardsAllowedPerRun)} />
              <StatTile label="Yards allowed / pass" value={num(defenseProfile.yardsAllowedPerPass)} />
              <StatTile label="Opponent success rate" value={pct(defenseProfile.opponentSuccessRate)} />
              <StatTile label="Our stop rate" value={pct(defenseProfile.stopRate)} />
              <StatTile label="Explosive plays allowed" value={pct(defenseProfile.explosivePlaysAllowedRate)} />
              <StatTile label="First downs allowed" value={String(defenseProfile.firstDownsAllowed)} />
              <StatTile label="Touchdowns allowed" value={String(defenseProfile.touchdownsAllowed)} />
              <StatTile label="Takeaways" value={String(defenseProfile.takeaways)} />
              <StatTile label="Sacks recorded" value={String(defenseProfile.sacksRecorded)} />
              <StatTile label="Penalties" value={String(defenseProfile.penalties)} />
            </div>

            <div className="mt-6 flex flex-col gap-6">
              <SituationTable title="By down & distance" splits={defenseProfile.byDownDistance} showYardsPerPlay showShare />
              <ConversionTable
                title="3rd & 4th down conversions allowed"
                rows={defenseProfile.conversionsAllowed}
                conversionLabel="Conv. % allowed"
              />
              <SituationTable title="By opponent formation" splits={defenseProfile.byFormationFaced} showYardsPerPlay showShare collapseBelow={2} />
              <SituationTable title="By our front" splits={defenseProfile.byFront} showYardsPerPlay showShare />
              <SituationTable title="By our coverage" splits={defenseProfile.byCoverage} showYardsPerPlay showShare />
              <SituationTable title="By our personnel" splits={defenseProfile.byDefPersonnel} showYardsPerPlay showShare />
              <SituationTable title="Blitz vs no blitz" splits={defenseProfile.blitzEfficiency} showYardsPerPlay showShare />
              <SituationTable title="By rusher count" splits={defenseProfile.blitzByRusherCount} showYardsPerPlay showShare />
              <SituationTable title="By blitz type" splits={defenseProfile.byBlitzType} showYardsPerPlay showShare />
              <SituationTable title="By field zone" splits={defenseProfile.byFieldZone} showYardsPerPlay showShare />
              <SituationTable title="By quarter" splits={defenseProfile.byQuarter} showYardsPerPlay showShare />
              <SituationTable title="By hash" splits={defenseProfile.byHash} showYardsPerPlay showShare />
              <SituationTable title="By game" splits={defenseProfile.byGame} showYardsPerPlay showShare />
            </div>
          </section>

          {/* Explosive plays */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-steel-900">Explosive plays</h2>
            <p className="mb-3 text-xs text-steel-500">
              Where our chunk plays come from — runs of {10}+ and passes of {15}+.
            </p>
            <ExplosivePanel profile={explosiveProfile} />
          </section>

          {/* Special teams */}
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold text-steel-900">Special teams</h2>
            <SpecialTeamsTable splits={specialTeamsSplits} />
          </section>
        </>
      ) : (
        <>
          {/* Game Plan Card */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-steel-900">Game plan card</h2>
            <p className="text-xs text-steel-500">
              Pre-game scouting: {offenseProfile.totalSnaps} offensive snaps and {defenseProfile.totalSnaps}{" "}
              defensive snaps charted from their other games.
            </p>
            {actualGameId && actualGameSnapCount > 0 && (
              <p className="mt-1 text-xs text-steel-500">
                {actualGameSnapCount} snaps from the actual game against Jordan are kept separate —{" "}
                <Link href={`/games/${actualGameId}`} className="text-maroon-700 hover:underline">
                  view that game →
                </Link>
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Overall run %" value={pct(offenseProfile.overallRunRate)} />
              <StatTile label="Most-used formation" value={offenseProfile.mostUsedFormation ?? "—"} />
              <StatTile label="Their success rate" value={pct(offenseProfile.successRate)} />
              <StatTile label="Explosive-play rate" value={pct(offenseProfile.explosiveRate)} />
              <StatTile label="Most-used front" value={defenseProfile.mostUsedFront ?? "—"} />
              <StatTile label="Most-used coverage" value={defenseProfile.mostUsedCoverage ?? "—"} />
              <StatTile label="Blitz rate" value={pct(defenseProfile.blitzRate)} />
              <StatTile label="Their stop rate" value={pct(defenseProfile.stopRate)} />
              <StatTile label="Avg rushers" value={num(defenseProfile.averageRushers)} />
              <StatTile label="Yds allowed / play" value={num(defenseProfile.yardsAllowedPerPlay)} />
              <StatTile label="Sacks in charted film" value={String(defenseProfile.sacksRecorded)} />
              <StatTile label="Explosives allowed" value={pct(defenseProfile.explosivePlaysAllowedRate)} />
            </div>
          </section>

          {/* Offense tendencies */}
          <section className="mt-8 flex flex-col gap-6">
            <h2 className="text-lg font-semibold text-steel-900">Offense tendencies</h2>
            <SituationTable title="By down &amp; distance" splits={offenseProfile.byDownDistance} showYardsPerPlay showShare />
            <ConversionTable title="3rd &amp; 4th down conversions" rows={offenseProfile.conversions} />
            <SituationTable title="By formation" splits={offenseProfile.byFormation} showYardsPerPlay showShare collapseBelow={3} />
            <SituationTable title="By formation strength" splits={offenseProfile.byStrength} showYardsPerPlay showShare />
            <SituationTable title="By personnel grouping" splits={offenseProfile.byPersonnel} showYardsPerPlay showShare />
            <SituationTable title="By backfield alignment" splits={offenseProfile.byBackfield} showYardsPerPlay showShare />
            <SituationTable title="Motion vs no motion" splits={offenseProfile.byMotion} showYardsPerPlay showShare />
            <SituationTable title="By field zone" splits={offenseProfile.byFieldZone} showYardsPerPlay showShare />
            <SituationTable title="By score situation" splits={offenseProfile.byScoreSituation} showYardsPerPlay showShare />
            <SituationTable title="By quarter" splits={offenseProfile.byQuarter} showYardsPerPlay showShare />
            <SituationTable title="By hash" splits={offenseProfile.byHash} showYardsPerPlay showShare />
            <SituationTable title="By play direction" splits={offenseProfile.byDirection} showYardsPerPlay showShare />
            <SituationTable title="By game charted" splits={offenseProfile.byGame} showYardsPerPlay showShare />
            <RunDirectionTable rows={offenseProfile.runDirectionByFormation} />
            <ConceptTable title="Run concepts called" rows={offenseProfile.runConcepts} typeLabel="runs" collapseBelow={2} />
            <ConceptTable title="Pass concepts called" rows={offenseProfile.passConcepts} typeLabel="passes" collapseBelow={2} />
            <PlayerUsageTable rows={offenseProfile.playerUsage} />
          </section>

          {/* Defense tendencies */}
          <section className="mt-10 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-steel-900">Defense tendencies</h2>
              <p className="text-xs text-steel-500">
                What their defense gave up. Stop % is from their side — high means their defense won the
                down, so look for where it drops.
              </p>
            </div>
            <SituationTable title="By down &amp; distance" splits={defenseProfile.byDownDistance} showYardsPerPlay showShare />
            <ConversionTable
              title="3rd &amp; 4th down conversions allowed"
              rows={defenseProfile.conversionsAllowed}
              conversionLabel="Conv. % allowed"
            />
            <SituationTable title="Offensive formations they faced" splits={defenseProfile.byFormationFaced} showYardsPerPlay showShare collapseBelow={2} />
            <SituationTable title="By defensive front" splits={defenseProfile.byFront} showYardsPerPlay showShare />
            <SituationTable title="By coverage" splits={defenseProfile.byCoverage} showYardsPerPlay showShare />
            <SituationTable title="By defensive personnel" splits={defenseProfile.byDefPersonnel} showYardsPerPlay showShare />
            <SituationTable title="Blitz vs no blitz" splits={defenseProfile.blitzEfficiency} showYardsPerPlay showShare />
            <SituationTable title="By rusher count" splits={defenseProfile.blitzByRusherCount} showYardsPerPlay showShare />
            <SituationTable title="By blitz type" splits={defenseProfile.byBlitzType} showYardsPerPlay showShare />
            <SituationTable title="By field zone" splits={defenseProfile.byFieldZone} showYardsPerPlay showShare />
            <SituationTable title="By quarter" splits={defenseProfile.byQuarter} showYardsPerPlay showShare />
            <SituationTable title="By game charted" splits={defenseProfile.byGame} showYardsPerPlay showShare />
          </section>

          {/* Explosive plays */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-steel-900">Explosive plays</h2>
            <p className="mb-3 text-xs text-steel-500">
              Where their chunk plays come from — runs of 10+ and passes of 15+.
            </p>
            <ExplosivePanel profile={explosiveProfile} />
          </section>

          {/* Special teams */}
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold text-steel-900">Special teams</h2>
            <SpecialTeamsTable splits={specialTeamsSplits} />
          </section>
        </>
      )}

      {/* Coaches' keys */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-steel-900">Coaches&apos; keys</h2>
        {session ? (
          <form action={updateOpponentNotes} className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="hidden" name="opponentId" value={opponent.id} />
            {[
              ["whenWeHaveBall", "When we have the ball", opponent.whenWeHaveBall],
              ["whenTheyHaveBall", "When they have the ball", opponent.whenTheyHaveBall],
              ["mustStopPlays", "Must-stop plays", opponent.mustStopPlays],
              ["situationalReminders", "Situational reminders", opponent.situationalReminders],
              ["personnelNotes", "Personnel to account for", opponent.personnelNotes],
            ].map(([name, label, value]) => (
              <div key={name} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-steel-600">{label}</label>
                <textarea
                  name={name as string}
                  defaultValue={value ?? ""}
                  rows={3}
                  className="rounded-md border border-steel-300 px-2 py-1.5 text-sm"
                />
              </div>
            ))}
            <div>
              <button
                type="submit"
                className="rounded-md bg-maroon-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-maroon-800"
              >
                Save keys
              </button>
            </div>
          </form>
        ) : (
          <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ["When we have the ball", opponent.whenWeHaveBall],
              ["When they have the ball", opponent.whenTheyHaveBall],
              ["Must-stop plays", opponent.mustStopPlays],
              ["Situational reminders", opponent.situationalReminders],
              ["Personnel to account for", opponent.personnelNotes],
            ]
              .filter(([, v]) => v)
              .map(([label, v]) => (
                <div key={label as string}>
                  <dt className="text-xs font-medium text-steel-500">{label}</dt>
                  <dd className="text-sm text-steel-800 whitespace-pre-wrap">{v}</dd>
                </div>
              ))}
          </dl>
        )}
      </section>

      {/* Film */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-steel-900">Film</h2>
        {opponent.films.filter((f) => f.videoUrl).length === 0 ? (
          <p className="mt-2 text-sm text-steel-500">No film uploaded yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {opponent.films
              .filter((f) => f.videoUrl)
              .map((f) => (
                <div key={f.id}>
                  <p className="mb-1 text-sm font-medium text-steel-700">{f.label}</p>
                  <video src={f.videoUrl!} controls className="w-full rounded-lg border border-steel-200" />
                </div>
              ))}
          </div>
        )}

        {session && (
          <div className="mt-4 flex flex-col gap-4 rounded-lg border border-dashed border-steel-300 p-4">
            <div>
              <p className="text-sm font-medium text-steel-700">Upload film</p>
              <FilmUploadForm opponentId={opponent.id} />
            </div>
            <div>
              <p className="text-sm font-medium text-steel-700">Import a charted workbook (.xlsx)</p>
              <p className="text-xs text-steel-500">
                For a specific game&apos;s chart, use that game&apos;s &quot;chart/film&quot; link above
                instead — this general import isn&apos;t tied to one game (and self-scout &quot;Team
                Analytics&quot; workbooks always need a game).
              </p>
              <form action={importWorkbook} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="opponentId" value={opponent.id} />
                <input type="file" name="file" accept=".xlsx" required className="text-sm" />
                <SubmitButton pendingLabel="Importing…">Import</SubmitButton>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* Play log */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-steel-900">Play log</h2>
        <PlayLogTable rows={playLogRows} />
      </section>
    </div>
  );
}
