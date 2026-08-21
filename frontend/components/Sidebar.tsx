"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { BrandMark } from "./BrandMark";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", eyebrow: "01" },
  { href: "/predict", label: "Single Prediction", eyebrow: "02" },
  { href: "/batch", label: "Batch Prediction", eyebrow: "03" },
  { href: "/model-insights", label: "Model Insights", eyebrow: "04" },
  { href: "/system-health", label: "System Health", eyebrow: "05" },
  { href: "/methodology", label: "Methodology", eyebrow: "06" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <BrandMark size={30} />
      <div className="min-w-0">
        <div className="truncate font-display text-base font-semibold tracking-tight text-ink-foreground">
          FraudShield AI
        </div>
        <div className="truncate text-[11px] text-ink-foreground-faint">
          Customer Risk Intelligence
        </div>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={clsx(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-ink-elevated text-ink-foreground"
                : "text-ink-foreground-muted hover:bg-ink-elevated/70 hover:text-ink-foreground"
            )}
          >
            <span
              className={clsx(
                "font-mono text-[11px]",
                active ? "text-accent-cyan" : "text-ink-foreground-faint"
              )}
            >
              {item.eyebrow}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop / tablet sidebar -- stays on the navy "ink" system, matching the
          enterprise-dashboard pattern of a dark nav rail beside light content cards. */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-ink-border bg-ink-elevated/60 px-4 py-6 md:flex">
        <div className="mb-8">
          <Brand />
        </div>
        <NavLinks />
        <div className="mt-auto px-2 pt-6 text-[11px] leading-relaxed text-ink-foreground-faint">
          Predictions made here call your FastAPI backend directly and are kept only in this
          browser&apos;s local storage.
        </div>
      </aside>

      {/* Mobile top bar + hamburger */}
      <div className="flex items-center justify-between border-b border-ink-border bg-ink-elevated/60 px-4 py-3 md:hidden">
        <Brand />
        <button
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-border text-ink-foreground"
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M1 1L17 17M17 1L1 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
              <path d="M0 1H18M0 7H18M0 13H18" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-b border-ink-border bg-ink-elevated px-4 py-4 md:hidden">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
