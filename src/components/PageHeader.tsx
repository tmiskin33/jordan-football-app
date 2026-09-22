import type { ReactNode } from "react";

export default function PageHeader({
  eyebrow,
  title,
  badge,
  description,
  action,
  maxWidth = "max-w-3xl",
}: {
  eyebrow?: string;
  title: ReactNode;
  /** Small inline pill/tag rendered right after the title. */
  badge?: ReactNode;
  description?: ReactNode;
  /** Right-aligned slot, e.g. a stat pill or a "Manage" link. */
  action?: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="border-b border-maroon-100 bg-gradient-to-r from-maroon-50 via-white to-white">
      <div className={`mx-auto flex flex-wrap items-end justify-between gap-3 px-4 py-6 ${maxWidth}`}>
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-maroon-600">{eyebrow}</p>
          )}
          <div className={`flex flex-wrap items-center gap-2 ${eyebrow ? "mt-1" : ""}`}>
            <h1 className="text-2xl font-bold tracking-tight text-steel-900 sm:text-3xl">{title}</h1>
            {badge}
          </div>
          {description && <div className="mt-1 text-sm text-steel-500">{description}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
