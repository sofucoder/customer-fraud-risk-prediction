"use client";

import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

type Status = "loading" | "ok" | "error";

export function StatusPill() {
  const [status, setStatus] = useState<Status>("loading");
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((h) => {
        if (!cancelled) {
          setHealth(h);
          setStatus("ok");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs text-surface-foreground-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-surface-foreground-faint" />
        Checking API…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-risk-high/30 bg-risk-high/10 px-3 py-1.5 text-xs text-risk-high-text"
        title="Could not reach the API. Confirm the backend is running and NEXT_PUBLIC_API_URL is set."
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-risk-high" />
        API unreachable
      </div>
    );
  }

  // A compact status chip (not a data card) -- kept single-line with an accessible title
  // tooltip carrying the full text, rather than wrapping and disrupting the header's height.
  // The full, never-truncated model name lives on the Model Insights / System Health pages.
  return (
    <div
      className="flex max-w-[280px] items-center gap-2 rounded-lg border border-risk-very-low/30 bg-surface px-3 py-1.5 text-xs text-risk-very-low-text"
      title={`${health?.model_name ?? ""} · v${health?.model_version ?? ""}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-risk-very-low" />
      <span className="min-w-0 truncate font-mono text-surface-foreground">
        {health?.model_name}
      </span>
      <span className="shrink-0 text-surface-foreground-faint">v{health?.model_version}</span>
    </div>
  );
}
