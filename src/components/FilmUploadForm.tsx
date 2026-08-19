"use client";

import { useRef, useState } from "react";
import { requestFilmUploadUrl, confirmFilmUpload } from "@/lib/actions/film";

/** Strips the extension so a picked file can name the film when no label is typed. */
function labelFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

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
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    // Fall back to the file's own name so the button never needs a label first.
    const effectiveLabel = label.trim() || labelFromFileName(file.name) || "Untitled film";

    setStatus("uploading");
    setMessage(null);
    try {
      const { filmId, uploadUrl, key } = await requestFilmUploadUrl(
        opponentId,
        effectiveLabel,
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
      setMessage(`Uploaded "${effectiveLabel}".`);
      setLabel(defaultLabel ?? "");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="film-label" className="text-xs font-medium text-steel-600">
          Film label <span className="text-steel-400">(optional)</span>
        </label>
        <input
          id="film-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='e.g. "vs Juab" — defaults to the file name'
          className="w-72 rounded-md border border-steel-300 px-2 py-1.5 text-sm"
        />
      </div>

      {/* sr-only rather than hidden so it stays in the accessibility tree */}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        aria-label="Choose a video file to upload"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (picked) void upload(picked);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="rounded-md bg-maroon-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-maroon-800 disabled:cursor-wait disabled:opacity-60"
      >
        {status === "uploading" ? "Uploading…" : "Choose video to upload"}
      </button>

      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-600" : "text-emerald-600"}`}>{message}</p>
      )}
    </div>
  );
}
