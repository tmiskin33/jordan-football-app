"use client";

import { useMemo, useState } from "react";

export interface PlayLogRow {
  id: string;
  film: string;
  qtr: number | null;
  down: number | null;
  distance: number | null;
  yardLine: number | null;
  formation: string | null;
  playType: string | null;
  playCall: string | null;
  yards: number | null;
  resultType: string | null;
}

export default function PlayLogTable({ rows }: { rows: PlayLogRow[] }) {
  const films = useMemo(() => Array.from(new Set(rows.map((r) => r.film))), [rows]);
  const [filmFilter, setFilmFilter] = useState<string>("all");
  const [downFilter, setDownFilter] = useState<string>("all");

  const filtered = rows.filter((r) => {
    if (filmFilter !== "all" && r.film !== filmFilter) return false;
    if (downFilter !== "all" && String(r.down) !== downFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-sm">
        <select
          value={filmFilter}
          onChange={(e) => setFilmFilter(e.target.value)}
          className="rounded-md border border-steel-300 px-2 py-1"
        >
          <option value="all">All film</option>
          {films.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          value={downFilter}
          onChange={(e) => setDownFilter(e.target.value)}
          className="rounded-md border border-steel-300 px-2 py-1"
        >
          <option value="all">All downs</option>
          <option value="1">1st down</option>
          <option value="2">2nd down</option>
          <option value="3">3rd down</option>
          <option value="4">4th down</option>
        </select>
        <span className="self-center text-xs text-steel-500">{filtered.length} snaps</span>
      </div>

      <div className="max-h-96 overflow-auto rounded-xl border border-steel-200 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-steel-100 text-[11px] uppercase tracking-wide text-steel-500">
            <tr>
              <th className="px-2 py-2">Film</th>
              <th className="px-2 py-2">Q</th>
              <th className="px-2 py-2">D&amp;D</th>
              <th className="px-2 py-2">Yard Ln</th>
              <th className="px-2 py-2">Formation</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Call</th>
              <th className="px-2 py-2">Yds</th>
              <th className="px-2 py-2">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100 bg-white">
            {filtered.map((r) => (
              <tr key={r.id} className="transition hover:bg-steel-50">
                <td className="whitespace-nowrap px-2 py-1.5 text-steel-500">{r.film}</td>
                <td className="px-2 py-1.5">{r.qtr ?? ""}</td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  {r.down ?? ""}
                  {r.down ? "&" : ""}
                  {r.distance ?? ""}
                </td>
                <td className="px-2 py-1.5">{r.yardLine ?? ""}</td>
                <td className="whitespace-nowrap px-2 py-1.5">{r.formation ?? ""}</td>
                <td className="px-2 py-1.5">{r.playType ?? ""}</td>
                <td className="whitespace-nowrap px-2 py-1.5">{r.playCall ?? ""}</td>
                <td className="px-2 py-1.5">{r.yards ?? ""}</td>
                <td className="whitespace-nowrap px-2 py-1.5">{r.resultType ?? ""}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2 py-6 text-center text-steel-400">
                  No plays match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
