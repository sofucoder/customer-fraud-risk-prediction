# Fraud Risk Console (Next.js + Tailwind frontend)

Talks to the FastAPI backend in `../backend`. Built with Next.js (App Router), TypeScript,
and Tailwind CSS v4.

## Setup

1. Start the backend first (see `../backend/README.md`) — this app fetches its form schema,
   model metadata, and metrics live from the API; it does not hardcode them.
2. `npm install`
3. Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` if your backend
   isn't at `http://127.0.0.1:8000`.
4. `npm run dev` — open http://localhost:3000

## Pages

- `/` — Dashboard: KPI cards, risk gauge, distribution, and top review candidates, all
  computed from real predictions made this session (nothing fabricated; empty state shown
  until you run a prediction).
- `/predict` — Single Customer Prediction: form fields are generated from the live
  `/schema` endpoint and grouped into the sections from the product spec (Profile,
  Financial, Credit, Transaction Activity, Recent Activity, Behavioral, Fraud History,
  Advanced Risk). Any schema field not in the static section map still renders, under
  "Other Fields," so the form can never silently drop a required field.
- `/batch` — Batch Prediction: drag-and-drop CSV upload, client-side pre-flight column
  validation, real batch scoring via the API, a searchable/sortable/filterable/paginated
  results table (desktop table + mobile card layout), and a CSV template download.
- `/model-insights` — Live model configuration and validation/test metrics, read from
  `/health` and `/metrics` — nothing here is hardcoded in the frontend.
- `/system-health` — Live `/health` status with a manual refresh.
- `/methodology` — Static explanation of what the model predicts, how a prediction is
  produced, and its known limitations.
- `/customer/[id]` — Full detail for any customer predicted this session, including
  "Top Risk Drivers" if the API ever returns `top_features` (currently null — the UI states
  that plainly rather than fabricating an explanation).

## Design notes

- State (prediction history) is kept in `localStorage` via a small Zustand store — this is a
  real, user-run app (not a sandboxed preview), so that's fully supported. No backend
  database was in scope for this phase; see Methodology page.
- `lib/api.ts` centralizes all backend calls (`getHealth`, `getSchema`, `getMetrics`,
  `predictCustomer`, `predictBatch`, `downloadBatchPredictions`) — the API URL is read once
  from `NEXT_PUBLIC_API_URL`, never hardcoded elsewhere.
- `lib/errors.ts` maps raw API error text to human-readable messages; the raw detail is
  still available behind a "View details" toggle for advanced users.
- Verified with `next build`, `tsc --noEmit`, and `eslint` — all clean — plus a live run
  against the FastAPI backend exercising every endpoint (health, schema, metrics, single
  predict, batch predict, batch CSV download, and validation-error paths).

## Design system (v2 — premium navy/indigo fintech redesign)

- **Tokens** live in `app/globals.css`: two independent surface systems —
  `ink` (navy app shell: page background, sidebar, header band, always paired with the
  light `ink-foreground` text family) and `surface` (white/off-white cards, paired with
  the dark `surface-foreground` text family). Changing a token here cascades everywhere;
  no component hardcodes a color.
- **Risk colors**: `risk-very-low/low/medium/high/very-high` (green/blue/amber/orange/red)
  for backgrounds, borders, dots, and chart fills — plus separate `-text` variants
  (`risk-high-text`, etc.) used anywhere the color is actual text on a white card. The
  base saturated colors measured 2.1–3.8:1 contrast on white (fail WCAG AA's 4.5:1); the
  `-text` variants measure 5.0–6.7:1 (pass), verified by direct calculation, not eyeballed.
- **Overflow fix**: `StatCard`'s value auto-shrinks font size for longer strings and wraps
  (`overflow-wrap: anywhere`) rather than truncating or clipping — this is what fixes long
  values like "LogisticRegression (snapshot-weighted)" staying fully inside Model Insights
  / System Health cards.
- **Favicon/brand mark**: `components/BrandMark.tsx` (sidebar logo) and `app/icon.svg`
  (Next.js auto-favicon) share one shield + cyan scan-point design. `app/favicon.ico` and
  `app/apple-icon.png` are rasterized from the same shape for broader browser/OS support.
- Verified with `next build`, `tsc --noEmit`, `eslint`, and a real Playwright run against
  the live FastAPI backend across desktop (1440px) and mobile (390px) viewports for every
  page, including actually uploading `test_data/sample_customers.csv` through Batch
  Prediction and confirming real results render correctly.
