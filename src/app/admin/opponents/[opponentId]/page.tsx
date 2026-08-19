import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setOwnTeamFlag, deleteOpponent } from "@/lib/actions/games";
import { importWorkbook } from "@/lib/actions/import";
import FilmUploadForm from "@/components/FilmUploadForm";
import FilmListItem from "@/components/FilmListItem";
import SubmitButton from "@/components/SubmitButton";
import ConfirmButton from "@/components/ConfirmButton";

export const dynamic = "force-dynamic";

export default async function AdminOpponentPage({
  params,
  searchParams,
}: {
  params: Promise<{ opponentId: string }>;
  searchParams: Promise<{ importSummary?: string; importErrors?: string; importError?: string }>;
}) {
  const { opponentId } = await params;
  const { importSummary, importErrors, importError } = await searchParams;

  const opponent = await prisma.opponent.findUnique({
    where: { id: opponentId },
    include: {
      films: { orderBy: { uploadedAt: "asc" } },
      games: { orderBy: { date: "asc" }, take: 1 },
    },
  });

  if (!opponent) notFound();

  const actualGame = opponent.games[0]
    ? { id: opponent.games[0].id, label: opponent.name }
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-steel-900">Manage: {opponent.name}</h1>
        <Link href={`/opponents/${opponent.id}`} className="text-sm text-steel-600 hover:underline">
          View public page →
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

      {/* Own team flag */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-steel-900">Visibility</h2>
        <form action={setOwnTeamFlag} className="mt-2 flex items-center gap-2 text-sm">
          <input type="hidden" name="opponentId" value={opponent.id} />
          <input
            type="checkbox"
            id="isOwnTeam"
            name="isOwnTeam"
            defaultChecked={opponent.isOwnTeam}
            className="h-4 w-4"
          />
          <label htmlFor="isOwnTeam">
            This is our own team&apos;s self-scout report (kept private, coaches-only)
          </label>
          <button
            type="submit"
            className="ml-2 rounded-md border border-steel-300 px-2 py-1 text-xs hover:bg-steel-100"
          >
            Save
          </button>
        </form>
      </section>

      {/* Excel import */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-steel-900">Import charted film (Excel)</h2>
        <p className="mt-1 text-xs text-steel-500">
          Upload the scouting workbook — the Opp Offense/Defense/Special Teams Log sheets get parsed in;
          the tendency and game-plan sheets are ignored since the site recomputes those.
        </p>
        <form action={importWorkbook} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="opponentId" value={opponent.id} />
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="text-sm"
          />
          <SubmitButton pendingLabel="Importing…">Import</SubmitButton>
        </form>
      </section>

      {/* Film upload */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-steel-900">Film</h2>
        <ul className="mt-2 divide-y divide-steel-200 rounded-lg border border-steel-200 bg-white">
          {opponent.films.map((f) => (
            <FilmListItem key={f.id} film={f} opponentId={opponent.id} actualGame={actualGame} />
          ))}
          {opponent.films.length === 0 && (
            <li className="px-3 py-4 text-sm text-steel-500">No film logged yet — import a workbook first.</li>
          )}
        </ul>
        <div className="mt-3">
          <FilmUploadForm opponentId={opponent.id} />
        </div>
      </section>

      {/* Danger zone */}
      <section className="mt-10 border-t border-steel-200 pt-4">
        <form action={deleteOpponent}>
          <input type="hidden" name="opponentId" value={opponent.id} />
          <ConfirmButton
            message={`Delete ${opponent.name} along with every charted play and film record? This can't be undone.`}
            className="text-xs text-red-600 hover:underline"
          >
            Delete this opponent and all its charted film
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}
