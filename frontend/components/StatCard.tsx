import clsx from "clsx";

// Long values (e.g. "LogisticRegression (snapshot-weighted)") must stay fully readable and
// inside the card -- never truncated or clipped. Font size backs off automatically for
// longer strings so a full sentence-length value still fits without overflowing; wrapping
// (not overflow:hidden) is the actual overflow-safety mechanism.
function valueSizeClass(value: string | number): string {
  const length = String(value).length;
  if (length > 28) return "text-base sm:text-lg";
  if (length > 16) return "text-lg sm:text-xl";
  return "text-xl sm:text-2xl";
}

export function StatCard({
  label,
  value,
  accentClassName,
  hint,
}: {
  label: string;
  value: string | number;
  accentClassName?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-surface-border bg-surface p-4">
      <div className="text-xs uppercase leading-snug tracking-wide text-surface-foreground-muted">
        {label}
      </div>
      <div
        className={clsx(
          "value-wrap mt-2 font-mono font-semibold leading-snug tabular-nums",
          valueSizeClass(value),
          accentClassName ?? "text-surface-foreground"
        )}
      >
        {value}
      </div>
      {hint && <div className="value-wrap mt-1 text-xs text-surface-foreground-faint">{hint}</div>}
    </div>
  );
}
