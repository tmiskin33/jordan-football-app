import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function gameDate(date: Date, long = false) {
  return date.toLocaleDateString("en-US", {
    weekday: long ? "long" : undefined,
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function Home() {
  const games = await prisma.game.findMany({
    include: { opponent: true },
    orderBy: { date: "asc" },
  });

  const today = new Date(new Date().toDateString());
  const nextGame = games.find((g) => g.date >= today && g.teamScore == null);
  const played = games.filter((g) => g.teamScore != null && g.oppScore != null);
  const lastGame = played[played.length - 1];
  const wins = played.filter((g) => g.teamScore! > g.oppScore!).length;
  const losses = played.filter((g) => g.teamScore! < g.oppScore!).length;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-maroon-800 via-maroon-700 to-maroon-900 text-white">
        {/* soft glow so the flat maroon band reads with some depth */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-maroon-400/20 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:flex-row sm:gap-10 sm:text-left">
          <div className="rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5">
            <Image src="/logo.png" alt="Jordan Beetdiggers logo" width={130} height={101} priority />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-maroon-200">
              Jordan High School
            </p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">Beetdiggers Football</h1>
            <p className="mt-4 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/20 backdrop-blur">
              {wins}-{losses} overall
            </p>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {nextGame && (
            <Link
              href={`/opponents/${nextGame.opponentId}`}
              className="group rounded-2xl border border-steel-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-maroon-300 hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-maroon-700">Next game</p>
              <p className="mt-1 text-xl font-bold text-steel-900">
                {nextGame.homeAway === "HOME" ? "vs" : "@"} {nextGame.opponent.name}
              </p>
              <p className="text-sm text-steel-500">
                {gameDate(nextGame.date, true)}
                {nextGame.time ? ` · ${nextGame.time}` : ""}
                {nextGame.isRegion ? " · Region" : ""}
              </p>
              <p className="mt-3 text-sm font-medium text-maroon-700 group-hover:underline">
                View scouting report →
              </p>
            </Link>
          )}

          {lastGame && (
            <Link
              href={`/opponents/${lastGame.opponentId}`}
              className="group rounded-2xl border border-steel-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-maroon-300 hover:shadow-lg"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">Last game</p>
              <p className="mt-1 text-xl font-bold text-steel-900">
                {lastGame.homeAway === "HOME" ? "vs" : "@"} {lastGame.opponent.name}
              </p>
              <p
                className={`text-sm font-semibold ${
                  lastGame.teamScore! > lastGame.oppScore!
                    ? "text-emerald-600"
                    : lastGame.teamScore! < lastGame.oppScore!
                      ? "text-red-600"
                      : "text-steel-600"
                }`}
              >
                {lastGame.teamScore! > lastGame.oppScore! ? "W" : lastGame.teamScore! < lastGame.oppScore! ? "L" : "T"}{" "}
                {lastGame.teamScore}-{lastGame.oppScore} · {gameDate(lastGame.date)}
              </p>
              <p className="mt-3 text-sm font-medium text-maroon-700 group-hover:underline">
                Review the film →
              </p>
            </Link>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/schedule"
            className="rounded-full bg-maroon-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-maroon-800 hover:shadow-md"
          >
            Full schedule
          </Link>
          <Link
            href="/opponents"
            className="rounded-full border border-steel-300 bg-white px-5 py-2.5 text-sm font-semibold text-steel-700 transition hover:border-steel-400 hover:bg-steel-100"
          >
            Scouting reports
          </Link>
          <Link
            href="/live"
            className="rounded-full border border-steel-300 bg-white px-5 py-2.5 text-sm font-semibold text-steel-700 transition hover:border-steel-400 hover:bg-steel-100"
          >
            Live tendencies
          </Link>
        </div>
      </section>
    </div>
  );
}
