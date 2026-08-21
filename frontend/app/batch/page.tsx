"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { predictBatch, downloadBatchPredictions, getSchema, ApiRequestError } from "@/lib/api";
import { usePredictionsStore } from "@/lib/store";
import { RiskBadge } from "@/components/RiskBadge";
import { DistributionBars } from "@/components/DistributionBars";
import { StatCard } from "@/components/StatCard";
import { ErrorPanel } from "@/components/ErrorPanel";
import { toFriendlyError, type FriendlyError } from "@/lib/errors";
import { formatProbability, formatScore } from "@/lib/risk";
import { buildCsvTemplate, downloadTextFile, previewCsv } from "@/lib/csvTemplate";
import type { BatchPredictionResponse, RiskBandLabel, SchemaResponse } from "@/lib/types";

type BandFilter = "All" | RiskBandLabel | "Flagged only";
const BAND_FILTERS: BandFilter[] = ["All", "Very Low", "Low", "Medium", "High", "Very High", "Flagged only"];
type SortKey = "customer_id" | "calibrated_probability" | "risk_score";
const PAGE_SIZE = 20;

export default function BatchPage() {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ rowCount: number; columns: string[] } | null>(null);
  const [validation, setValidation] = useState<{ ok: boolean; missing: string[] } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [response, setResponse] = useState<BatchPredictionResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<BandFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("risk_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const addBatch = usePredictionsStore((s) => s.addBatch);

  useEffect(() => {
    getSchema().then(setSchema).catch(() => setSchema(null));
  }, []);

  async function handleFileSelected(f: File | null) {
    setFile(f);
    setValidation(null);
    setResponse(null);
    setError(null);
    setPage(1);
    if (f) {
      try {
        setPreview(await previewCsv(f));
      } catch {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  }

  function handleValidate() {
    if (!file || !preview || !schema) return;
    const required = [...schema.numerical_columns, ...schema.categorical_columns];
    const missing = required.filter((c) => !preview.columns.includes(c));
    setValidation({ ok: missing.length === 0, missing });
  }

  async function handleUpload() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setResponse(null);
    try {
      const res = await predictBatch(file);
      setResponse(res);
      addBatch(res.results);
      setPage(1);
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? toFriendlyError(e.status, e.message)
          : { message: "Batch prediction failed unexpectedly.", raw: String(e) }
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload() {
    if (!file) return;
    setDownloading(true);
    try {
      const blob = await downloadBatchPredictions(file);
      downloadTextFile("fraud_predictions.csv", await blob.text());
    } catch {
      setError({ message: "Could not generate the CSV download.", raw: "" });
    } finally {
      setDownloading(false);
    }
  }

  function handleDownloadTemplate() {
    if (!schema) return;
    downloadTextFile("customer_batch_template.csv", buildCsvTemplate(schema));
  }

  const counts = useMemo(() => {
    const c: Record<RiskBandLabel, number> = {
      "Very Low": response?.summary.n_very_low_risk ?? 0,
      Low: response?.summary.n_low_risk ?? 0,
      Medium: response?.summary.n_medium_risk ?? 0,
      High: response?.summary.n_high_risk ?? 0,
      "Very High": response?.summary.n_very_high_risk ?? 0,
    };
    return c;
  }, [response]);

  const filteredSorted = useMemo(() => {
    if (!response) return [];
    let rows = response.results;
    if (bandFilter === "Flagged only") {
      rows = rows.filter((r) => r.fraud_flag === 1);
    } else if (bandFilter !== "All") {
      rows = rows.filter((r) => r.risk_band === bandFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => String(r.customer_id).toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "customer_id") {
        return String(a.customer_id).localeCompare(String(b.customer_id)) * dir;
      }
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [response, bandFilter, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const pageRows = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <div className="font-mono text-xs text-ink-foreground-faint">03 — Batch</div>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink-foreground">
          Batch Customer Risk Analysis
        </h1>
        <p className="mt-1 text-sm text-ink-foreground-muted">
          Upload a customer-level CSV to generate risk scores for multiple customers.
        </p>
      </div>

      <div
        className="rounded-xl border border-surface-border bg-surface p-6"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFileSelected(f);
        }}
      >
        <div
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive ? "border-accent-primary bg-accent-primary/5" : "border-surface-border"
          }`}
        >
          <p className="text-sm text-surface-foreground-muted">Drag &amp; drop a CSV here, or</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 rounded-lg border border-surface-border px-4 py-2 text-sm text-surface-foreground hover:border-surface-foreground-muted"
          >
            Browse files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
          />
        </div>

        {file && preview && (
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-surface-foreground-muted">
            <span>
              File: <span className="font-mono text-surface-foreground">{file.name}</span>
            </span>
            <span>
              Size: <span className="font-mono text-surface-foreground">{(file.size / 1024).toFixed(1)} KB</span>
            </span>
            <span>
              Rows: <span className="font-mono text-surface-foreground">{preview.rowCount}</span>
            </span>
          </div>
        )}

        {validation && (
          <div
            className={`mt-3 rounded-lg border p-3 text-xs ${
              validation.ok
                ? "border-risk-very-low/30 bg-risk-very-low/10 text-risk-very-low-text"
                : "border-risk-high/30 bg-risk-high/10 text-risk-high-text"
            }`}
          >
            {validation.ok
              ? "All required columns are present."
              : `Missing required columns: ${validation.missing.join(", ")}`}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleValidate}
            disabled={!file || !schema}
            className="rounded-lg border border-surface-border px-4 py-2.5 text-sm text-surface-foreground transition-colors hover:border-surface-foreground-muted disabled:opacity-50"
          >
            Validate CSV
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || submitting}
            className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Processing…" : "Run Analysis"}
          </button>
          {response && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-lg border border-surface-border px-4 py-2.5 text-sm text-surface-foreground transition-colors hover:border-surface-foreground-muted disabled:opacity-50"
            >
              {downloading ? "Preparing…" : "Download Results CSV"}
            </button>
          )}
          <button
            onClick={handleDownloadTemplate}
            disabled={!schema}
            className="ml-auto rounded-lg border border-surface-border px-4 py-2.5 text-sm text-surface-foreground-muted transition-colors hover:border-surface-foreground-muted hover:text-surface-foreground disabled:opacity-50"
          >
            Download CSV Template
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorPanel error={error} />
          </div>
        )}
      </div>

      {response && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Customers" value={response.summary.n_customers} />
            <StatCard
              label="Flagged Customers"
              value={filteredSourceFlagged(response)}
              accentClassName="text-risk-high-text"
            />
            <StatCard
              label="Average Risk Score"
              value={formatScore(response.summary.average_risk_score)}
            />
            <StatCard
              label="High-Risk Customers"
              value={response.summary.n_high_risk + response.summary.n_very_high_risk}
              accentClassName="text-risk-high-text"
            />
          </div>

          <div className="rounded-xl border border-surface-border bg-surface p-6">
            <h2 className="mb-4 font-display text-sm font-semibold text-surface-foreground">
              Risk Distribution
            </h2>
            <DistributionBars counts={counts} />
          </div>

          <div className="rounded-xl border border-surface-border bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-surface-border px-6 py-4">
              <h2 className="font-display text-sm font-semibold text-surface-foreground">Results</h2>
              <input
                type="search"
                placeholder="Search customer ID…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="ml-auto w-full max-w-[200px] rounded-lg border border-surface-border bg-surface-muted px-3 py-1.5 text-xs text-surface-foreground placeholder:text-surface-foreground-faint focus:border-accent-primary"
              />
              <select
                value={bandFilter}
                onChange={(e) => {
                  setBandFilter(e.target.value as BandFilter);
                  setPage(1);
                }}
                className="rounded-lg border border-surface-border bg-surface-muted px-3 py-1.5 text-xs text-surface-foreground focus:border-accent-primary"
              >
                {BAND_FILTERS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop / tablet table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-xs uppercase tracking-wide text-surface-foreground-muted">
                  <tr>
                    <SortableHeader label="Customer" active={sortKey === "customer_id"} dir={sortDir} onClick={() => toggleSort("customer_id")} />
                    <th className="px-6 py-3 font-medium">Raw Probability</th>
                    <SortableHeader label="Calibrated Prob." active={sortKey === "calibrated_probability"} dir={sortDir} onClick={() => toggleSort("calibrated_probability")} />
                    <SortableHeader label="Risk Score" active={sortKey === "risk_score"} dir={sortDir} onClick={() => toggleSort("risk_score")} />
                    <th className="px-6 py-3 font-medium">Band</th>
                    <th className="px-6 py-3 font-medium">Prediction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pageRows.map((r) => (
                    <tr key={r.customer_id} className="hover:bg-surface-muted/60">
                      <td className="px-6 py-3">
                        <Link href={`/customer/${r.customer_id}`} className="font-mono text-surface-foreground hover:text-accent-primary">
                          {r.customer_id}
                        </Link>
                      </td>
                      <td className="px-6 py-3 font-mono tabular-nums text-surface-foreground-muted">
                        {formatProbability(r.raw_probability)}
                      </td>
                      <td className="px-6 py-3 font-mono tabular-nums text-surface-foreground-muted">
                        {formatProbability(r.calibrated_probability)}
                      </td>
                      <td className="px-6 py-3 font-mono tabular-nums text-surface-foreground">
                        {formatScore(r.risk_score)}
                      </td>
                      <td className="px-6 py-3">
                        <RiskBadge band={r.risk_band} />
                      </td>
                      <td className="px-6 py-3 text-surface-foreground-muted">
                        {r.fraud_flag ? "Flagged" : "Not flagged"}
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-surface-foreground-faint">
                        No customers match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="flex flex-col divide-y divide-line md:hidden">
              {pageRows.map((r) => (
                <Link
                  key={r.customer_id}
                  href={`/customer/${r.customer_id}`}
                  className="flex flex-col gap-2 px-4 py-3 hover:bg-surface-muted/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-surface-foreground">{r.customer_id}</span>
                    <RiskBadge band={r.risk_band} />
                  </div>
                  <div className="flex justify-between text-xs text-surface-foreground-muted">
                    <span>Score: <span className="font-mono text-surface-foreground">{formatScore(r.risk_score)}</span></span>
                    <span>Prob: <span className="font-mono text-surface-foreground">{formatProbability(r.calibrated_probability)}</span></span>
                    <span>{r.fraud_flag ? "Flagged" : "Not flagged"}</span>
                  </div>
                </Link>
              ))}
              {pageRows.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-surface-foreground-faint">
                  No customers match the current filters.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-surface-border px-6 py-4 text-xs text-surface-foreground-muted">
              <span>
                Showing {pageRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
                {(page - 1) * PAGE_SIZE + pageRows.length} of {filteredSorted.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="font-mono">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-surface-border px-3 py-1.5 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function filteredSourceFlagged(response: BatchPredictionResponse): number {
  return response.results.filter((r) => r.fraud_flag === 1).length;
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-6 py-3 font-medium">
      <button onClick={onClick} className="flex items-center gap-1 hover:text-surface-foreground">
        {label}
        {active && <span aria-hidden="true">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
