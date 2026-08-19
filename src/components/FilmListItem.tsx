"use client";

import { useState } from "react";
import { renameFilm, deleteFilm, setFilmGame } from "@/lib/actions/film";

export default function FilmListItem({
  film,
  opponentId,
  gameId,
  actualGame,
}: {
  film: { id: string; label: string; videoUrl: string | null; gameId: string | null };
  opponentId: string;
  gameId?: string;
  /** Offer to tag this film as the actual head-to-head game (opponent-level list only). */
  actualGame?: { id: string; label: string };
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="px-3 py-2">
        <form action={renameFilm} className="flex items-center gap-2 text-sm">
          <input type="hidden" name="filmId" value={film.id} />
          <input type="hidden" name="opponentId" value={opponentId} />
          {gameId && <input type="hidden" name="gameId" value={gameId} />}
          <input
            name="label"
            defaultValue={film.label}
            required
            autoFocus
            className="flex-1 rounded-md border border-steel-300 px-2 py-1 text-sm"
          />
          <button type="submit" className="text-xs font-medium text-maroon-700 hover:underline">
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs text-steel-500 hover:underline"
          >
            Cancel
          </button>
        </form>
      </li>
    );
  }

  const isActualGame = actualGame && film.gameId === actualGame.id;

  return (
    <li className="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2">
        {film.label}
        {isActualGame && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            Actual game
          </span>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-3">
        <span className={film.videoUrl ? "text-emerald-600" : "text-steel-400"}>
          {film.videoUrl ? "Video uploaded" : "No video yet"}
        </span>
        {actualGame && (
          <form action={setFilmGame}>
            <input type="hidden" name="filmId" value={film.id} />
            <input type="hidden" name="opponentId" value={opponentId} />
            {!isActualGame && <input type="hidden" name="gameId" value={actualGame.id} />}
            <button type="submit" className="text-xs text-steel-600 hover:underline">
              {isActualGame ? "Unmark as actual game" : `Mark as actual ${actualGame.label} game`}
            </button>
          </form>
        )}
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-steel-600 hover:underline">
          Rename
        </button>
        <form
          action={deleteFilm}
          onSubmit={(e) => {
            if (!confirm(`Delete "${film.label}" and all its charted plays? This can't be undone.`)) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="filmId" value={film.id} />
          <input type="hidden" name="opponentId" value={opponentId} />
          {gameId && <input type="hidden" name="gameId" value={gameId} />}
          <button type="submit" className="text-xs text-red-600 hover:underline">
            Delete
          </button>
        </form>
      </span>
    </li>
  );
}
