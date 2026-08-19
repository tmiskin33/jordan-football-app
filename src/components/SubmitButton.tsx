"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that disables itself and swaps its label while the server
 * action is running — matters most on the Excel import, which can take a few
 * seconds with no other feedback.
 */
export default function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "rounded-md bg-maroon-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-maroon-800 disabled:cursor-wait disabled:opacity-60"
      }
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
