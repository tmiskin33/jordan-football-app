// Ports the scouting/self-scout workbook formulas (success/explosive
// thresholds, down-distance buckets, field-zone buckets, efficiency splits)
// so numbers here match what the coach already gets out of the spreadsheets.

export interface AnalyticsSettings {
  firstDownSuccessShare: number; // share of distance gained, 1st down
  secondDownSuccessShare: number; // 2nd down
  thirdFourthDownSuccessShare: number; // 3rd/4th down
  explosiveRunYards: number;
  explosivePassYards: number;
}

export const DEFAULT_SETTINGS: AnalyticsSettings = {
  firstDownSuccessShare: 0.5,
  secondDownSuccessShare: 0.7,
  thirdFourthDownSuccessShare: 1,
  explosiveRunYards: 10,
  explosivePassYards: 15,
};

export type PlayTypeLike = string | null | undefined;

function isInterception(resultType: string | null | undefined): boolean {
  if (!resultType) return false;
  const t = resultType.trim().toLowerCase();
  return t === "int" || t.startsWith("interception");
}

/**
 * Success: stayed on schedule for the down (workbook's "Success (auto)" column).
 * Interceptions with no recorded gain/loss still count as failures, per the
 * workbook: "Some interceptions arrived with no gain/loss value. They still
 * count as failed plays." Any other play with no yards value is excluded
 * (returns null) rather than guessed at.
 */
export function isSuccess(
  down: number | null | undefined,
  distance: number | null | undefined,
  yards: number | null | undefined,
  settings: AnalyticsSettings = DEFAULT_SETTINGS,
  resultType?: string | null
): boolean | null {
  if (down == null || distance == null) return null;
  if (yards == null) {
    return isInterception(resultType) ? false : null;
  }
  const share =
    down === 1
      ? settings.firstDownSuccessShare
      : down === 2
        ? settings.secondDownSuccessShare
        : settings.thirdFourthDownSuccessShare;
  return yards >= distance * share;
}

/** Explosive: run >= explosiveRunYards or pass >= explosivePassYards. */
export function isExplosive(
  playType: PlayTypeLike,
  yards: number | null | undefined,
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): boolean | null {
  if (yards == null || !playType) return null;
  const type = playType.trim().toLowerCase();
  if (type === "run") return yards >= settings.explosiveRunYards;
  if (type === "pass") return yards >= settings.explosivePassYards;
  return null;
}

/**
 * Down & Distance bucket.
 * 1st: Short (<10) / 10+ (>=10).
 * 2nd/3rd/4th: Short (1-3) / Medium (4-6) / Long (7+).
 */
export function downDistanceBucket(
  down: number | null | undefined,
  distance: number | null | undefined
): string | null {
  if (down == null || distance == null) return null;
  const downLabel =
    down === 1 ? "1st" : down === 2 ? "2nd" : down === 3 ? "3rd" : down === 4 ? "4th" : null;
  if (!downLabel) return null;

  if (down === 1) {
    return distance >= 10 ? "1st & 10+" : "1st & Short";
  }
  return `${downLabel} & ${distanceRange(distance)}`;
}

function distanceRange(distance: number): "Short" | "Medium" | "Long" {
  return distance <= 3 ? "Short" : distance <= 6 ? "Medium" : "Long";
}

/**
 * Field zone bucket, from yard line = yards from the goal the offense is
 * attacking (1-99, 1 = about to score).
 */
export function fieldZoneBucket(yardLine: number | null | undefined): string | null {
  if (yardLine == null) return null;
  if (yardLine <= 5) return "Goal Line (1-5)";
  if (yardLine <= 20) return "Red Zone (6-20)";
  if (yardLine <= 40) return "Fringe (21-40)";
  if (yardLine <= 60) return "Midfield (41-60)";
  if (yardLine <= 79) return "Own Side (61-79)";
  return "Backed Up (80+)";
}

/** Groups formation strength into Left / Right / Balanced, matching the efficiency dashboard. */
export function strengthBucket(strength: string | null | undefined): string | null {
  if (!strength) return null;
  const t = strength.trim().toUpperCase();
  if (t === "L" || t === "LEFT") return "Strength Left";
  if (t === "R" || t === "RIGHT") return "Strength Right";
  if (t === "BAL" || t === "BALANCED") return "Balanced";
  return null;
}

export interface SituationSplit {
  situation: string;
  snaps: number;
  runs: number;
  passes: number;
  runRate: number | null; // 0-1
  tendency: number | null; // distance from 50/50, 0-1
  yardsPerPlay: number | null;
  yardsPerRun: number | null;
  yardsPerPass: number | null;
  successRate: number | null; // 0-1
  explosiveRate: number | null; // 0-1
}

interface PlayLike {
  down?: number | null;
  distance?: number | null;
  playType?: string | null;
  yards?: number | null;
  resultType?: string | null;
}

export interface OffensePlayLike extends PlayLike {
  yardLine?: number | null;
  formation?: string | null;
  strength?: string | null;
  qtr?: number | null;
  hash?: string | null;
  ballCarrier?: string | null;
  points?: number | null;
}

const SITUATION_ORDER = [
  "1st & Short",
  "1st & 10+",
  "2nd & Short",
  "2nd & Medium",
  "2nd & Long",
  "3rd & Short",
  "3rd & Medium",
  "3rd & Long",
  "4th & Short",
  "4th & Medium",
  "4th & Long",
];

const ZONE_ORDER = [
  "Backed Up (80+)",
  "Own Side (61-79)",
  "Midfield (41-60)",
  "Fringe (21-40)",
  "Red Zone (6-20)",
  "Goal Line (1-5)",
];

const QUARTER_ORDER = ["Q1", "Q2", "Q3", "Q4", "OT"];
const HASH_ORDER = ["Left hash", "Middle", "Right hash"];
const STRENGTH_ORDER = ["Strength Left", "Strength Right", "Balanced"];

function hashLabel(hash: string | null | undefined): string | null {
  if (!hash) return null;
  const t = hash.trim().toUpperCase();
  if (t === "L") return "Left hash";
  if (t === "M") return "Middle";
  if (t === "R") return "Right hash";
  return null;
}

function quarterLabel(qtr: number | null | undefined): string | null {
  if (qtr == null) return null;
  if (qtr >= 1 && qtr <= 4) return `Q${qtr}`;
  if (qtr === 5) return "OT";
  return null;
}

/** Generic grouped breakdown, ordered by a fixed situation order when given, otherwise by snap count. */
function buildGroupedSplits<T extends PlayLike>(
  plays: T[],
  keyFn: (p: T) => string | null,
  order: string[] | null,
  settings: AnalyticsSettings
): SituationSplit[] {
  const buckets = new Map<string, T[]>();
  for (const p of plays) {
    if (!p.playType) continue; // only snaps with a play type count, matching the workbook
    const key = keyFn(p);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }

  if (order) {
    const results: SituationSplit[] = [];
    for (const key of order) {
      const snapsArr = buckets.get(key);
      if (!snapsArr || snapsArr.length === 0) continue;
      results.push(summarizeSplit(key, snapsArr, settings));
    }
    return results;
  }

  return Array.from(buckets.entries())
    .map(([key, snapsArr]) => summarizeSplit(key, snapsArr, settings))
    .sort((a, b) => b.snaps - a.snaps);
}

export function offenseTendencyByDownDistance(
  plays: OffensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return buildGroupedSplits(plays, (p) => downDistanceBucket(p.down, p.distance), SITUATION_ORDER, settings);
}

export function offenseTendencyByFormation(
  plays: OffensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return buildGroupedSplits(plays, (p) => p.formation ?? null, null, settings);
}

export function offenseTendencyByFieldZone(
  plays: OffensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return buildGroupedSplits(plays, (p) => fieldZoneBucket(p.yardLine), ZONE_ORDER, settings);
}

export function offenseTendencyByQuarter(
  plays: OffensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return buildGroupedSplits(plays, (p) => quarterLabel(p.qtr), QUARTER_ORDER, settings);
}

export function offenseTendencyByHash(
  plays: OffensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return buildGroupedSplits(plays, (p) => hashLabel(p.hash), HASH_ORDER, settings);
}

export function offenseTendencyByStrength(
  plays: OffensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return buildGroupedSplits(plays, (p) => strengthBucket(p.strength), STRENGTH_ORDER, settings);
}

function summarizeSplit<T extends PlayLike>(
  situation: string,
  plays: T[],
  settings: AnalyticsSettings
): SituationSplit {
  const snaps = plays.length;
  let runs = 0;
  let passes = 0;
  let successCount = 0;
  let successSample = 0;
  let explosiveCount = 0;
  let explosiveSample = 0;
  let totalYards = 0;
  let yardsSample = 0;
  let runYards = 0;
  let runYardsSample = 0;
  let passYards = 0;
  let passYardsSample = 0;

  for (const p of plays) {
    const type = p.playType?.trim().toLowerCase();
    if (type === "run") runs++;
    else if (type === "pass") passes++;

    if (p.yards != null) {
      totalYards += p.yards;
      yardsSample++;
      if (type === "run") {
        runYards += p.yards;
        runYardsSample++;
      } else if (type === "pass") {
        passYards += p.yards;
        passYardsSample++;
      }
    }

    const success = isSuccess(p.down, p.distance, p.yards, settings, p.resultType);
    if (success != null) {
      successSample++;
      if (success) successCount++;
    }
    const explosive = isExplosive(p.playType, p.yards, settings);
    if (explosive != null) {
      explosiveSample++;
      if (explosive) explosiveCount++;
    }
  }

  const calledPlays = runs + passes;
  const runRate = calledPlays > 0 ? runs / calledPlays : null;
  const tendency = runRate != null ? Math.abs(runRate - 0.5) * 2 : null;

  return {
    situation,
    snaps,
    runs,
    passes,
    runRate,
    tendency,
    yardsPerPlay: yardsSample > 0 ? totalYards / yardsSample : null,
    yardsPerRun: runYardsSample > 0 ? runYards / runYardsSample : null,
    yardsPerPass: passYardsSample > 0 ? passYards / passYardsSample : null,
    successRate: successSample > 0 ? successCount / successSample : null,
    explosiveRate: explosiveSample > 0 ? explosiveCount / explosiveSample : null,
  };
}

export interface ConversionRow {
  situation: string;
  attempts: number;
  conversions: number;
  conversionRate: number | null;
  runs: number;
  passes: number;
  runRate: number | null;
  avgYards: number | null;
}

/**
 * 3rd/4th down conversion tracking: converting = gaining the full distance
 * (same success formula, since the 3rd/4th down success share is 100%).
 */
export function buildConversionRows<T extends PlayLike>(
  plays: T[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): ConversionRow[] {
  const thirdDown = plays.filter((p) => p.playType && p.down === 3);
  const fourthDown = plays.filter((p) => p.playType && p.down === 4);
  const thirdByRange = (range: "Short" | "Medium" | "Long") =>
    thirdDown.filter((p) => p.distance != null && distanceRange(p.distance) === range);

  const rows: [string, T[]][] = [
    ["3rd Down — All", thirdDown],
    ["3rd & Long (7+)", thirdByRange("Long")],
    ["3rd & Medium (4-6)", thirdByRange("Medium")],
    ["3rd & Short (1-3)", thirdByRange("Short")],
    ["4th Down — All", fourthDown],
  ];

  return rows
    .filter(([, arr]) => arr.length > 0)
    .map(([situation, arr]) => {
      let conversions = 0;
      let runs = 0;
      let passes = 0;
      let totalYards = 0;
      let yardsSample = 0;
      for (const p of arr) {
        const success = isSuccess(p.down, p.distance, p.yards, settings, p.resultType);
        if (success) conversions++;
        const type = p.playType?.trim().toLowerCase();
        if (type === "run") runs++;
        else if (type === "pass") passes++;
        if (p.yards != null) {
          totalYards += p.yards;
          yardsSample++;
        }
      }
      const calledPlays = runs + passes;
      return {
        situation,
        attempts: arr.length,
        conversions,
        conversionRate: arr.length > 0 ? conversions / arr.length : null,
        runs,
        passes,
        runRate: calledPlays > 0 ? runs / calledPlays : null,
        avgYards: yardsSample > 0 ? totalYards / yardsSample : null,
      };
    });
}

export interface PlayerUsageRow {
  player: string;
  touches: number;
  yards: number;
  yardsPerTouch: number | null;
  successRate: number | null;
  explosiveRate: number | null;
  touchdowns: number;
}

/** Groups offensive snaps by ball carrier / key player (self-scout only, usually). */
export function buildPlayerUsage(
  plays: OffensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): PlayerUsageRow[] {
  const buckets = new Map<string, OffensePlayLike[]>();
  for (const p of plays) {
    if (!p.playType || !p.ballCarrier) continue;
    if (!buckets.has(p.ballCarrier)) buckets.set(p.ballCarrier, []);
    buckets.get(p.ballCarrier)!.push(p);
  }

  return Array.from(buckets.entries())
    .map(([player, arr]) => {
      let yards = 0;
      let successCount = 0;
      let successSample = 0;
      let explosiveCount = 0;
      let explosiveSample = 0;
      let touchdowns = 0;
      for (const p of arr) {
        if (p.yards != null) yards += p.yards;
        if (p.resultType?.trim().toUpperCase() === "TD") touchdowns++;
        const success = isSuccess(p.down, p.distance, p.yards, settings, p.resultType);
        if (success != null) {
          successSample++;
          if (success) successCount++;
        }
        const explosive = isExplosive(p.playType, p.yards, settings);
        if (explosive != null) {
          explosiveSample++;
          if (explosive) explosiveCount++;
        }
      }
      return {
        player,
        touches: arr.length,
        yards,
        yardsPerTouch: arr.length > 0 ? yards / arr.length : null,
        successRate: successSample > 0 ? successCount / successSample : null,
        explosiveRate: explosiveSample > 0 ? explosiveCount / explosiveSample : null,
        touchdowns,
      };
    })
    .sort((a, b) => b.touches - a.touches);
}

function countResult(plays: PlayLike[], match: (r: string) => boolean): number {
  return plays.filter((p) => p.resultType && match(p.resultType.trim().toLowerCase())).length;
}

export interface OffenseProfile {
  totalSnaps: number;
  runs: number;
  passes: number;
  overallRunRate: number | null;
  mostUsedFormation: string | null;
  totalYards: number;
  yardsPerPlay: number | null;
  yardsPerRun: number | null;
  yardsPerPass: number | null;
  successRate: number | null;
  explosiveRate: number | null;
  explosivePlays: number;
  firstDowns: number;
  touchdowns: number;
  interceptions: number;
  fumblesLost: number;
  sacks: number;
  penalties: number;
  byDownDistance: SituationSplit[];
  byFormation: SituationSplit[];
  byFieldZone: SituationSplit[];
  byQuarter: SituationSplit[];
  byHash: SituationSplit[];
  byStrength: SituationSplit[];
  conversions: ConversionRow[];
  playerUsage: PlayerUsageRow[];
}

/** Mirrors the "Game Plan Card" / "Offensive Efficiency" headline numbers. */
export function buildOffenseProfile(
  plays: OffensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): OffenseProfile {
  const byDownDistance = offenseTendencyByDownDistance(plays, settings);
  const byFormation = offenseTendencyByFormation(plays, settings);
  const byFieldZone = offenseTendencyByFieldZone(plays, settings);
  const byQuarter = offenseTendencyByQuarter(plays, settings);
  const byHash = offenseTendencyByHash(plays, settings);
  const byStrength = offenseTendencyByStrength(plays, settings);

  const countedPlays = plays.filter((p) => !!p.playType);
  const overall = summarizeSplit("Overall", countedPlays, settings);
  const explosivePlays = countedPlays.filter((p) => isExplosive(p.playType, p.yards, settings)).length;

  return {
    totalSnaps: plays.length,
    runs: overall.runs,
    passes: overall.passes,
    overallRunRate: overall.runRate,
    mostUsedFormation: byFormation[0]?.situation ?? null,
    totalYards: countedPlays.reduce((sum, p) => sum + (p.yards ?? 0), 0),
    yardsPerPlay: overall.yardsPerPlay,
    yardsPerRun: overall.yardsPerRun,
    yardsPerPass: overall.yardsPerPass,
    successRate: overall.successRate,
    explosiveRate: overall.explosiveRate,
    explosivePlays,
    firstDowns: countResult(countedPlays, (r) => r === "first down"),
    touchdowns: countResult(countedPlays, (r) => r === "td"),
    interceptions: countResult(countedPlays, (r) => r === "int" || r.startsWith("interception")),
    fumblesLost: countResult(countedPlays, (r) => r === "fumble lost"),
    sacks: countResult(countedPlays, (r) => r.startsWith("sack")),
    penalties: countResult(countedPlays, (r) => r === "penalty"),
    byDownDistance,
    byFormation,
    byFieldZone,
    byQuarter,
    byHash,
    byStrength,
    conversions: buildConversionRows(plays, settings),
    playerUsage: buildPlayerUsage(plays, settings),
  };
}

export interface DefensePlayLike {
  down?: number | null;
  distance?: number | null;
  offPlayType?: string | null; // the opponent's play type — "playType" on the DB model is named from the offense's perspective
  yardsAllowed?: number | null;
  resultType?: string | null;
  yardLine?: number | null;
  front?: string | null;
  coverage?: string | null;
  blitz?: boolean | null;
  formationFaced?: string | null;
  qtr?: number | null;
  hash?: string | null;
}

/** Stop = defense won the down (offense fell short of down-and-distance success). */
export function isStop(
  down: number | null | undefined,
  distance: number | null | undefined,
  yardsAllowed: number | null | undefined,
  settings: AnalyticsSettings = DEFAULT_SETTINGS,
  resultType?: string | null
): boolean | null {
  const success = isSuccess(down, distance, yardsAllowed, settings, resultType);
  return success == null ? null : !success;
}

/** Maps the defense-side field names onto the shared PlayLike shape (offPlayType -> playType, yardsAllowed -> yards). */
function toPlayLike(p: DefensePlayLike): DefensePlayLike & PlayLike {
  return { ...p, playType: p.offPlayType, yards: p.yardsAllowed };
}

function defenseSummarize(plays: DefensePlayLike[], settings: AnalyticsSettings) {
  return summarizeSplit("Overall", plays.map(toPlayLike), settings);
}

function defenseGroupedSplits(
  plays: DefensePlayLike[],
  keyFn: (p: DefensePlayLike) => string | null,
  order: string[] | null,
  settings: AnalyticsSettings
): SituationSplit[] {
  return buildGroupedSplits(plays.map(toPlayLike), keyFn, order, settings);
}

export function defenseTendencyByDownDistance(
  plays: DefensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return defenseGroupedSplits(plays, (p) => downDistanceBucket(p.down, p.distance), SITUATION_ORDER, settings);
}

export function defenseTendencyByFormationFaced(
  plays: DefensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return defenseGroupedSplits(plays, (p) => p.formationFaced ?? null, null, settings);
}

export function defenseTendencyByFieldZone(
  plays: DefensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return defenseGroupedSplits(plays, (p) => fieldZoneBucket(p.yardLine), ZONE_ORDER, settings);
}

export function defenseTendencyByQuarter(
  plays: DefensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return defenseGroupedSplits(plays, (p) => quarterLabel(p.qtr), QUARTER_ORDER, settings);
}

export function defenseTendencyByHash(
  plays: DefensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): SituationSplit[] {
  return defenseGroupedSplits(plays, (p) => hashLabel(p.hash), HASH_ORDER, settings);
}

export interface DefenseProfile {
  totalSnaps: number;
  runs: number;
  passes: number;
  opponentRunRate: number | null;
  mostUsedFront: string | null;
  mostUsedCoverage: string | null;
  blitzRate: number | null;
  yardsAllowed: number;
  yardsAllowedPerPlay: number | null;
  yardsAllowedPerRun: number | null;
  yardsAllowedPerPass: number | null;
  opponentSuccessRate: number | null;
  stopRate: number | null;
  explosivePlaysAllowedRate: number | null;
  explosivePlaysAllowed: number;
  firstDownsAllowed: number;
  touchdownsAllowed: number;
  takeaways: number;
  sacksRecorded: number;
  penalties: number;
  byDownDistance: SituationSplit[];
  byFormationFaced: SituationSplit[];
  byFieldZone: SituationSplit[];
  byQuarter: SituationSplit[];
  byHash: SituationSplit[];
  conversionsAllowed: ConversionRow[];
}

/** Mirrors the "Game Plan Card" / "Defense Efficiency" headline numbers. */
export function buildDefenseProfile(
  plays: DefensePlayLike[],
  settings: AnalyticsSettings = DEFAULT_SETTINGS
): DefenseProfile {
  const fronts = new Map<string, number>();
  const coverages = new Map<string, number>();
  let blitzes = 0;
  let blitzSample = 0;

  for (const p of plays) {
    if (p.front) fronts.set(p.front, (fronts.get(p.front) ?? 0) + 1);
    if (p.coverage) coverages.set(p.coverage, (coverages.get(p.coverage) ?? 0) + 1);
    if (p.blitz != null) {
      blitzSample++;
      if (p.blitz) blitzes++;
    }
  }

  const topOf = (m: Map<string, number>) =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const countedPlays = plays.filter((p) => !!p.offPlayType);
  const overall = defenseSummarize(countedPlays, settings);
  const explosivePlaysAllowed = countedPlays.filter((p) =>
    isExplosive(p.offPlayType, p.yardsAllowed, settings)
  ).length;

  return {
    totalSnaps: plays.length,
    runs: overall.runs,
    passes: overall.passes,
    opponentRunRate: overall.runRate,
    mostUsedFront: topOf(fronts),
    mostUsedCoverage: topOf(coverages),
    blitzRate: blitzSample > 0 ? blitzes / blitzSample : null,
    yardsAllowed: countedPlays.reduce((sum, p) => sum + (p.yardsAllowed ?? 0), 0),
    yardsAllowedPerPlay: overall.yardsPerPlay,
    yardsAllowedPerRun: overall.yardsPerRun,
    yardsAllowedPerPass: overall.yardsPerPass,
    opponentSuccessRate: overall.successRate,
    stopRate: overall.successRate == null ? null : 1 - overall.successRate,
    explosivePlaysAllowedRate: overall.explosiveRate,
    explosivePlaysAllowed,
    firstDownsAllowed: countResult(countedPlays, (r) => r === "first down"),
    touchdownsAllowed: countResult(countedPlays, (r) => r === "td"),
    takeaways: countResult(countedPlays, (r) => r === "int" || r.startsWith("interception") || r === "fumble lost"),
    sacksRecorded: countResult(countedPlays, (r) => r.startsWith("sack")),
    penalties: countResult(countedPlays, (r) => r === "penalty"),
    byDownDistance: defenseTendencyByDownDistance(plays, settings),
    byFormationFaced: defenseTendencyByFormationFaced(plays, settings),
    byFieldZone: defenseTendencyByFieldZone(plays, settings),
    byQuarter: defenseTendencyByQuarter(plays, settings),
    byHash: defenseTendencyByHash(plays, settings),
    conversionsAllowed: buildConversionRows(plays.map(toPlayLike), settings),
  };
}
