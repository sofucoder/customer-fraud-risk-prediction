"use client";

import { RISK_BAND_HEX } from "@/lib/risk";

// The console's signature element: a 180° instrument-panel gauge, segmented exactly at the
// model's own risk-band boundaries (not generic 20% slices), with a needle at the current
// average score. Reads at a glance the way a real analyst console would.
const BANDS: { min: number; max: number; label: keyof typeof RISK_BAND_HEX }[] = [
  { min: 0, max: 19, label: "Very Low" },
  { min: 20, max: 39, label: "Low" },
  { min: 40, max: 59, label: "Medium" },
  { min: 60, max: 79, label: "High" },
  { min: 80, max: 100, label: "Very High" },
];

const R = 90;
const CX = 100;
const CY = 100;

function polarToCartesian(angleDeg: number) {
  const angleRad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: CX + R * Math.cos(angleRad), y: CY + R * Math.sin(angleRad) };
}

function scoreToAngle(score: number) {
  // 0 -> 0deg (left), 100 -> 180deg (right), semicircle sweep
  return (Math.max(0, Math.min(100, score)) / 100) * 180;
}

function arcPath(startScore: number, endScore: number) {
  const start = polarToCartesian(scoreToAngle(startScore));
  const end = polarToCartesian(scoreToAngle(endScore));
  return `M ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${end.x} ${end.y}`;
}

export function RiskGauge({
  score,
  label = "Average Risk Score",
}: {
  score: number;
  label?: string;
}) {
  const needleAngle = scoreToAngle(score);
  const needleRad = ((needleAngle - 180) * Math.PI) / 180;
  const needleLen = R - 14;
  const needleX = CX + needleLen * Math.cos(needleRad);
  const needleY = CY + needleLen * Math.sin(needleRad);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 118" className="w-full max-w-[280px]">
        {BANDS.map((band) => (
          <path
            key={band.label}
            d={arcPath(band.min, band.max + (band.max === 100 ? 0 : 1))}
            fill="none"
            stroke={RISK_BAND_HEX[band.label]}
            strokeWidth={14}
            strokeLinecap="butt"
            opacity={0.85}
          />
        ))}
        {/* Needle */}
        <line
          x1={CX}
          y1={CY}
          x2={needleX}
          y2={needleY}
          stroke="var(--surface-foreground)"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={5} fill="var(--surface-foreground)" />
      </svg>
      <div className="-mt-6 flex flex-col items-center">
        <span className="font-mono text-4xl font-semibold tabular-nums text-surface-foreground">
          {score.toFixed(1)}
        </span>
        <span className="mt-1 text-xs uppercase tracking-wide text-surface-foreground-muted">{label}</span>
      </div>
    </div>
  );
}
