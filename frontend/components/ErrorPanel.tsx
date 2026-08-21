"use client";

import { useState } from "react";
import type { FriendlyError } from "@/lib/errors";

export function ErrorPanel({ error }: { error: FriendlyError }) {
  const [showRaw, setShowRaw] = useState(false);
  const hasExtra = error.raw && error.raw !== error.message;

  return (
    <div
      role="alert"
      className="rounded-xl border border-risk-high/30 bg-risk-high/10 p-4 text-sm text-risk-high-text"
    >
      <p>{error.message}</p>
      {hasExtra && (
        <>
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="mt-2 text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            {showRaw ? "Hide details" : "View details"}
          </button>
          {showRaw && (
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-surface-muted p-2 font-mono text-[11px] text-surface-foreground-muted">
              {error.raw}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
