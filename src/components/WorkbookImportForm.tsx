"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** Button lives inside the form so it can read the action's pending state. */
function PickButton({
  onPick,
  fileName,
  label,
}: {
  onPick: () => void;
  fileName: string | null;
  label: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={pending}
      className="rounded-md bg-maroon-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-maroon-800 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? `Importing ${fileName ?? "workbook"}…` : label}
    </button>
  );
}

/**
 * Opens the file picker straight from the Import button, then submits as soon
 * as a workbook is chosen — no separate "choose file" step.
 */
export default function WorkbookImportForm({
  action,
  opponentId,
  gameId,
  filmLabel,
  label = "Import workbook",
}: {
  action: (formData: FormData) => void | Promise<void>;
  opponentId: string;
  gameId?: string;
  filmLabel?: string;
  label?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form ref={formRef} action={action} className="flex items-center gap-3">
      <input type="hidden" name="opponentId" value={opponentId} />
      {gameId && <input type="hidden" name="gameId" value={gameId} />}
      {filmLabel && <input type="hidden" name="filmLabel" value={filmLabel} />}

      {/* sr-only rather than hidden so it stays in the accessibility tree */}
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept=".xlsx"
        className="sr-only"
        aria-label="Choose a charted workbook to import"
        onChange={(e) => {
          const picked = e.target.files?.[0];
          if (!picked) return;
          setFileName(picked.name);
          formRef.current?.requestSubmit();
        }}
      />

      <PickButton onPick={() => inputRef.current?.click()} fileName={fileName} label={label} />
      {fileName && <span className="text-xs text-steel-500">{fileName}</span>}
    </form>
  );
}
