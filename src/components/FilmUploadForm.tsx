"use client";

import { useState } from "react";
import { requestFilmUploadUrl, confirmFilmUpload } from "@/lib/actions/film";

export default function FilmUploadForm({
  opponentId,
  gameId,
  defaultLabel,
}: {
  opponentId: string;
  gameId?: string;
  defaultLabel?: string;
}) {
  const [label, setLabel] = useState(defaultLabel ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !label.trim()) return;

    setStatus("uploading");
    setMessage(null);
    try {
      const { filmId, uploadUrl, key } = await requestFilmUploadUrl(
        opponentId,
        label,
        file.name,
        file.type || "video/mp4",
        gameId
      );

      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      await confirmFilmUpload(filmId, key, opponentId, gameId);

      setStatus("done");
      setMessage(`Uploaded "${label}".`);
      setLabel(defaultLabel ?? "");
      setFile(null);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-steel-600">Film label</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='e.g. "vs Juab" or "Canyon View - Film 1"'
          className="rounded-md border border-steel-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-steel-600">Video file</label>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={status === "uploading" || !file || !label.trim()}
        className="rounded-md bg-maroon-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-maroon-800 disabled:opacity-50"
      >
        {status === "uploading" ? "Uploading…" : "Upload film"}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-600" : "text-emerald-600"}`}>{message}</p>
      )}
    </form>
  );
}
