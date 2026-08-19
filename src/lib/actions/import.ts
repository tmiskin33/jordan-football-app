"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { importScoutingWorkbook, importTeamAnalyticsWorkbook, isTeamAnalyticsWorkbook } from "@/lib/excelImport";

export async function importWorkbook(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const opponentId = String(formData.get("opponentId") ?? "");
  const gameId = String(formData.get("gameId") ?? "").trim() || null;
  const filmLabel = String(formData.get("filmLabel") ?? "").trim() || null;
  const file = formData.get("file");

  const returnPath = gameId ? `/admin/games/${gameId}` : `/admin/opponents/${opponentId}`;

  if (!opponentId) throw new Error("Missing opponent");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`${returnPath}?importError=${encodeURIComponent("Choose a workbook (.xlsx) to upload.")}`);
  }

  const arrayBuffer = await (file as File).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const isTeamAnalytics = await isTeamAnalyticsWorkbook(buffer);

  if (isTeamAnalytics && (!gameId || !filmLabel)) {
    redirect(
      `${returnPath}?importError=${encodeURIComponent(
        'This looks like a self-scout "Team Analytics" workbook (one game per file) — upload it from that game\'s "chart/film" page instead of the general import.'
      )}`
    );
  }

  const result = isTeamAnalytics
    ? await importTeamAnalyticsWorkbook(opponentId, gameId!, filmLabel!, buffer)
    : await importScoutingWorkbook(opponentId, buffer, gameId);

  revalidatePath(`/opponents/${opponentId}`);
  revalidatePath(`/admin/opponents/${opponentId}`);
  revalidatePath("/schedule");
  if (gameId) revalidatePath(`/admin/games/${gameId}`);

  const summary = `Imported ${result.offensePlaysImported} offensive, ${result.defensePlaysImported} defensive, and ${result.specialTeamsPlaysImported} special-teams plays across ${result.filmsCreated} film(s).`;
  const params = new URLSearchParams({ importSummary: summary });
  if (result.errors.length > 0) {
    params.set("importErrors", result.errors.join(" | "));
  }
  redirect(`${returnPath}?${params.toString()}`);
}
