export default function MethodologyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <div className="font-mono text-xs text-ink-foreground-faint">06 — About</div>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink-foreground">Methodology</h1>
      </div>

      <Section title="What this predicts">
        <p>
          This system predicts <strong className="text-surface-foreground">customer-level future fraud
          risk</strong> — the likelihood that a given customer experiences fraud during a
          future time window, based on their historical, pre-cutoff behavior. It is{" "}
          <strong className="text-surface-foreground">not</strong> transaction-level fraud detection; a
          single risk score is produced per customer, not per transaction.
        </p>
      </Section>

      <Section title="How a prediction is produced">
        <ol className="list-decimal space-y-2 pl-5">
          <li>A customer&apos;s raw features are sent to the API exactly as the model expects them.</li>
          <li>The API applies the same fitted preprocessing pipeline used during training.</li>
          <li>The trained model produces a raw probability of future fraud.</li>
          <li>An isotonic calibration step adjusts that probability to better reflect real-world frequencies.</li>
          <li>The calibrated probability × 100 becomes the risk score (0–100), mapped to a risk band.</li>
          <li>The calibrated probability is compared against a fixed decision threshold to set the fraud flag.</li>
        </ol>
      </Section>

      <Section title="What the risk score is — and isn't">
        <p>
          The risk score is an <strong className="text-surface-foreground">AI-generated risk estimate</strong>{" "}
          intended for decision support and prioritizing manual review. It is not a
          determination of guilt, not a guarantee, and not a substitute for a trained fraud
          analyst&apos;s judgment. A high score means the model&apos;s learned pattern
          associates this customer&apos;s profile with elevated future-fraud risk — it does
          not mean fraud has occurred or will occur.
        </p>
      </Section>

      <Section title="Known limitations">
        <ul className="list-disc space-y-2 pl-5">
          <li>The underlying dataset is synthetic and does not represent real customers or real fraud patterns.</li>
          <li>
            Positive examples (customers who experience fraud) are relatively rare in the
            training data, which makes single-run evaluation metrics noisier than they would
            be with a larger positive class.
          </li>
          <li>
            Risk bands are a fixed presentation layer over the calibrated probability, not an
            independently validated financial risk metric.
          </li>
          <li>
            Per-customer feature-level explanations are not yet available through the API in
            this phase — see the Customer Detail page for what is and isn&apos;t shown.
          </li>
        </ul>
      </Section>

      <Section title="Explainability">
        <p>
          Where the API returns per-prediction feature contributions, this app will display
          them as &quot;Top Risk Drivers&quot; automatically. Until then, the Customer Detail
          page states plainly that feature-level explanation isn&apos;t available, rather than
          fabricating one.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-6">
      <h2 className="mb-3 font-display text-sm font-semibold text-surface-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-surface-foreground-muted">{children}</div>
    </div>
  );
}
