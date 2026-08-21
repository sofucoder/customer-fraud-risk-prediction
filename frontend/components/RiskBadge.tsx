import { RISK_BAND_STYLES } from "@/lib/risk";
import type { RiskBandLabel } from "@/lib/types";

export function RiskBadge({ band }: { band: RiskBandLabel }) {
  const style = RISK_BAND_STYLES[band];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${style.text} ${style.bg} ${style.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {band}
    </span>
  );
}
