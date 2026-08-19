import { describe, expect, it } from "vitest";
import {
  buildDefenseProfile,
  buildExplosiveProfile,
  buildOffenseProfile,
  downDistanceBucket,
  fieldZoneBucket,
  offenseTendencyByDownDistance,
  offenseTendencyByFieldZone,
  offenseTendencyByHash,
  type DefensePlayLike,
  type OffensePlayLike,
} from "../analytics";
import fixtureRows from "./fixtures-offense-log.json";
import defenseFixtureRows from "./fixtures-defense-pbp.json";

// fixtureRows is the "Opp Offense Log" sheet from a real scouting workbook
// (CVdata1.xlsx, Canyon View, 332 charted offensive snaps), keyed by the
// sheet's own column headers.
type FixtureRow = {
  Down: number | null;
  Distance: number | null;
  "Yard Line (to goal)": number | null;
  "Play Type": string | null;
  Yards: number | null;
  Formation: string | null;
  "Motion (Y/N)": string | null;
  "Result Type": string | null;
  Hash: string | null;
  Direction: string | null;
  "Play Call / Concept": string | null;
  Strength: string | null;
  Qtr: number | null;
};

const rows = fixtureRows as FixtureRow[];

const plays: OffensePlayLike[] = rows.map((r) => ({
  down: r.Down,
  distance: r.Distance,
  yardLine: r["Yard Line (to goal)"],
  playType: r["Play Type"],
  yards: r.Yards,
  formation: r.Formation,
  resultType: r["Result Type"],
  hash: r.Hash,
  direction: r.Direction,
  playCall: r["Play Call / Concept"],
  strength: r.Strength,
  qtr: r.Qtr,
}));

describe("downDistanceBucket", () => {
  it("buckets 1st down at the 10-yard cutoff", () => {
    expect(downDistanceBucket(1, 9)).toBe("1st & Short");
    expect(downDistanceBucket(1, 10)).toBe("1st & 10+");
  });

  it("buckets 2nd/3rd/4th down at 3 and 6 yards", () => {
    expect(downDistanceBucket(2, 3)).toBe("2nd & Short");
    expect(downDistanceBucket(2, 4)).toBe("2nd & Medium");
    expect(downDistanceBucket(2, 6)).toBe("2nd & Medium");
    expect(downDistanceBucket(2, 7)).toBe("2nd & Long");
    expect(downDistanceBucket(3, 20)).toBe("3rd & Long");
    expect(downDistanceBucket(4, 1)).toBe("4th & Short");
  });
});

describe("fieldZoneBucket", () => {
  it("matches the workbook's zone boundaries", () => {
    expect(fieldZoneBucket(5)).toBe("Goal Line (1-5)");
    expect(fieldZoneBucket(6)).toBe("Red Zone (6-20)");
    expect(fieldZoneBucket(20)).toBe("Red Zone (6-20)");
    expect(fieldZoneBucket(21)).toBe("Fringe (21-40)");
    expect(fieldZoneBucket(40)).toBe("Fringe (21-40)");
    expect(fieldZoneBucket(41)).toBe("Midfield (41-60)");
    expect(fieldZoneBucket(60)).toBe("Midfield (41-60)");
    expect(fieldZoneBucket(61)).toBe("Own Side (61-79)");
    expect(fieldZoneBucket(79)).toBe("Own Side (61-79)");
    expect(fieldZoneBucket(80)).toBe("Backed Up (80+)");
  });
});

describe("buildOffenseProfile against the real Canyon View workbook", () => {
  const profile = buildOffenseProfile(plays);

  it("counts total charted snaps and the snaps with a play type", () => {
    // Start Here sheet: "332 offensive snaps ... charted"
    expect(profile.totalSnaps).toBe(332);
    // Offense Tendencies sheet: "Total Snaps Charted" 315 (excludes rows with no play type)
    expect(profile.runs + profile.passes).toBe(315);
    expect(profile.runs).toBe(189);
    expect(profile.passes).toBe(126);
  });

  it("matches the workbook's overall run rate", () => {
    // Game Plan Card: "Overall run %" 0.6
    expect(profile.overallRunRate).toBeCloseTo(0.6, 2);
  });

  it("matches the workbook's most-used formation", () => {
    // Game Plan Card: "Most-used formation" STRONG
    expect(profile.mostUsedFormation).toBe("STRONG");
  });

  it("matches the workbook's success and explosive rates", () => {
    // Game Plan Card: "Their success rate" 0.407643312101911, "Their explosive-play rate" 0.211038961038961
    expect(profile.successRate).toBeCloseTo(0.407643312101911, 6);
    expect(profile.explosiveRate).toBeCloseTo(0.211038961038961, 6);
  });

  it("matches the workbook's run % by down-and-distance situation", () => {
    const bySituation = offenseTendencyByDownDistance(plays);
    const find = (s: string) => bySituation.find((x) => x.situation === s);

    // Game Plan Card rows: situation -> [run%, sample n]
    expect(find("1st & 10+")).toMatchObject({ snaps: 125 });
    expect(find("1st & 10+")!.runRate).toBeCloseTo(0.824, 3);

    expect(find("2nd & Long")).toMatchObject({ snaps: 59 });
    expect(find("2nd & Long")!.runRate).toBeCloseTo(0.525423728813559, 6);

    expect(find("3rd & Long")).toMatchObject({ snaps: 39 });
    expect(find("3rd & Long")!.runRate).toBeCloseTo(0.102564102564103, 6);

    expect(find("3rd & Short")).toMatchObject({ snaps: 13 });
    expect(find("3rd & Short")!.runRate).toBeCloseTo(0.538461538461538, 6);
  });

  it("matches the workbook's run % in the Red Zone", () => {
    // Game Plan Card: "Run % in the Red Zone" 0.68421052631579, n=38
    const byZone = offenseTendencyByFieldZone(plays);
    const redZone = byZone.find((z) => z.situation === "Red Zone (6-20)");
    expect(redZone).toMatchObject({ snaps: 38 });
    expect(redZone!.runRate).toBeCloseTo(0.68421052631579, 6);
  });
});

describe("explosive-play profile against the workbook's Explosive Plays sheet", () => {
  const e = buildExplosiveProfile(plays);

  it("matches the headline explosive counts", () => {
    // Explosive Plays sheet, THE HEADLINE block
    expect(e.totalSnaps).toBe(315);
    expect(e.explosivePlays).toBe(65);
    expect(e.explosiveRate).toBeCloseTo(0.20634920634920634, 6);
    expect(e.explosiveRuns).toBe(35);
    expect(e.explosivePasses).toBe(30);
  });

  it("matches the headline yardage figures", () => {
    expect(e.averageGain).toBeCloseTo(24.138461538461538, 6);
    expect(e.longestRun).toBe(58);
    expect(e.longestPass).toBe(69);
    expect(e.yardsFromExplosives).toBe(1569);
    expect(e.totalYards).toBe(2041);
    expect(e.shareOfOffense).toBeCloseTo(0.7687408133268006, 6);
  });

  it("matches yards per play with the explosives removed", () => {
    // The workbook's key line: strip the chunk plays and this is what's left.
    // Denominator is every non-explosive snap, including ones with no yardage.
    expect(e.yardsPerPlayWithoutExplosives).toBeCloseTo(1.888, 3);
  });
});

describe("concept and hash tables against the workbook", () => {
  const profile = buildOffenseProfile(plays);

  it("matches the workbook's run-concept row for 21 WIDE", () => {
    // RUN CONCEPTS CALLED: 21 WIDE — 7 called, 3.70% of runs, 4.571 avg, 42.86% success, 14.29% explosive, mostly Left
    const c = profile.runConcepts.find((x) => x.concept === "21 WIDE")!;
    expect(c.timesCalled).toBe(7);
    expect(c.shareOfType).toBeCloseTo(0.037037037037037035, 6);
    expect(c.avgYards).toBeCloseTo(4.571428571428571, 6);
    expect(c.successRate).toBeCloseTo(0.42857142857142855, 6);
    expect(c.mostCommonDirection).toBe("Left");
  });

  it("counts a concept called as both run and pass under its dominant type", () => {
    // PASS CONCEPTS CALLED: DUTCH — 5 called, avg 11, 40% success, 40% explosive, mostly Right.
    // One of the five was charted as a Run; the workbook still files DUTCH as a
    // pass concept and counts all five, so this guards that behavior.
    const c = profile.passConcepts.find((x) => x.concept === "DUTCH")!;
    expect(c.timesCalled).toBe(5);
    expect(c.avgYards).toBeCloseTo(11, 6);
    expect(c.successRate).toBeCloseTo(0.4, 6);
    expect(c.explosiveRate).toBeCloseTo(0.4, 6);
    expect(c.mostCommonDirection).toBe("Right");
    expect(profile.runConcepts.find((x) => x.concept === "DUTCH")).toBeUndefined();
  });

  it("matches the workbook's BY HASH table", () => {
    const byHash = offenseTendencyByHash(plays);
    const left = byHash.find((h) => h.situation === "Left hash")!;
    expect(left.snaps).toBe(142);
    expect(left.runRate).toBeCloseTo(0.6549295774647887, 6);
    expect(left.shareOfSnaps).toBeCloseTo(0.4507936507936508, 6);

    expect(byHash.find((h) => h.situation === "Middle")!.snaps).toBe(52);
    expect(byHash.find((h) => h.situation === "Right hash")!.snaps).toBe(121);
  });
});

// fixtureRows is the "Defense Play-by-Play" sheet from a real self-scout
// workbook (Week_1_Team_Analytics_1.xlsx, Jordan vs Canyon View), keyed by
// the sheet's own column headers. Regression guard for a bug where
// buildDefenseProfile read a `playType` field that doesn't exist on the
// DefensePlay DB model (it's `offPlayType`), silently zeroing out every
// defensive stat.
describe("buildDefenseProfile against the real self-scout workbook", () => {
  type DefenseFixtureRow = {
    Down: number | null;
    Distance: number | null;
    "Play Type": string | null;
    "Yards Allowed": number | null;
    "Result Type": string | null;
    "Yard Line (to goal 1-99)": number | null;
    Hash: string | null;
    Qtr: number | null;
  };

  const defensePlays: DefensePlayLike[] = (defenseFixtureRows as DefenseFixtureRow[]).map((r) => ({
    down: r.Down,
    distance: r.Distance,
    offPlayType: r["Play Type"],
    yardsAllowed: r["Yards Allowed"],
    resultType: r["Result Type"],
    yardLine: r["Yard Line (to goal 1-99)"],
    hash: r.Hash,
    qtr: r.Qtr,
  }));

  it("counts every charted row, not just ones with a play type", () => {
    // Start Here sheet: "69 defensive snaps" came across from the film
    expect(buildDefenseProfile(defensePlays).totalSnaps).toBe(69);
  });

  it("counts run/pass snaps among the ones with a play type charted", () => {
    const profile = buildDefenseProfile(defensePlays);
    expect(profile.runs).toBe(2);
    expect(profile.passes).toBe(5);
  });
});
