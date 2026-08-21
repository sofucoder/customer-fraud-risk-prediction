# Batch Prediction Test Data

`sample_customers.csv` — 5 dummy customer rows covering all 74 raw input features the
model expects (72 numerical + `Gender` + `State`), for exercising the Batch Prediction
page (`/batch`) without needing real customer data.

**These are not real customers.** Values are generated with internally consistent
arithmetic (e.g. `transactions_7d ≤ transactions_30d ≤ transactions_90d ≤
transactions_180d ≤ txn_count`, `error_rate = error_count / txn_count`,
`historical_fraud_rate = historical_fraud_count / txn_count`, FICO in `[300, 850]`,
channel ratios summing to 1, etc.) so the rows look like plausible customers rather
than arbitrary noise — but they are synthetic test fixtures only.

The 5 rows span a deliberate risk spread (`low_risk_established` →
`high_risk_volatile`) so you can see the UI's risk bands, badges, and gauge respond
differently across a batch, rather than every row landing in the same band.

## Where the 74-field list came from

Not from memory, and not from the earlier product-spec document alone (that summary
was actually missing 3 real fields: `days_since_first_txn`, `days_since_last_txn`,
`active_days`). The list in `generate_sample_customers.py` was reconstructed by
parsing the actual `build_profile_features` / `build_card_features` /
`build_transaction_features` / `build_rolling_features` functions in the trained
notebook, plus the post-merge interaction terms — so it matches what
`config/feature_names.json` should contain for this model.

## If your real `feature_names.json` differs

If you've changed the notebook's features since this was generated, regenerate
against your actual schema file instead of the built-in list:

```bash
python generate_sample_customers.py \
  --schema ../../backend/model_artifacts/config/feature_names.json \
  --rows 5 \
  --out sample_customers.csv
```

This reads the real column list from that file and generates rows for exactly those
columns (falling back to `0` / empty string for any column this script doesn't have a
heuristic for), so the CSV always matches what your API actually expects — even if it
no longer matches the 74-field list documented above.

## Usage

1. Start the backend and frontend (see their READMEs).
2. Go to `/batch`.
3. Upload `sample_customers.csv`.
4. Click **Validate CSV** to confirm all required columns are present, then **Run
   Analysis**.
5. Try **Download CSV Template** on the same page too — it generates a fresh
   single-example-row template directly from the live `/schema` endpoint, independent
   of this file.
