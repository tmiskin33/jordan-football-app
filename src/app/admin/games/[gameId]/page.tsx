import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { importWorkbook } from "@/lib/actions/import";
import FilmUploadForm from "@/components/FilmUploadForm";
import FilmListItem from "@/components/FilmListItem";
import SubmitButton from "@/components/SubmitButton";

export const dynamic = "force-dynamic";

export default async function AdminGamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ importSummary?: string; importErrors?: string; importError?: string }>;
}) {
  const { gameId } = await params;
  const { importSummary, importErrors, importError } = await searchParams;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      opponent: true,
      films: { orderBy: { uploadedAt: "asc" } },
    },
  });

  if (!game) notFound();

  const dateLabel = game.date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const defaultLabel = `${game.homeAway === "HOME" ? "vs" : "@"} ${game.opponent.name}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-steel-900">
            {defaultLabel} — {dateLabel}
          </h1>
          <p className="text-sm text-steel-500">
            Charts and film uploaded here are tagged to this specific game.
          </p>
        </div>
        <Link
          href={`/admin/opponents/${game.opponentId}`}
          className="text-sm text-steel-600 hover:underline"
        >
          Manage {game.opponent.name} →
        </Link>
      </div>

      {importSummary && (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{importSummary}</p>
      )}
      {importErrors && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Some rows had issues: {importErrors}
        </p>
      )}
      {importError && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{importError}</p>
      )}

      {/* Excel chart import */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-steel-900">Upload this game's film chart</h2>
        <p className="mt-1 text-xs text-steel-500">
          Upload the charted workbook for this game and it gets parsed in and tagged to {defaultLabel}.
          Works for either an opponent-scouting workbook (Opp Offense/Defense/Special Teams Log) or a
          self-scout &quot;Team Analytics&quot; workbook (Offense/Defense Play-by-Play) — both are
          auto-detected.
        </p>
        <form action={importWorkbook} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="opponentId" value={game.opponentId} />
          <input type="hidden" name="gameId" value={game.id} />
          <input type="hidden" name="filmLabel" value={defaultLabel} />
          <input type="file" name="file" accept=".xlsx" required className="text-sm" />
          <SubmitButton pendingLabel="Importing…">Import</SubmitButton>
        </form>
      </section>

      {/* Film for this game */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-steel-900">Film for this game</h2>
        <ul className="mt-2 divide-y divide-steel-200 rounded-lg border border-steel-200 bg-white">
          {game.films.map((f) => (
            <FilmListItem key={f.id} film={f} opponentId={game.opponentId} gameId={game.id} />
          ))}
          {game.films.length === 0 && (
            <li className="px-3 py-4 text-sm text-steel-500">
              No chart or film tagged to this game yet.
            </li>
          )}
        </ul>
        <div className="mt-3">
          <FilmUploadForm opponentId={game.opponentId} gameId={game.id} defaultLabel={defaultLabel} />
        </div>
      </section>
    </div>
  );
}
