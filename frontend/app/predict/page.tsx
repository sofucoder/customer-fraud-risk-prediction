"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSchema, predictCustomer, ApiRequestError } from "@/lib/api";
import { usePredictionsStore } from "@/lib/store";
import { RiskBadge } from "@/components/RiskBadge";
import { InfoTooltip } from "@/components/InfoTooltip";
import { ErrorPanel } from "@/components/ErrorPanel";
import { toFriendlyError, type FriendlyError } from "@/lib/errors";
import { formatProbability, formatScore, RISK_INTERPRETATION } from "@/lib/risk";
import { FORM_SECTIONS, fieldLabel, fieldTooltip, FIELD_META } from "@/lib/featureSections";
import { EXAMPLE_CUSTOMER } from "@/lib/exampleCustomer";
import type { PredictionResult, SchemaResponse } from "@/lib/types";

export default function PredictPage() {
  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [schemaError, setSchemaError] = useState<FriendlyError | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [customerId, setCustomerId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const addPrediction = usePredictionsStore((s) => s.addPrediction);

  useEffect(() => {
    getSchema()
      .then((s) => {
        setSchema(s);
        const initial: Record<string, string> = {};
        for (const col of [...s.numerical_columns, ...s.categorical_columns]) {
          initial[col] = "";
        }
        setValues(initial);
        const defaults: Record<string, boolean> = {};
        for (const sec of FORM_SECTIONS) defaults[sec.id] = !sec.advanced;
        defaults["other"] = true;
        setOpenSections(defaults);
      })
      .catch((e) =>
        setSchemaError(
          e instanceof ApiRequestError
            ? toFriendlyError(e.status, e.message)
            : { message: "Could not load the feature schema from the API.", raw: "" }
        )
      );
  }, []);

  // All raw fields known to the live API, grouped by our static section map; anything the
  // API requires but this map hasn't been updated for yet still renders, under "Other Fields" --
  // so the form never silently omits a field the model actually needs.
  const { groupedFields, otherFields } = useMemo(() => {
    if (!schema) return { groupedFields: [] as { section: (typeof FORM_SECTIONS)[number]; fields: string[] }[], otherFields: [] as string[] };
    const allFields = new Set([...schema.numerical_columns, ...schema.categorical_columns]);
    const claimed = new Set<string>();
    const groupedFields = FORM_SECTIONS.map((section) => {
      const fields = section.fields.filter((f) => allFields.has(f));
      fields.forEach((f) => claimed.add(f));
      return { section, fields };
    }).filter((g) => g.fields.length > 0);
    const otherFields = [...allFields].filter((f) => !claimed.has(f));
    return { groupedFields, otherFields };
  }, [schema]);

  const missingRequired = useMemo(() => {
    if (!schema) return [];
    return [...schema.numerical_columns, ...schema.categorical_columns].filter(
      (col) => !values[col] || values[col].trim() === ""
    );
  }, [schema, values]);

  function setField(name: string, val: string) {
    setValues((v) => ({ ...v, [name]: val }));
    setTouched((t) => ({ ...t, [name]: true }));
  }

  function loadExample() {
    if (!schema) return;
    const next: Record<string, string> = {};
    for (const col of [...schema.numerical_columns, ...schema.categorical_columns]) {
      const example = EXAMPLE_CUSTOMER[col];
      next[col] = example !== undefined ? String(example) : "";
    }
    setValues(next);
    setCustomerId(String(EXAMPLE_CUSTOMER.User ?? "EXAMPLE-001"));
    setTouched({});
    setResult(null);
    setError(null);
  }

  function resetForm() {
    if (!schema) return;
    const cleared: Record<string, string> = {};
    for (const col of [...schema.numerical_columns, ...schema.categorical_columns]) {
      cleared[col] = "";
    }
    setValues(cleared);
    setCustomerId("");
    setTouched({});
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schema) return;
    setTouched(
      Object.fromEntries(
        [...schema.numerical_columns, ...schema.categorical_columns].map((c) => [c, true])
      )
    );
    if (missingRequired.length > 0) {
      setError({
        message: `Please fill in all required fields (${missingRequired.length} missing).`,
        raw: missingRequired.join(", "),
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const features: Record<string, string | number> = {};
      for (const col of schema.numerical_columns) {
        features[col] = Number(values[col]);
      }
      for (const col of schema.categorical_columns) {
        features[col] = values[col];
      }
      if (customerId.trim()) {
        features["User"] = customerId.trim();
      }
      const res = await predictCustomer(features);
      const stamped: PredictionResult = {
        ...res,
        customer_id: customerId.trim() || res.customer_id,
        source_features: { ...features },
      };
      setResult(stamped);
      addPrediction(stamped);
    } catch (e) {
      setError(
        e instanceof ApiRequestError
          ? toFriendlyError(e.status, e.message)
          : { message: "Prediction failed unexpectedly.", raw: String(e) }
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-ink-foreground-faint">02 — Single Customer</div>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-foreground">
            Single Customer Prediction
          </h1>
          <p className="mt-1 text-sm text-ink-foreground-muted">
            Enter one customer&apos;s features exactly as the model expects them, then analyze.
          </p>
        </div>
        {schema && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadExample}
              className="rounded-lg border border-ink-border px-3 py-2 text-xs text-ink-foreground-muted transition-colors hover:border-accent-cyan hover:text-accent-cyan"
              title="Fills the form with illustrative test values — not a real customer."
            >
              Load Example
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-ink-border px-3 py-2 text-xs text-ink-foreground-muted transition-colors hover:border-ink-foreground-muted hover:text-ink-foreground"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {schemaError && <ErrorPanel error={schemaError} />}

      {!schema && !schemaError && (
        <div className="rounded-xl border border-surface-border bg-surface p-6 text-sm text-surface-foreground-muted">
          Loading feature schema from the API…
        </div>
      )}

      {schema && (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div className="rounded-xl border border-surface-border bg-surface p-6">
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-surface-foreground-muted">
              Customer ID <span className="text-surface-foreground-faint">(optional)</span>
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. 1042"
              className="w-full max-w-xs rounded-lg border border-surface-border bg-surface-muted px-3 py-2 text-sm text-surface-foreground placeholder:text-surface-foreground-faint focus:border-accent-primary"
            />
          </div>

          {groupedFields.map(({ section, fields }) => (
            <div key={section.id} className="rounded-xl border border-surface-border bg-surface">
              <button
                type="button"
                onClick={() => setOpenSections((o) => ({ ...o, [section.id]: !o[section.id] }))}
                aria-expanded={!!openSections[section.id]}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-display text-sm font-semibold text-surface-foreground">
                  {section.title}
                  {section.advanced && (
                    <span className="ml-2 rounded-full border border-surface-border px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-surface-foreground-faint">
                      Advanced
                    </span>
                  )}
                </span>
                <span className="font-mono text-xs text-surface-foreground-faint">
                  {openSections[section.id] ? "−" : "+"} {fields.length} fields
                </span>
              </button>
              {openSections[section.id] && (
                <div className="grid grid-cols-1 gap-4 border-t border-surface-border px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
                  {fields.map((col) => (
                    <FieldInput
                      key={col}
                      name={col}
                      value={values[col] ?? ""}
                      onChange={(v) => setField(col, v)}
                      showError={touched[col] && !values[col]}
                      isCategorical={schema.categorical_columns.includes(col)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {otherFields.length > 0 && (
            <div className="rounded-xl border border-surface-border bg-surface">
              <button
                type="button"
                onClick={() => setOpenSections((o) => ({ ...o, other: !o.other }))}
                aria-expanded={!!openSections.other}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-display text-sm font-semibold text-surface-foreground">
                  Other Fields
                  <span className="ml-2 rounded-full border border-surface-border px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-surface-foreground-faint">
                    From live API schema
                  </span>
                </span>
                <span className="font-mono text-xs text-surface-foreground-faint">
                  {openSections.other ? "−" : "+"} {otherFields.length} fields
                </span>
              </button>
              {openSections.other && (
                <div className="grid grid-cols-1 gap-4 border-t border-surface-border px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
                  {otherFields.map((col) => (
                    <FieldInput
                      key={col}
                      name={col}
                      value={values[col] ?? ""}
                      onChange={(v) => setField(col, v)}
                      showError={touched[col] && !values[col]}
                      isCategorical={schema.categorical_columns.includes(col)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <ErrorPanel error={error} />}

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-accent-primary px-6 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Analyzing customer risk…" : "Analyze Customer"}
            </button>
            {missingRequired.length > 0 && (
              <span className="text-xs text-surface-foreground-faint">
                {missingRequired.length} field{missingRequired.length === 1 ? "" : "s"} remaining
              </span>
            )}
          </div>
        </form>
      )}

      {result && (
        <div className="rounded-xl border border-surface-border bg-surface p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-surface-foreground">
              Customer Risk Assessment
            </h2>
            <RiskBadge band={result.risk_band} />
          </div>
          <p className="mb-5 text-xs text-surface-foreground-faint">
            {RISK_INTERPRETATION[result.risk_band]}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ResultStat label="Raw Probability" value={formatProbability(result.raw_probability)} />
            <ResultStat
              label="Calibrated Probability"
              value={formatProbability(result.calibrated_probability)}
            />
            <ResultStat label="Risk Score" value={`${formatScore(result.risk_score)} / 100`} />
            <ResultStat
              label="Prediction"
              value={result.fraud_flag ? "Flagged" : "Not Flagged"}
            />
          </div>
          <p className="mt-4 text-xs text-surface-foreground-faint">
            Decision threshold: {formatProbability(result.threshold_used)}. Calibrated
            probability is the probability after the model&apos;s isotonic calibration step —
            this is an AI-generated risk estimate for decision support, not confirmation of
            fraud.
          </p>
          <Link
            href={`/customer/${result.customer_id}`}
            className="mt-4 inline-block text-sm text-accent-primary hover:underline"
          >
            View full customer detail →
          </Link>
        </div>
      )}
    </div>
  );
}

function FieldInput({
  name,
  value,
  onChange,
  showError,
  isCategorical,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  showError: boolean;
  isCategorical: boolean;
}) {
  const meta = FIELD_META[name];
  const inputId = `field-${name}`;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 flex items-center gap-1.5 text-xs text-surface-foreground-muted">
        <span className="truncate" title={fieldLabel(name)}>
          {fieldLabel(name)}
        </span>
        <span className="text-risk-high-text">*</span>
        <InfoTooltip text={fieldTooltip(name)} />
      </label>
      {meta?.type === "select" && meta.options ? (
        <select
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={showError}
          className={`w-full rounded-lg border bg-surface-muted px-3 py-2 text-sm text-surface-foreground focus:border-accent-primary ${
            showError ? "border-risk-high/60" : "border-surface-border"
          }`}
        >
          <option value="">Select…</option>
          {meta.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          type={isCategorical ? "text" : "number"}
          step="any"
          min={meta?.min}
          max={meta?.max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={showError}
          className={`w-full rounded-lg border bg-surface-muted px-3 py-2 font-mono text-sm text-surface-foreground focus:border-accent-primary ${
            showError ? "border-risk-high/60" : "border-surface-border"
          }`}
        />
      )}
      {showError && <p className="mt-1 text-[11px] text-risk-high-text">Required</p>}
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-surface-foreground-muted">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-surface-foreground">{value}</div>
    </div>
  );
}
