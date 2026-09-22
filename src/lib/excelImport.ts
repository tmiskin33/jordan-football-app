import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface ImportResult {
  filmsCreated: number;
  offensePlaysImported: number;
  defensePlaysImported: number;
  specialTeamsPlaysImported: number;
  errors: string[];
}

function headerIndex(sheet: ExcelJS.Worksheet): Map<string, number> {
  const map = new Map<string, number>();
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const value = cell.value;
    if (typeof value === "string" && value.trim()) {
      map.set(value.trim(), colNumber);
    }
  });
  return map;
}

function rawCell(row: ExcelJS.Row, idx: Map<string, number>, header: string): ExcelJS.CellValue {
  const col = idx.get(header);
  if (!col) return null;
  return row.getCell(col).value;
}

function cellStr(row: ExcelJS.Row, idx: Map<string, number>, header: string): string | null {
  const v = rawCell(row, idx, header);
  if (v == null) return null;
  if (typeof v === "object" && "text" in v) {
    const s = String((v as { text: unknown }).text).trim();
    return s === "" ? null : s;
  }
  if (typeof v === "object" && "result" in v) {
    // formula cell
    const s = String((v as { result: unknown }).result ?? "").trim();
    return s === "" ? null : s;
  }
  const s = String(v).trim();
  return s === "" ? null : s;
}

function cellNum(row: ExcelJS.Row, idx: Map<string, number>, header: string): number | null {
  const s = cellStr(row, idx, header);
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cellBool(row: ExcelJS.Row, idx: Map<string, number>, header: string): boolean | null {
  const s = cellStr(row, idx, header);
  if (s == null) return null;
  const t = s.toLowerCase();
  if (t === "y" || t === "yes" || t === "true") return true;
  if (t === "n" || t === "no" || t === "false") return false;
  return null;
}

/** Case-insensitive header lookup — Hudl's own exports aren't guaranteed to match our templates' exact casing. */
function headerIndexCI(sheet: ExcelJS.Worksheet): Map<string, number> {
  const map = new Map<string, number>();
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const value = cell.value;
    if (typeof value === "string" && value.trim()) {
      map.set(value.trim().toUpperCase(), colNumber);
    }
  });
  return map;
}

/** Hudl's Blitz column holds a blitz name/type when blitzed and is blank otherwise (unlike our templates' plain Y/N column). */
function cellBlitz(
  row: ExcelJS.Row,
  idx: Map<string, number>,
  header: string
): { blitz: boolean | null; blitzType: string | null } {
  const s = cellStr(row, idx, header);
  if (s == null) return { blitz: null, blitzType: null };
  const t = s.toLowerCase();
  if (t === "y" || t === "yes" || t === "true") return { blitz: true, blitzType: null };
  if (t === "n" || t === "no" || t === "false") return { blitz: false, blitzType: null };
  return { blitz: true, blitzType: s };
}

/** The one sheet in a Hudl "Playlist Data" export always carries an ODK/QTR/PLAY TYPE column trio; find it regardless of sheet name (Hudl names it generically, e.g. "Sheet1"). */
function findHudlPlaylistSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet | undefined {
  return workbook.worksheets.find((sheet) => {
    const idx = headerIndexCI(sheet);
    return idx.has("ODK") && idx.has("QTR") && idx.has("PLAY TYPE");
  });
}

/**
 * Imports the "Opp Offense/Defense/Special Teams Log" sheets from a scouting
 * workbook (the same shape produced from Hudl exports). Columns are matched
 * by header name, not position, so reordering the sheet doesn't break it.
 * The "(auto)" derived columns (Success, Explosive, Down & Distance, Field
 * Zone, Stop) are intentionally skipped — the app recomputes those from the
 * raw play data. Everything runs in one transaction so a bad sheet doesn't
 * leave a half-imported opponent behind.
 */
export async function importScoutingWorkbook(
  opponentId: string,
  buffer: Buffer,
  gameId?: string | null
): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const result: ImportResult = {
    filmsCreated: 0,
    offensePlaysImported: 0,
    defensePlaysImported: 0,
    specialTeamsPlaysImported: 0,
    errors: [],
  };

  await prisma.$transaction(async (tx) => {
    const filmIdCache = new Map<string, string>();

    async function resolveFilmId(label: string | null): Promise<string | null> {
      if (!label) return null;
      const cached = filmIdCache.get(label);
      if (cached) return cached;
      const film = await tx.film.upsert({
        where: { opponentId_label: { opponentId, label } },
        update: {},
        create: { opponentId, label },
      });
      filmIdCache.set(label, film.id);
      return film.id;
    }

    // --- Opp Offense Log ---
    const offenseSheet = workbook.getWorksheet("Opp Offense Log");
    if (!offenseSheet) {
      result.errors.push('Sheet "Opp Offense Log" not found — no offensive plays imported.');
    } else {
      const idx = headerIndex(offenseSheet);
      const rows: Prisma.OffensePlayCreateManyInput[] = [];
      for (let r = 2; r <= offenseSheet.rowCount; r++) {
        const row = offenseSheet.getRow(r);
        const filmLabel = cellStr(row, idx, "Film / Game");
        const playType = cellStr(row, idx, "Play Type");
        if (!filmLabel && !playType) continue; // fully blank row

        const filmId = await resolveFilmId(filmLabel);
        if (!filmId) {
          result.errors.push(`Opp Offense Log row ${r}: missing "Film / Game" value, skipped.`);
          continue;
        }

        rows.push({
          filmId,
          qtr: cellNum(row, idx, "Qtr"),
          down: cellNum(row, idx, "Down"),
          distance: cellNum(row, idx, "Distance"),
          yardLine: cellNum(row, idx, "Yard Line (to goal)"),
          hash: cellStr(row, idx, "Hash"),
          scoreSituation: cellStr(row, idx, "Score Situation"),
          personnel: cellStr(row, idx, "Personnel"),
          formation: cellStr(row, idx, "Formation"),
          strength: cellStr(row, idx, "Strength"),
          backfield: cellStr(row, idx, "Backfield"),
          motion: cellBool(row, idx, "Motion (Y/N)"),
          playType,
          playCall: cellStr(row, idx, "Play Call / Concept"),
          direction: cellStr(row, idx, "Direction"),
          ballCarrier: cellStr(row, idx, "Ball Carrier / Target"),
          yards: cellNum(row, idx, "Yards"),
          resultType: cellStr(row, idx, "Result Type"),
          front: cellStr(row, idx, "Front"),
          coverage: cellStr(row, idx, "Coverage"),
          blitz: cellBool(row, idx, "Blitz (Y/N)"),
          blitzType: cellStr(row, idx, "Blitz Type"),
        });
      }
      if (rows.length > 0) {
        await tx.offensePlay.createMany({ data: rows });
        result.offensePlaysImported = rows.length;
      }
    }

    // --- Opp Defense Log ---
    const defenseSheet = workbook.getWorksheet("Opp Defense Log");
    if (!defenseSheet) {
      result.errors.push('Sheet "Opp Defense Log" not found — no defensive plays imported.');
    } else {
      const idx = headerIndex(defenseSheet);
      const rows: Prisma.DefensePlayCreateManyInput[] = [];
      for (let r = 2; r <= defenseSheet.rowCount; r++) {
        const row = defenseSheet.getRow(r);
        const filmLabel = cellStr(row, idx, "Film / Game");
        const offPlayType = cellStr(row, idx, "Offense Play Type");
        if (!filmLabel && !offPlayType) continue;

        const filmId = await resolveFilmId(filmLabel);
        if (!filmId) {
          result.errors.push(`Opp Defense Log row ${r}: missing "Film / Game" value, skipped.`);
          continue;
        }

        rows.push({
          filmId,
          qtr: cellNum(row, idx, "Qtr"),
          down: cellNum(row, idx, "Down"),
          distance: cellNum(row, idx, "Distance"),
          yardLine: cellNum(row, idx, "Yard Line (to goal)"),
          hash: cellStr(row, idx, "Hash"),
          defPersonnel: cellStr(row, idx, "Def Personnel"),
          front: cellStr(row, idx, "Front"),
          coverage: cellStr(row, idx, "Coverage"),
          blitz: cellBool(row, idx, "Blitz (Y/N)"),
          blitzType: cellStr(row, idx, "Blitz Type"),
          rushers: cellNum(row, idx, "Rushers (#)"),
          offPlayType,
          formationFaced: cellStr(row, idx, "Formation Faced"),
          offStrength: cellStr(row, idx, "Off Strength"),
          offDirection: cellStr(row, idx, "Off Direction"),
          yardsAllowed: cellNum(row, idx, "Yards Allowed"),
          resultType: cellStr(row, idx, "Result Type"),
        });
      }
      if (rows.length > 0) {
        await tx.defensePlay.createMany({ data: rows });
        result.defensePlaysImported = rows.length;
      }
    }

    // --- Opp Special Teams Log ---
    const stSheet = workbook.getWorksheet("Opp Special Teams Log");
    if (stSheet) {
      const idx = headerIndex(stSheet);
      const rows: Prisma.SpecialTeamsPlayCreateManyInput[] = [];
      for (let r = 2; r <= stSheet.rowCount; r++) {
        const row = stSheet.getRow(r);
        const filmLabel = cellStr(row, idx, "Film / Game");
        const playNum = cellNum(row, idx, "Play #");
        // A real data row always has both; footnote/comment rows some sheets
        // leave below the data (e.g. a trailing note in column A) have a
        // label but no play number, so require both to treat it as data.
        if (!filmLabel || playNum == null) continue;

        const filmId = await resolveFilmId(filmLabel);
        if (!filmId) {
          result.errors.push(`Opp Special Teams Log row ${r}: missing "Film / Game" value, skipped.`);
          continue;
        }

        rows.push({
          filmId,
          playNum,
          odk: cellStr(row, idx, "ODK"),
          qtr: cellNum(row, idx, "Qtr"),
          down: cellNum(row, idx, "Down"),
          distance: cellNum(row, idx, "Distance"),
          yardLine: cellNum(row, idx, "Yard Line (to goal)"),
          hash: cellStr(row, idx, "Hash"),
          playType: cellStr(row, idx, "Play Type"),
          result: cellStr(row, idx, "Result"),
          yards: cellNum(row, idx, "Yards"),
        });
      }
      if (rows.length > 0) {
        await tx.specialTeamsPlay.createMany({ data: rows });
        result.specialTeamsPlaysImported = rows.length;
      }
    }

    result.filmsCreated = filmIdCache.size;

    // Only tag a game when the workbook was unambiguously about that one
    // game (a single film source). Multi-film opponent-scouting workbooks
    // (e.g. several games' worth of charted film in one file) are left
    // untagged rather than mislabeling unrelated film as "this game".
    if (gameId && filmIdCache.size === 1) {
      const [[, onlyFilmId]] = filmIdCache;
      await tx.film.update({ where: { id: onlyFilmId }, data: { gameId } });
    } else if (gameId && filmIdCache.size > 1) {
      result.errors.push(
        `This workbook contains ${filmIdCache.size} film sources, so none were tagged to this specific game — it looks like a multi-game scouting file. Import it from the opponent's Manage page instead if you want it kept general.`
      );
    }
  });

  return result;
}

/** True if this workbook is the self-scout "Team Analytics" shape rather than an opponent-scouting workbook. */
export async function isTeamAnalyticsWorkbook(buffer: Buffer): Promise<boolean> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return !!workbook.getWorksheet("Offense Play-by-Play") || !!workbook.getWorksheet("Defense Play-by-Play");
}

/**
 * Imports the "Offense/Defense Play-by-Play" + "Special Teams Log" sheets
 * from a self-scout "Team Analytics" workbook (our own team's snaps, one
 * game/week per file). Unlike the opponent-scouting workbook, this format is
 * unambiguously about a single game, so every row goes into one Film tagged
 * to that game — no multi-film disambiguation needed.
 */
export async function importTeamAnalyticsWorkbook(
  opponentId: string,
  gameId: string,
  filmLabel: string,
  buffer: Buffer
): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const result: ImportResult = {
    filmsCreated: 0,
    offensePlaysImported: 0,
    defensePlaysImported: 0,
    specialTeamsPlaysImported: 0,
    errors: [],
  };

  await prisma.$transaction(async (tx) => {
    const film = await tx.film.upsert({
      where: { opponentId_label: { opponentId, label: filmLabel } },
      update: { gameId },
      create: { opponentId, label: filmLabel, gameId },
    });
    result.filmsCreated = 1;

    // --- Offense Play-by-Play ---
    const offenseSheet = workbook.getWorksheet("Offense Play-by-Play");
    if (!offenseSheet) {
      result.errors.push('Sheet "Offense Play-by-Play" not found — no offensive plays imported.');
    } else {
      const idx = headerIndex(offenseSheet);
      const rows: Prisma.OffensePlayCreateManyInput[] = [];
      for (let r = 2; r <= offenseSheet.rowCount; r++) {
        const row = offenseSheet.getRow(r);
        const down = cellNum(row, idx, "Down");
        const playType = cellStr(row, idx, "Play Type");
        if (down == null && !playType) continue; // fully blank row

        rows.push({
          filmId: film.id,
          qtr: cellNum(row, idx, "Qtr"),
          down,
          distance: cellNum(row, idx, "Distance"),
          yardLine: cellNum(row, idx, "Yard Line (to goal 1-99)"),
          hash: cellStr(row, idx, "Hash"),
          personnel: cellStr(row, idx, "Personnel"),
          formation: cellStr(row, idx, "Formation"),
          strength: cellStr(row, idx, "Strength"),
          playType,
          playCall: cellStr(row, idx, "Play Call / Concept"),
          direction: cellStr(row, idx, "Direction"),
          ballCarrier: cellStr(row, idx, "Key Player"),
          yards: cellNum(row, idx, "Yards"),
          resultType: cellStr(row, idx, "Result Type"),
          points: cellNum(row, idx, "Points"),
          front: cellStr(row, idx, "Def Front"),
          coverage: cellStr(row, idx, "Coverage"),
          blitz: cellBool(row, idx, "Blitz (Y/N)"),
        });
      }
      if (rows.length > 0) {
        await tx.offensePlay.createMany({ data: rows });
        result.offensePlaysImported = rows.length;
      }
    }

    // --- Defense Play-by-Play ---
    const defenseSheet = workbook.getWorksheet("Defense Play-by-Play");
    if (!defenseSheet) {
      result.errors.push('Sheet "Defense Play-by-Play" not found — no defensive plays imported.');
    } else {
      const idx = headerIndex(defenseSheet);
      const rows: Prisma.DefensePlayCreateManyInput[] = [];
      for (let r = 2; r <= defenseSheet.rowCount; r++) {
        const row = defenseSheet.getRow(r);
        const down = cellNum(row, idx, "Down");
        const playType = cellStr(row, idx, "Play Type");
        if (down == null && !playType) continue;

        rows.push({
          filmId: film.id,
          qtr: cellNum(row, idx, "Qtr"),
          down,
          distance: cellNum(row, idx, "Distance"),
          yardLine: cellNum(row, idx, "Yard Line (to goal 1-99)"),
          hash: cellStr(row, idx, "Hash"),
          defPersonnel: cellStr(row, idx, "Personnel"),
          formationFaced: cellStr(row, idx, "Opp Formation"),
          offStrength: cellStr(row, idx, "Strength"),
          offPlayType: playType,
          offPlayCall: cellStr(row, idx, "Opp Play Call"),
          offDirection: cellStr(row, idx, "Direction"),
          offKeyPlayer: cellStr(row, idx, "Opp Key Player"),
          yardsAllowed: cellNum(row, idx, "Yards Allowed"),
          resultType: cellStr(row, idx, "Result Type"),
          points: cellNum(row, idx, "Points"),
          front: cellStr(row, idx, "Our Front"),
          coverage: cellStr(row, idx, "Our Coverage"),
          blitz: cellBool(row, idx, "Blitz (Y/N)"),
        });
      }
      if (rows.length > 0) {
        await tx.defensePlay.createMany({ data: rows });
        result.defensePlaysImported = rows.length;
      }
    }

    // --- Special Teams Log ---
    const stSheet = workbook.getWorksheet("Special Teams Log");
    if (stSheet) {
      const idx = headerIndex(stSheet);
      const rows: Prisma.SpecialTeamsPlayCreateManyInput[] = [];
      for (let r = 2; r <= stSheet.rowCount; r++) {
        const row = stSheet.getRow(r);
        const playNum = cellNum(row, idx, "Play #");
        if (playNum == null) continue; // footnote/blank rows never carry a play number

        rows.push({
          filmId: film.id,
          playNum,
          odk: cellStr(row, idx, "ODK"),
          qtr: cellNum(row, idx, "Qtr"),
          down: cellNum(row, idx, "Down"),
          distance: cellNum(row, idx, "Distance"),
          yardLine: cellNum(row, idx, "Yard Line (to goal)"),
          hash: cellStr(row, idx, "Hash"),
          playType: cellStr(row, idx, "Play Type"),
          result: cellStr(row, idx, "Result"),
          yards: cellNum(row, idx, "Yards"),
        });
      }
      if (rows.length > 0) {
        await tx.specialTeamsPlay.createMany({ data: rows });
        result.specialTeamsPlaysImported = rows.length;
      }
    }
  });

  return result;
}

/** True if this workbook is a raw Hudl "Playlist Data" export — the flat play-by-play sheet Hudl generates directly, rather than one of our own templates. */
export async function isHudlPlaylistWorkbook(buffer: Buffer): Promise<boolean> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return !!findHudlPlaylistSheet(workbook);
}

/**
 * Imports a raw Hudl "Playlist Data" export: one flat sheet with columns
 * PLAY #, ODK, DN, DIST, HASH, YARD LN, PLAY TYPE, RESULT, GN/LS, OFF FORM,
 * OFF PLAY, OFF STR, PLAY DIR, GAP, PASS ZONE, DEF FRONT, COVERAGE, BLITZ,
 * QTR — no manual re-templating needed, it's exactly what Hudl exports.
 *
 * Every row belongs to one game, so — like the Team Analytics workbook — it
 * all goes into a single Film tagged to that game. Rows are split by the ODK
 * column: "O" -> OffensePlay, "D" -> DefensePlay, anything else (K, S, ...)
 * -> SpecialTeamsPlay, tagged with the raw ODK letter. GAP and PASS ZONE have
 * no home in our schema yet and are dropped.
 */
export async function importHudlPlaylistWorkbook(
  opponentId: string,
  gameId: string,
  filmLabel: string,
  buffer: Buffer
): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const result: ImportResult = {
    filmsCreated: 0,
    offensePlaysImported: 0,
    defensePlaysImported: 0,
    specialTeamsPlaysImported: 0,
    errors: [],
  };

  const sheet = findHudlPlaylistSheet(workbook);
  if (!sheet) {
    result.errors.push('Couldn\'t find a Hudl playlist sheet (expected "ODK", "QTR", and "PLAY TYPE" columns).');
    return result;
  }

  await prisma.$transaction(async (tx) => {
    const film = await tx.film.upsert({
      where: { opponentId_label: { opponentId, label: filmLabel } },
      update: { gameId },
      create: { opponentId, label: filmLabel, gameId },
    });
    result.filmsCreated = 1;

    const idx = headerIndexCI(sheet);
    const offenseRows: Prisma.OffensePlayCreateManyInput[] = [];
    const defenseRows: Prisma.DefensePlayCreateManyInput[] = [];
    const specialTeamsRows: Prisma.SpecialTeamsPlayCreateManyInput[] = [];

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const odk = cellStr(row, idx, "ODK");
      const playNum = cellNum(row, idx, "PLAY #");
      if (!odk && playNum == null) continue; // fully blank row

      const qtr = cellNum(row, idx, "QTR");
      const down = cellNum(row, idx, "DN");
      const distance = cellNum(row, idx, "DIST");
      const yardLine = cellNum(row, idx, "YARD LN");
      const hash = cellStr(row, idx, "HASH");
      const playType = cellStr(row, idx, "PLAY TYPE");
      const resultType = cellStr(row, idx, "RESULT");
      const yards = cellNum(row, idx, "GN/LS");
      const formation = cellStr(row, idx, "OFF FORM");
      const playCall = cellStr(row, idx, "OFF PLAY");
      const strength = cellStr(row, idx, "OFF STR");
      const direction = cellStr(row, idx, "PLAY DIR");
      const front = cellStr(row, idx, "DEF FRONT");
      const coverage = cellStr(row, idx, "COVERAGE");
      const { blitz, blitzType } = cellBlitz(row, idx, "BLITZ");

      if (odk === "O") {
        offenseRows.push({
          filmId: film.id,
          qtr,
          down,
          distance,
          yardLine,
          hash,
          formation,
          strength,
          playType,
          playCall,
          direction,
          yards,
          resultType,
          front,
          coverage,
          blitz,
          blitzType,
        });
      } else if (odk === "D") {
        defenseRows.push({
          filmId: film.id,
          qtr,
          down,
          distance,
          yardLine,
          hash,
          front,
          coverage,
          blitz,
          blitzType,
          offPlayType: playType,
          offPlayCall: playCall,
          formationFaced: formation,
          offStrength: strength,
          offDirection: direction,
          yardsAllowed: yards,
          resultType,
        });
      } else {
        // K (kicking), S, or any other ODK letter: log to Special Teams,
        // tagged with the raw letter so it's still distinguishable.
        specialTeamsRows.push({
          filmId: film.id,
          playNum,
          odk: odk ?? "K",
          qtr,
          down,
          distance,
          yardLine,
          hash,
          playType,
          result: resultType,
          yards,
        });
      }
    }

    if (offenseRows.length > 0) {
      await tx.offensePlay.createMany({ data: offenseRows });
      result.offensePlaysImported = offenseRows.length;
    }
    if (defenseRows.length > 0) {
      await tx.defensePlay.createMany({ data: defenseRows });
      result.defensePlaysImported = defenseRows.length;
    }
    if (specialTeamsRows.length > 0) {
      await tx.specialTeamsPlay.createMany({ data: specialTeamsRows });
      result.specialTeamsPlaysImported = specialTeamsRows.length;
    }
  });

  return result;
}
