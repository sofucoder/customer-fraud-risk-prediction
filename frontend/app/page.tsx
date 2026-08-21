"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePredictionsStore } from "@/lib/store";
import { RiskGauge } from "@/components/RiskGauge";
import { StatCard } from "@/components/StatCard";
import { DistributionBars } from "@/components/DistributionBars";
import { RiskBadge } from "@/components/RiskBadge";
import { formatScore } from "@/lib/risk";
import type { RiskBandLabel } from "@/lib/types";

const TOP_K = 10;

export default function DashboardPage() {
  const history = usePredictionsStore((s) => s.history);
  const clear = usePredictionsStore((s) => s.clear);

  const stats = useMemo(() => {
    const counts: Record<RiskBandLabel, number> = {
      "Very Low": 0,
      Low: 0,
      Medium: 0,
      High: 0,
      "Very High": 0,
    };
    let scoreSum = 0;
    for (const r of history) {
      counts[r.risk_band] = (counts[r.risk_band] ?? 0) + 1;
      scoreSum += r.risk_score;
    }
    const avg = history.length > 0 ? scoreSum / history.length : 0;
    return { counts, avg, total: history.length };
  }, [history]);

  const topK = useMemo(
    () => [...history].sort((a, b) => b.risk_score - a.risk_score).slice(0, TOP_K),
    [history]
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-ink-foreground-faint">01 — Overview</div>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-foreground">
            Customer Fraud Risk Intelligence
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-foreground-muted">
            Assess future customer-level fraud risk using historical behavioral and financial
            signals. Aggregated across every prediction made from this browser this session.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/predict"
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90"
          >
            Analyze Customer
          </Link>
          <Link
            href="/batch"
            className="rounded-lg border border-ink-border px-4 py-2 text-sm text-ink-foreground transition-colors hover:border-ink-foreground-muted"
          >
            Upload CSV
          </Link>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Clear all locally stored predictions? This cannot be undone.")) {
                  clear();
                }
              }}
              className="rounded-lg border border-surface-border px-3 py-2 text-xs text-surface-foreground-muted transition-colors hover:border-risk-high/40 hover:text-risk-high-text"
            >
              Clear history
            </button>
          )}
        </div>
      </div>

      {stats.total === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border bg-surface p-10 text-center">
          <p className="text-sm text-surface-foreground-muted">
            No customers analyzed yet in this browser.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/predict"
              className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90"
            >
              Analyze one customer
            </Link>
            <Link
              href="/batch"
              className="rounded-lg border border-surface-border px-4 py-2 text-sm text-surface-foreground transition-colors hover:border-surface-foreground-muted"
            >
              Upload a batch CSV
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Customers Analyzed" value={stats.total} />
            <StatCard
              label="High-Risk Customers"
              value={stats.counts.High + stats.counts["Very High"]}
              accentClassName="text-risk-high-text"
            />
            <StatCard label="Average Risk Score" value={formatScore(stats.avg)} />
            <StatCard
              label="Flagged Customers"
              value={history.filter((r) => r.fraud_flag === 1).length}
              accentClassName="text-risk-high-text"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-xl border border-surface-border bg-surface p-6">
              <RiskGauge score={stats.avg} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard
                label="Very High Risk"
                value={stats.counts["Very High"]}
                accentClassName="text-risk-very-high-text"
              />
              <StatCard
                label="High Risk"
                value={stats.counts.High}
                accentClassName="text-risk-high-text"
              />
              <StatCard
                label="Medium Risk"
                value={stats.counts.Medium}
                accentClassName="text-risk-medium-text"
              />
              <StatCard
                label="Low Risk"
                value={stats.counts.Low}
                accentClassName="text-risk-low-text"
              />
              <StatCard
                label="Very Low Risk"
                value={stats.counts["Very Low"]}
                accentClassName="text-risk-very-low-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-surface-border bg-surface p-6">
              <h2 className="mb-4 font-display text-sm font-semibold text-surface-foreground">
                Risk Distribution
              </h2>
              <DistributionBars counts={stats.counts} />
            </div>

            <div className="rounded-xl border border-surface-border bg-surface p-6">
              <h2 className="mb-1 font-display text-sm font-semibold text-surface-foreground">
                Top {TOP_K} Review Candidates
              </h2>
              <p className="mb-4 text-xs text-surface-foreground-faint">
                Highest scored customers — a realistic review queue would work this list top-down.
              </p>
              <ul className="flex flex-col divide-y divide-line">
                {topK.map((r) => (
                  <li key={r.customer_id} className="flex items-center justify-between py-2.5">
                    <Link
                      href={`/customer/${r.customer_id}`}
                      className="font-mono text-sm text-surface-foreground hover:text-accent-primary"
                    >
                      Customer {r.customer_id}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs tabular-nums text-surface-foreground-muted">
                        {formatScore(r.risk_score)}
                      </span>
                      <RiskBadge band={r.risk_band} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
