"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { usePredictionsStore } from "@/lib/store";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskGauge } from "@/components/RiskGauge";
import { formatProbability, RISK_INTERPRETATION } from "@/lib/risk";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const record = usePredictionsStore((s) => s.getByCustomerId(params.id));

  if (!record) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-surface-foreground-muted">
          No stored prediction found for customer <span className="font-mono">{params.id}</span>{" "}
          in this browser.
        </p>
        <Link href="/predict" className="text-sm text-accent-primary hover:underline">
          Run a new prediction →
        </Link>
      </div>
    );
  }

  const features = record.source_features
    ? Object.entries(record.source_features).filter(([k]) => k !== "User")
    : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-xs text-ink-foreground-faint">04 — Customer Detail</div>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-foreground">
            Customer {record.customer_id}
          </h1>
          {record.predicted_at && (
            <p className="mt-1 text-xs text-ink-foreground-faint">
              Scored {new Date(record.predicted_at).toLocaleString()}
            </p>
          )}
        </div>
        <RiskBadge band={record.risk_band} />
      </div>

      <p className="-mt-4 text-sm text-ink-foreground-muted">{RISK_INTERPRETATION[record.risk_band]}</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-border bg-surface p-6">
          <RiskGauge score={record.risk_score} label="Risk Score" />
        </div>
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-surface-border bg-surface p-6 sm:grid-cols-4">
          <DetailStat label="Raw Probability" value={formatProbability(record.raw_probability)} />
          <DetailStat
            label="Calibrated Probability"
            value={formatProbability(record.calibrated_probability)}
          />
          <DetailStat
            label="Decision Threshold"
            value={formatProbability(record.threshold_used)}
          />
          <DetailStat
            label="Fraud Flag"
            value={record.fraud_flag ? "Flagged for review" : "Not flagged"}
          />
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface p-6">
        <h2 className="mb-2 font-display text-sm font-semibold text-surface-foreground">Top Risk Drivers</h2>
        {record.top_features && record.top_features.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {record.top_features.map((f) => {
              const increased = (f.direction ?? (f.contribution >= 0 ? "increase" : "decrease")) === "increase";
              return (
                <li key={f.feature} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-surface-foreground">{f.feature}</span>
                  <span
                    className={`flex items-center gap-1.5 font-mono text-xs ${
                      increased ? "text-risk-high-text" : "text-risk-very-low-text"
                    }`}
                  >
                    {increased ? "↑" : "↓"} {increased ? "Increased risk" : "Reduced risk"}
                    <span className="text-surface-foreground-faint">({f.contribution.toFixed(3)})</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-surface-foreground-muted">
            Feature-level explanation is currently unavailable for this prediction. The
            notebook&apos;s SHAP/LinearExplainer analysis covers global feature importance for
            the selected model, but per-customer attribution isn&apos;t wired into the API in
            this phase — this UI will display Top Risk Drivers automatically once it is.
          </p>
        )}
      </div>

      {features && features.length > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface p-6">
          <h2 className="mb-4 font-display text-sm font-semibold text-surface-foreground">
            Submitted Feature Values
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {features.map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2 text-xs">
                <span className="truncate text-surface-foreground-muted" title={key}>
                  {key}
                </span>
                <span className="font-mono text-surface-foreground">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!features && (
        <div className="rounded-xl border border-surface-border bg-surface p-6 text-sm text-surface-foreground-muted">
          Raw feature values weren&apos;t retained for batch-uploaded customers in this session
          — only single-customer predictions currently store the submitted feature values
          locally for display here.
        </div>
      )}
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-surface-foreground-muted">{label}</div>
      <div className="mt-1 font-mono text-base font-semibold tabular-nums text-surface-foreground">{value}</div>
    </div>
  );
}
