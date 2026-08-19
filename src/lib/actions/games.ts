"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HomeAway } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

export async function createOpponent(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Opponent name is required");

  const opponent = await prisma.opponent.create({ data: { name } });

  revalidatePath("/schedule");
  revalidatePath("/opponents");
  revalidatePath("/admin");
  redirect(`/admin/opponents/${opponent.id}`);
}

export async function setOwnTeamFlag(formData: FormData) {
  await requireAdmin();

  const opponentId = String(formData.get("opponentId") ?? "");
  const isOwnTeam = formData.get("isOwnTeam") === "on";
  if (!opponentId) throw new Error("Missing opponent");

  await prisma.opponent.update({ where: { id: opponentId }, data: { isOwnTeam } });

  revalidatePath(`/opponents/${opponentId}`);
  revalidatePath(`/admin/opponents/${opponentId}`);
  revalidatePath("/opponents");
}

export async function deleteOpponent(formData: FormData) {
  await requireAdmin();

  const opponentId = String(formData.get("opponentId") ?? "");
  if (!opponentId) throw new Error("Missing opponent");

  await prisma.opponent.delete({ where: { id: opponentId } });

  revalidatePath("/opponents");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateOpponentNotes(formData: FormData) {
  await requireAdmin();

  const opponentId = String(formData.get("opponentId") ?? "");
  if (!opponentId) throw new Error("Missing opponent");

  await prisma.opponent.update({
    where: { id: opponentId },
    data: {
      whenWeHaveBall: String(formData.get("whenWeHaveBall") ?? ""),
      whenTheyHaveBall: String(formData.get("whenTheyHaveBall") ?? ""),
      mustStopPlays: String(formData.get("mustStopPlays") ?? ""),
      situationalReminders: String(formData.get("situationalReminders") ?? ""),
      personnelNotes: String(formData.get("personnelNotes") ?? ""),
    },
  });

  revalidatePath(`/opponents/${opponentId}`);
  revalidatePath(`/admin/opponents/${opponentId}`);
}

export async function createGame(formData: FormData) {
  await requireAdmin();

  const opponentId = String(formData.get("opponentId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "").trim() || null;
  const homeAway = String(formData.get("homeAway") ?? "HOME") as HomeAway;
  const isRegion = formData.get("isRegion") === "on";
  const seasonYear = Number(formData.get("seasonYear") ?? new Date().getFullYear());

  if (!opponentId || !dateStr) throw new Error("Opponent and date are required");

  await prisma.game.create({
    data: {
      opponentId,
      date: new Date(dateStr),
      time,
      homeAway,
      isRegion,
      seasonYear,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/admin");
}

export async function updateGameResult(formData: FormData) {
  await requireAdmin();

  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) throw new Error("Missing game");

  const teamScoreRaw = String(formData.get("teamScore") ?? "").trim();
  const oppScoreRaw = String(formData.get("oppScore") ?? "").trim();

  await prisma.game.update({
    where: { id: gameId },
    data: {
      teamScore: teamScoreRaw === "" ? null : Number(teamScoreRaw),
      oppScore: oppScoreRaw === "" ? null : Number(oppScoreRaw),
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/admin");
}

export async function deleteGame(formData: FormData) {
  await requireAdmin();

  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) throw new Error("Missing game");

  await prisma.game.delete({ where: { id: gameId } });

  revalidatePath("/schedule");
  revalidatePath("/admin");
}
