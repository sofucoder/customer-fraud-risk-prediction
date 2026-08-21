"use client";

import { useCallback, useEffect, useState } from "react";
import { getHealth, ApiRequestError } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { formatProbability } from "@/lib/risk";
import { API_BASE_URL } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

type Status = "loading" | "ok" | "error";

export default function SystemHealthPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const check = useCallback(() => {
    setStatus("loading");
    getHealth()
      .then((h) => {
        setHealth(h);
        setStatus("ok");
        setLastChecked(new Date());
      })
      .catch((e) => {
        setStatus("error");
        setErrorMsg(e instanceof ApiRequestError ? e.message : "Unknown error");
        setLastChecked(new Date());
      });
  }, []);

  useEffect(() => {
    // Defer so the effect doesn't synchronously call setState during render/commit --
    // satisfies react-hooks/set-state-in-effect while still checking on mount.
    const id = setTimeout(check, 0);
    return () => clearTimeout(id);
  }, [check]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="font-mono text-xs text-ink-foreground-faint">05 — System Health</div>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-foreground">System Health</h1>
          <p className="mt-1 text-sm text-ink-foreground-muted">
            Live status of the FastAPI backend at <span className="font-mono">{API_BASE_URL}</span>.
          </p>
        </div>
        <button
          onClick={check}
          className="rounded-lg border border-ink-border px-4 py-2 text-sm text-ink-foreground transition-colors hover:border-ink-foreground-muted"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === "ok"
                ? "bg-risk-very-low"
                : status === "error"
                  ? "bg-risk-high"
                  : "animate-pulse bg-text-faint"
            }`}
          />
          <span className="font-display text-lg font-semibold text-surface-foreground">
            {status === "loading" && "Checking…"}
            {status === "ok" && "API Online"}
            {status === "error" && "API Unreachable"}
          </span>
        </div>
        {lastChecked && (
          <p className="mt-1 text-xs text-surface-foreground-faint">
            Last checked {lastChecked.toLocaleTimeString()}
          </p>
        )}
        {status === "error" && errorMsg && (
          <div className="mt-4 rounded-lg border border-risk-high/30 bg-risk-high/10 p-3 text-sm text-risk-high-text">
            {errorMsg}. Confirm the backend is running and{" "}
            <span className="font-mono">NEXT_PUBLIC_API_URL</span> points to it.
          </div>
        )}
      </div>

      {status === "ok" && health && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Model" value={health.model_name} />
          <StatCard label="Version" value={health.model_version} />
          <StatCard label="Calibration" value={health.calibration_method} />
          <StatCard label="Threshold" value={formatProbability(health.decision_threshold)} />
        </div>
      )}
    </div>
  );
}
