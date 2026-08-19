"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPresignedUploadUrl, deleteObject, publicUrlForKey } from "@/lib/r2";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function requestFilmUploadUrl(
  opponentId: string,
  label: string,
  fileName: string,
  contentType: string,
  gameId?: string | null
): Promise<{ filmId: string; uploadUrl: string; key: string }> {
  await requireAdmin();

  const trimmedLabel = label.trim();
  if (!trimmedLabel) throw new Error("Film label is required");

  const film = await prisma.film.upsert({
    where: { opponentId_label: { opponentId, label: trimmedLabel } },
    update: gameId ? { gameId } : {},
    create: { opponentId, label: trimmedLabel, gameId: gameId ?? undefined },
  });

  const key = `film/${opponentId}/${film.id}/${Date.now()}-${slugify(fileName)}`;
  const uploadUrl = await createPresignedUploadUrl(key, contentType);

  return { filmId: film.id, uploadUrl, key };
}

export async function confirmFilmUpload(
  filmId: string,
  key: string,
  opponentId: string,
  gameId?: string | null
) {
  await requireAdmin();

  await prisma.film.update({
    where: { id: filmId },
    data: { videoKey: key, videoUrl: publicUrlForKey(key) },
  });

  revalidatePath(`/opponents/${opponentId}`);
  revalidatePath(`/admin/opponents/${opponentId}`);
  if (gameId) revalidatePath(`/admin/games/${gameId}`);
}

export async function renameFilm(formData: FormData) {
  await requireAdmin();

  const filmId = String(formData.get("filmId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const opponentId = String(formData.get("opponentId") ?? "");
  const gameId = String(formData.get("gameId") ?? "").trim() || null;
  if (!filmId || !label) throw new Error("Missing film or label");

  const returnPath = gameId ? `/admin/games/${gameId}` : `/admin/opponents/${opponentId}`;

  const clash = await prisma.film.findUnique({
    where: { opponentId_label: { opponentId, label } },
  });
  if (clash && clash.id !== filmId) {
    redirect(
      `${returnPath}?importError=${encodeURIComponent(`A film named "${label}" already exists for this team — pick a different name.`)}`
    );
  }

  await prisma.film.update({ where: { id: filmId }, data: { label } });

  revalidatePath(`/opponents/${opponentId}`);
  revalidatePath(`/admin/opponents/${opponentId}`);
  if (gameId) revalidatePath(`/admin/games/${gameId}`);
  redirect(returnPath);
}

/**
 * Tags (or untags) a scouting film as the actual head-to-head game against
 * Jordan, rather than pre-game intel from the opponent's other games. Tagged
 * film is excluded from the opponent's pre-game scouting numbers and shown
 * instead on that game's own page.
 */
export async function setFilmGame(formData: FormData) {
  await requireAdmin();

  const filmId = String(formData.get("filmId") ?? "");
  const opponentId = String(formData.get("opponentId") ?? "");
  const gameId = String(formData.get("gameId") ?? "").trim() || null;
  if (!filmId) throw new Error("Missing film");

  await prisma.film.update({ where: { id: filmId }, data: { gameId } });

  revalidatePath(`/opponents/${opponentId}`);
  revalidatePath(`/admin/opponents/${opponentId}`);
  if (gameId) revalidatePath(`/games/${gameId}`);
}

/** Deletes a film, its charted plays (cascade), and its video object in R2 if it has one. */
export async function deleteFilm(formData: FormData) {
  await requireAdmin();

  const filmId = String(formData.get("filmId") ?? "");
  const opponentId = String(formData.get("opponentId") ?? "");
  const gameId = String(formData.get("gameId") ?? "").trim() || null;
  if (!filmId) throw new Error("Missing film");

  const film = await prisma.film.findUnique({ where: { id: filmId } });
  if (film?.videoKey) {
    try {
      await deleteObject(film.videoKey);
    } catch {
      // Video object may already be gone; don't block deleting the record over it.
    }
  }

  await prisma.film.delete({ where: { id: filmId } });

  revalidatePath(`/opponents/${opponentId}`);
  revalidatePath(`/admin/opponents/${opponentId}`);
  if (gameId) revalidatePath(`/admin/games/${gameId}`);
  redirect(gameId ? `/admin/games/${gameId}` : `/admin/opponents/${opponentId}`);
}
