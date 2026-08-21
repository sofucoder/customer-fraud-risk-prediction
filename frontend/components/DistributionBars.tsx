import { RISK_BAND_HEX } from "@/lib/risk";
import type { RiskBandLabel } from "@/lib/types";

const ORDER: RiskBandLabel[] = ["Very Low", "Low", "Medium", "High", "Very High"];

export function DistributionBars({ counts }: { counts: Record<RiskBandLabel, number> }) {
  const total = ORDER.reduce((sum, k) => sum + (counts[k] ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      {ORDER.map((label) => {
        const count = counts[label] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-surface-foreground-muted">{label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: RISK_BAND_HEX[label] }}
              />
            </div>
            <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-surface-foreground-muted">
              {count} ({pct.toFixed(0)}%)
            </span>
          </div>
        );
      })}
      {total === 0 && (
        <p className="text-xs text-surface-foreground-faint">
          No customers analyzed yet — run a single or batch prediction to populate this.
        </p>
      )}
    </div>
  );
}
