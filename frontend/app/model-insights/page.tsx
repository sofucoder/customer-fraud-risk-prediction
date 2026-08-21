"use client";

import { useEffect, useState } from "react";
import { getHealth, getMetrics, ApiRequestError } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { formatProbability } from "@/lib/risk";
import type { HealthResponse, MetricsResponse } from "@/lib/types";

const METRIC_LABELS: Record<string, string> = {
  pr_auc: "PR-AUC",
  roc_auc: "ROC-AUC",
  recall: "Recall",
  precision: "Precision",
  f1: "F1 Score",
  brier_score: "Brier Score",
  accuracy: "Accuracy",
};

function fmt(v: number | undefined): string {
  return v === undefined || v === null ? "--" : v.toFixed(4);
}

export default function ModelInsightsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getHealth(), getMetrics()])
      .then(([h, m]) => {
        setHealth(h);
        setMetrics(m);
      })
      .catch((e) =>
        setError(e instanceof ApiRequestError ? e.message : "Could not load model information.")
      );
  }, []);

  const valMetrics = metrics?.validation_metrics?.metrics;
  const testMetrics = metrics?.test_metrics;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <div className="font-mono text-xs text-ink-foreground-faint">04 — Model Insights</div>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink-foreground">Model Insights</h1>
        <p className="mt-1 text-sm text-ink-foreground-muted">
          Live configuration and evaluation metrics for the currently deployed model, read
          directly from the API — nothing on this page is hardcoded in the frontend.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-risk-high/30 bg-risk-high/10 p-4 text-sm text-risk-high-text">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-surface-border bg-surface p-6">
        <h2 className="mb-4 font-display text-sm font-semibold text-surface-foreground">Configuration</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Model" value={health?.model_name ?? "--"} />
          <StatCard label="Version" value={health?.model_version ?? "--"} />
          <StatCard label="Calibration" value={health?.calibration_method ?? "--"} />
          <StatCard
            label="Decision Threshold"
            value={health ? formatProbability(health.decision_threshold) : "--"}
          />
        </div>
        <p className="mt-4 text-xs text-surface-foreground-faint">
          Risk score formula: calibrated probability × 100. This is a presentation layer over
          the model&apos;s calibrated probability, not an independently validated financial
          risk metric.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-surface-border bg-surface p-6">
          <h2 className="mb-4 font-display text-sm font-semibold text-surface-foreground">
            Validation Metrics
          </h2>
          {valMetrics ? (
            <MetricsList metrics={valMetrics} />
          ) : (
            <p className="text-sm text-surface-foreground-faint">
              Not available — the API&apos;s /metrics endpoint didn&apos;t return validation
              metrics for this artifact bundle.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-surface-border bg-surface p-6">
          <h2 className="mb-4 font-display text-sm font-semibold text-surface-foreground">Test Metrics</h2>
          {testMetrics ? (
            <MetricsList metrics={testMetrics} />
          ) : (
            <p className="text-sm text-surface-foreground-faint">
              Not available — the API&apos;s /metrics endpoint didn&apos;t return test metrics
              for this artifact bundle.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-accent-primary/20 bg-accent-primary-soft p-4 text-sm text-surface-foreground-muted">
        The model provides a risk estimate and should be used as decision support rather than
        definitive evidence of fraud. It is trained on a synthetic dataset and its evaluation
        metrics reflect that dataset, not guaranteed real-world performance.
      </div>
    </div>
  );
}

function MetricsList({ metrics }: { metrics: Record<string, number> }) {
  const entries = Object.entries(metrics).filter(([k]) => METRIC_LABELS[k]);
  if (entries.length === 0) {
    return <p className="text-sm text-surface-foreground-faint">No recognized metric fields in the response.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-line">
      {entries.map(([key, value]) => (
        <li key={key} className="flex items-center justify-between py-2 text-sm">
          <span className="text-surface-foreground-muted">{METRIC_LABELS[key] ?? key}</span>
          <span className="font-mono tabular-nums text-surface-foreground">{fmt(value)}</span>
        </li>
      ))}
    </ul>
  );
}
