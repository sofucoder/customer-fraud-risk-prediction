import type { RiskBandLabel } from "./types";

// `text`/`dot` use the darker, text-safe -text variants (WCAG AA-verified: 5.0–6.7:1 on
// white, vs. 2.1–3.8:1 for the raw saturated colors) since both sit directly on the white/
// off-white card surfaces used throughout the app. `bg`/`border` use the original saturated
// tokens at low opacity purely as decorative tint -- those aren't held to text-contrast
// rules, and the pastel result is the intended look.
export const RISK_BAND_STYLES: Record<
  RiskBandLabel,
  { text: string; bg: string; border: string; dot: string }
> = {
  "Very Low": {
    text: "text-risk-very-low-text",
    bg: "bg-risk-very-low/10",
    border: "border-risk-very-low/30",
    dot: "bg-risk-very-low-text",
  },
  Low: {
    text: "text-risk-low-text",
    bg: "bg-risk-low/10",
    border: "border-risk-low/30",
    dot: "bg-risk-low-text",
  },
  Medium: {
    text: "text-risk-medium-text",
    bg: "bg-risk-medium/10",
    border: "border-risk-medium/30",
    dot: "bg-risk-medium-text",
  },
  High: {
    text: "text-risk-high-text",
    bg: "bg-risk-high/10",
    border: "border-risk-high/30",
    dot: "bg-risk-high-text",
  },
  "Very High": {
    text: "text-risk-very-high-text",
    bg: "bg-risk-very-high/10",
    border: "border-risk-very-high/30",
    dot: "bg-risk-very-high-text",
  },
};

// Used for large decorative/chart areas (gauge segments, distribution bars) that are always
// paired with a neutral-dark-text label right next to them -- so the vivid brand hue reads
// clearly without needing to independently pass text-contrast rules itself.
export const RISK_BAND_HEX: Record<RiskBandLabel, string> = {
  "Very Low": "#10b981",
  Low: "#3b82f6",
  Medium: "#f59e0b",
  High: "#f97316",
  "Very High": "#ef4444",
};

export function formatScore(score: number): string {
  return score.toFixed(1);
}

export function formatProbability(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export const RISK_INTERPRETATION: Record<RiskBandLabel, string> = {
  "Very Low": "Low estimated future fraud risk based on the model.",
  Low: "Relatively low estimated future fraud risk.",
  Medium: "Moderate estimated risk. Consider additional review.",
  High: "Elevated estimated risk. Additional review may be appropriate.",
  "Very High": "Very high estimated risk. Review recommended.",
};
