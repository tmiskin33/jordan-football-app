"use client";

import { useMemo, useState } from "react";

export interface TendencyPlay {
  down: number;
  distance: "Short" | "Medium" | "Long";
  type: string; // Run / Pass
  concept: string | null; // play call
  /** Field zone label (yards from the goal they're attacking), e.g. "Red Zone (6-20)". */
  zone?: string | null;
}

// Starter data so the tab works before any film is charted; replaced by real
// charted plays wherever the page passes them in.
export const samplePastData: TendencyPlay[] = [
  { down: 1, distance: "Medium", type: "Run", concept: "Inside Zone", zone: "Midfield (41-60)" },
  { down: 2, distance: "Short", type: "Run", concept: "Power", zone: "Red Zone (6-20)" },
  { down: 3, distance: "Long", type: "Pass", concept: "Mesh", zone: "Own Side (61-79)" },
  { down: 1, distance: "Medium", type: "Pass", concept: "PA Crossers", zone: "Midfield (41-60)" },
  { down: 3, distance: "Medium", type: "Pass", concept: "Stick", zone: "Fringe (21-40)" },
];

const DOWNS = [1, 2, 3, 4] as const;
const DISTANCES = [
  { value: "Short", label: "1-3 yds" },
  { value: "Medium", label: "4-6 yds" },
  { value: "Long", label: "7+ yds" },
] as const;

// Yardage shown is distance to the goal they're attacking, matching the charts.
const ZONES = [
  { value: null, label: "Anywhere", sub: "whole field" },
  { value: "Backed Up (80+)", label: "Backed Up", sub: "80+ out" },
  { value: "Own Side (61-79)", label: "Own Side", sub: "61-79 out" },
  { value: "Midfield (41-60)", label: "Midfield", sub: "41-60 out" },
  { value: "Fringe (21-40)", label: "Fringe", sub: "21-40 out" },
  { value: "Red Zone (6-20)", label: "Red Zone", sub: "6-20 out" },
  { value: "Goal Line (1-5)", label: "Goal Line", sub: "1-5 out" },
] as const;

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function ordinal(down: number) {
  return `${down}${down === 1 ? "st" : down === 2 ? "nd" : down === 3 ? "rd" : "th"}`;
}

export default function LiveTendencies({
  plays,
  isSample = false,
}: {
  plays?: TendencyPlay[];
  /** Set when the plays shown are the built-in sample rather than charted film. */
  isSample?: boolean;
}) {
  const data = plays && plays.length > 0 ? plays : samplePastData;
  const usingSample = isSample || !plays || plays.length === 0;

  const [down, setDown] = useState<number>(1);
  const [distance, setDistance] = useState<TendencyPlay["distance"]>("Medium");
  const [zone, setZone] = useState<string | null>(null);

  const prediction = useMemo(() => {
    // Match as tightly as the data allows, widening one step at a time —
    // drop field position first (down & distance is the stronger tell), then
    // distance, then everything — and always say which level the numbers came
    // from so a thin sample can't masquerade as a strong read.
    const zoneLabel = ZONES.find((z) => z.value === zone)?.label ?? "";
    const downDist = data.filter((p) => p.down === down && p.distance === distance);
    const tiers: [TendencyPlay[], string][] = [
      ...(zone
        ? ([
            [
              downDist.filter((p) => p.zone === zone),
              `${downDist.filter((p) => p.zone === zone).length} snap(s) at ${ordinal(down)} & ${distance} in the ${zoneLabel.toLowerCase()}.`,
            ],
          ] as [TendencyPlay[], string][])
        : []),
      [
        downDist,
        zone
          ? `Nothing charted at ${ordinal(down)} & ${distance} in the ${zoneLabel.toLowerCase()} — showing their ${ordinal(down)} & ${distance} snaps from anywhere on the field.`
          : `SNAPS snap(s) at ${ordinal(down)} & ${distance}.`,
      ],
      [
        data.filter((p) => p.down === down),
        `No snaps charted at ${ordinal(down)} & ${distance} — showing all their ${ordinal(down)}-down snaps instead.`,
      ],
      [data, `Nothing charted on this down — showing all charted snaps.`],
    ];

    const [matches, note] = tiers.find(([arr]) => arr.length > 0) ?? [[], "No plays charted yet."];

    const runs = matches.filter((p) => p.type.trim().toLowerCase() === "run").length;
    const passes = matches.filter((p) => p.type.trim().toLowerCase() === "pass").length;

    const conceptCounts = new Map<string, number>();
    for (const p of matches) {
      if (!p.concept) continue;
      conceptCounts.set(p.concept, (conceptCounts.get(p.concept) ?? 0) + 1);
    }
    const topConcepts = Array.from(conceptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const likelyType = runs === passes ? null : runs > passes ? "Run" : "Pass";

    return {
      matches,
      note: note.replace("SNAPS", String(matches.length)).replace("snap(s)", matches.length === 1 ? "snap" : "snaps"),
      runs,
      passes,
      topConcepts,
      likelyType,
    };
  }, [data, down, distance, zone]);

  const { matches, note, runs, passes, topConcepts, likelyType } = prediction;
  const runPct = pct(runs, runs + passes);

  return (
    <div className="rounded-2xl border border-steel-200 bg-white p-5 shadow-sm">
      {usingSample && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          Showing sample data — chart film for this opponent and their real plays take over.
        </p>
      )}

      {/* Situation picker — big targets so it's usable on a phone during a game */}
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-steel-500">Down</p>
          <div className="flex gap-1.5">
            {DOWNS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDown(d)}
                className={`h-11 w-11 rounded-md text-sm font-bold transition ${
                  down === d
                    ? "bg-maroon-700 text-white"
                    : "border border-steel-300 text-steel-700 hover:bg-steel-100"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-steel-500">Distance</p>
          <div className="flex gap-1.5">
            {DISTANCES.map((dist) => (
              <button
                key={dist.value}
                type="button"
                onClick={() => setDistance(dist.value)}
                className={`flex h-12 flex-col items-center justify-center rounded-md px-4 transition ${
                  distance === dist.value
                    ? "bg-maroon-700 text-white"
                    : "border border-steel-300 text-steel-700 hover:bg-steel-100"
                }`}
              >
                <span className="text-sm font-bold leading-tight">{dist.value}</span>
                <span
                  className={`text-[10px] leading-tight ${
                    distance === dist.value ? "text-maroon-200" : "text-steel-400"
                  }`}
                >
                  {dist.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-steel-500">
          Field position <span className="font-normal normal-case">(yards from the goal they&apos;re attacking)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ZONES.map((z) => (
            <button
              key={z.label}
              type="button"
              onClick={() => setZone(z.value)}
              className={`flex h-12 flex-col items-center justify-center rounded-md px-3 transition ${
                zone === z.value
                  ? "bg-maroon-700 text-white"
                  : "border border-steel-300 text-steel-700 hover:bg-steel-100"
              }`}
            >
              <span className="text-sm font-bold leading-tight">{z.label}</span>
              <span
                className={`text-[10px] leading-tight ${
                  zone === z.value ? "text-maroon-200" : "text-steel-400"
                }`}
              >
                {z.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Prediction */}
      <div className="mt-5 rounded-xl border border-steel-200 bg-steel-50 p-5">
        {matches.length === 0 ? (
          <p className="text-sm text-steel-500">No plays charted yet.</p>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">
              Expect
            </p>
            <p className="mt-1 text-2xl font-bold text-maroon-700">
              {likelyType ?? "Toss-up"}
              {topConcepts[0] && (
                <span className="text-steel-800"> — watch for {topConcepts[0][0]}</span>
              )}
            </p>

            {/* Run/pass bar */}
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-steel-200">
              <div className="bg-maroon-700" style={{ width: `${runPct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-steel-600">
              <span>
                Run {runPct}% ({runs})
              </span>
              <span>
                Pass {100 - runPct}% ({passes})
              </span>
            </div>

            {topConcepts.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-steel-700">
                {topConcepts.map(([concept, count]) => (
                  <li key={concept} className="flex justify-between">
                    <span>{concept}</span>
                    <span className="text-steel-500">
                      {count} of {matches.length}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 text-xs text-steel-500">
              {note}
              {matches.length < 8 && " Small sample — treat as a hint, not a read."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
