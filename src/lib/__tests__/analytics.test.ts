import { describe, expect, it } from "vitest";
import {
  buildDefenseProfile,
  buildOffenseProfile,
  downDistanceBucket,
  fieldZoneBucket,
  offenseTendencyByDownDistance,
  offenseTendencyByFieldZone,
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
