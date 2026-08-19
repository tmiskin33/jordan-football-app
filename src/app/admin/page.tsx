import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createOpponent, createGame, updateGameResult, deleteGame } from "@/lib/actions/games";
import ConfirmButton from "@/components/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [opponents, games] = await Promise.all([
    prisma.opponent.findMany({ orderBy: { name: "asc" } }),
    prisma.game.findMany({ include: { opponent: true }, orderBy: { date: "asc" } }),
  ]);

  const currentSeason = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="border-l-4 border-maroon-700 pl-3 text-2xl font-bold text-steel-900">Admin</h1>

      {/* Opponents */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-steel-900">Opponents / self-scout</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-steel-200 bg-white">
          <ul className="divide-y divide-steel-200">
            {opponents.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-4 py-2.5">
                <span>
                  {o.name}
                  {o.isOwnTeam && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      private
                    </span>
                  )}
                </span>
                <Link
                  href={`/admin/opponents/${o.id}`}
                  className="text-sm text-steel-600 hover:text-steel-900 hover:underline"
                >
                  Manage
                </Link>
              </li>
            ))}
            {opponents.length === 0 && (
              <li className="px-4 py-4 text-sm text-steel-500">No opponents yet.</li>
            )}
          </ul>
        </div>

        <form action={createOpponent} className="mt-3 flex gap-2">
          <input
            name="name"
            placeholder="New opponent name (or 'Jordan Beetdiggers' for self-scout)"
            required
            className="flex-1 rounded-md border border-steel-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-maroon-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-maroon-800"
          >
            Add
          </button>
        </form>
        <p className="mt-1 text-xs text-steel-500">
          To mark an opponent as your own team&apos;s private self-scout, add it, then open Manage.
        </p>
      </section>

      {/* Schedule */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-steel-900">Schedule</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-steel-200 bg-white">
          <ul className="divide-y divide-steel-200">
            {games.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span>
                  {g.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} —{" "}
                  {g.homeAway === "HOME" ? "vs" : "@"} {g.opponent.name}
                </span>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/games/${g.id}`} className="text-xs text-steel-600 hover:underline">
                    Chart / film
                  </Link>
                  <form action={updateGameResult} className="flex items-center gap-1">
                    <input type="hidden" name="gameId" value={g.id} />
                    <input
                      name="teamScore"
                      defaultValue={g.teamScore ?? ""}
                      placeholder="Us"
                      className="w-14 rounded-md border border-steel-300 px-1.5 py-1 text-xs"
                    />
                    <span className="text-steel-400">-</span>
                    <input
                      name="oppScore"
                      defaultValue={g.oppScore ?? ""}
                      placeholder="Them"
                      className="w-14 rounded-md border border-steel-300 px-1.5 py-1 text-xs"
                    />
                    <button type="submit" className="text-xs text-steel-600 hover:underline">
                      Save
                    </button>
                  </form>
                  <form action={deleteGame}>
                    <input type="hidden" name="gameId" value={g.id} />
                    <ConfirmButton
                      message={`Delete the ${g.opponent.name} game from the schedule? Film tagged to it stays but loses its game link.`}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
            {games.length === 0 && (
              <li className="px-4 py-4 text-sm text-steel-500">No games yet.</li>
            )}
          </ul>
        </div>

        <form action={createGame} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <select name="opponentId" required className="col-span-2 rounded-md border border-steel-300 px-2 py-1.5 text-sm">
            <option value="">Opponent…</option>
            {opponents
              .filter((o) => !o.isOwnTeam)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
          <input type="date" name="date" required className="rounded-md border border-steel-300 px-2 py-1.5 text-sm" />
          <input name="time" placeholder="7:00 PM" className="rounded-md border border-steel-300 px-2 py-1.5 text-sm" />
          <select name="homeAway" className="rounded-md border border-steel-300 px-2 py-1.5 text-sm">
            <option value="HOME">Home</option>
            <option value="AWAY">Away</option>
          </select>
          <input
            type="number"
            name="seasonYear"
            defaultValue={currentSeason}
            className="rounded-md border border-steel-300 px-2 py-1.5 text-sm"
          />
          <label className="col-span-2 flex items-center gap-1.5 text-xs text-steel-600 sm:col-span-6">
            <input type="checkbox" name="isRegion" /> Region game
          </label>
          <button
            type="submit"
            className="col-span-2 rounded-md bg-maroon-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-maroon-800 sm:col-span-6"
          >
            Add game
          </button>
        </form>
      </section>
    </div>
  );
}
