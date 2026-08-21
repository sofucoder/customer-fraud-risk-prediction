"""
Generates a small, self-consistent dummy CSV for exercising the Batch Prediction UI.

Values are NOT random noise dropped into arbitrary columns -- related fields are kept
internally consistent the way the notebook's own feature engineering would produce them
(e.g. transactions_7d <= transactions_30d <= ... <= txn_count, error_rate =
error_count / txn_count, historical_fraud_rate = historical_fraud_count / txn_count,
FICO in [300, 850], ratios in [0, 1], etc.) so the rows look like plausible customers
rather than obviously synthetic noise.

By default this uses the exact 74-column list reconstructed directly from the notebook's
feature-engineering source (build_profile_features / build_card_features /
build_transaction_features / build_rolling_features + the post-merge interaction terms).
If your real backend/model_artifacts/config/feature_names.json differs even slightly
(e.g. because you changed the notebook further), point --schema at it and this script will
generate columns from THAT file instead, so the CSV always matches what your API actually
expects.

Usage:
    python generate_sample_customers.py
    python generate_sample_customers.py --schema ../../backend/model_artifacts/config/feature_names.json
    python generate_sample_customers.py --rows 10 --out sample_customers_10.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

# --- Ground-truth 74-field list, reconstructed from the notebook's actual source (not the
# earlier product-spec summary, which was missing 3 fields: days_since_first_txn,
# days_since_last_txn, active_days). 72 numerical + Gender + State = 74.

NUMERICAL_COLUMNS = [
    # raw profile passthrough
    "Current Age", "Retirement Age", "Per Capita Income - Zipcode", "Yearly Income - Person",
    "Total Debt", "FICO Score", "Num Credit Cards",
    # build_profile_features derived
    "debt_to_income", "income_per_card", "debt_per_card", "years_to_retirement", "credit_risk_proxy",
    # build_card_features
    "num_active_cards", "num_card_brands", "total_credit_limit", "avg_credit_limit",
    "avg_card_age_days", "oldest_card_age_days", "pct_cards_with_chip", "any_card_on_dark_web",
    # build_transaction_features -- volume/amount
    "txn_count", "total_spend", "avg_transaction_amount", "median_transaction_amount",
    "max_transaction_amount", "std_transaction_amount", "amount_volatility",
    "high_value_transaction_ratio",
    # recency
    "days_since_first_txn", "days_since_last_txn", "active_days",
    # rolling windows
    "transactions_7d", "spend_7d", "transactions_30d", "spend_30d",
    "transactions_90d", "spend_90d", "transactions_180d", "spend_180d",
    # own-history baseline
    "recent_mean_amount", "historical_mean_amount",
    # diversity
    "unique_merchants", "unique_mccs",
    # channel
    "chip_transaction_ratio", "online_transaction_ratio", "swipe_transaction_ratio",
    # geography
    "unique_states", "out_of_state_ratio",
    # time-of-day
    "night_transaction_ratio", "weekend_transaction_ratio", "txn_hour_std", "hour_entropy",
    # errors
    "error_count", "error_rate",
    # fraud history
    "historical_fraud_count", "historical_fraud_rate", "fraud_count_30d",
    # behavioral shift
    "recent_spending_change", "merchant_diversity_30d",
    # Section-F additions
    "txn_count_ratio_30d_vs_180d", "historical_std_amount", "amount_zscore_vs_own_history",
    "days_since_last_high_value_txn", "mcc_novelty_ratio_30d", "state_novelty_ratio_30d",
    # build_rolling_features
    "merchant_concentration", "mcc_concentration", "spending_trend",
    # post-merge interaction terms
    "income_to_credit_limit_ratio", "fico_x_debt_to_income",
    "historical_fraud_rate_x_days_since_last_txn", "card_age_at_first_use_gap",
]
CATEGORICAL_COLUMNS = ["Gender", "State"]

STATES = ["CA", "NY", "TX", "FL", "WA", "IL", "PA", "OH", "GA", "NC"]

# risk_level in [0, 1] biases the whole row toward "quieter, older account" (low) or
# "newer, more volatile, more error/fraud history" (high) -- purely for realistic variety
# across the 5 sample rows, not because the model's actual decision boundary is known here.
PROFILES = [
    {"name": "low_risk_established", "risk_level": 0.05},
    {"name": "typical_moderate", "risk_level": 0.25},
    {"name": "typical_moderate_2", "risk_level": 0.35},
    {"name": "elevated_recent_activity", "risk_level": 0.65},
    {"name": "high_risk_volatile", "risk_level": 0.9},
]


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def build_row(rng: random.Random, user_id: str, risk_level: float) -> dict:
    row: dict[str, object] = {"User": user_id}

    age = rng.randint(24, 68)
    retirement_age = clamp(age + rng.randint(2, 30), age + 1, 70)
    yearly_income = round(rng.uniform(28000, 145000), 2)
    per_capita_income = round(yearly_income * rng.uniform(0.35, 0.6), 2)
    total_debt = round(yearly_income * clamp(rng.uniform(0.05, 0.6) + risk_level * 0.3, 0, 3), 2)
    fico = int(clamp(rng.gauss(720 - risk_level * 160, 40), 300, 850))
    num_cards = rng.randint(1, 6)

    debt_to_income = round(total_debt / yearly_income, 4) if yearly_income else 0.0
    income_per_card = round(yearly_income / num_cards, 2)
    debt_per_card = round(total_debt / num_cards, 2)
    years_to_retirement = retirement_age - age
    fico_norm = clamp((fico - 300) / (850 - 300), 0, 1)
    dti_norm = clamp(debt_to_income / 1.5, 0, 1)
    credit_risk_proxy = round((1 - fico_norm) * 0.6 + dti_norm * 0.4, 4)

    num_active_cards = num_cards
    num_card_brands = rng.randint(1, min(3, num_cards))
    avg_credit_limit = round(rng.uniform(1500, 15000) * (1 - risk_level * 0.3), 2)
    total_credit_limit = round(avg_credit_limit * num_active_cards, 2)
    avg_card_age_days = int(rng.uniform(180, 3600) * (1 - risk_level * 0.4))
    oldest_card_age_days = int(avg_card_age_days * rng.uniform(1.1, 1.8))
    pct_cards_with_chip = round(clamp(rng.uniform(0.6, 1.0) - risk_level * 0.2, 0, 1), 3)
    any_card_on_dark_web = 1 if rng.random() < (0.02 + risk_level * 0.15) else 0

    # Transaction volume scales down with "newer/riskier" account behavior for realism.
    txn_count = int(rng.uniform(20, 400) * (1 - risk_level * 0.3))
    txn_count = max(txn_count, 5)
    avg_amt = round(rng.uniform(20, 180) * (1 + risk_level * 0.4), 2)
    std_amt = round(avg_amt * rng.uniform(0.3, 1.4) * (1 + risk_level * 0.5), 2)
    median_amt = round(avg_amt * rng.uniform(0.5, 0.9), 2)
    max_amt = round(avg_amt + std_amt * rng.uniform(3, 8), 2)
    total_spend = round(avg_amt * txn_count, 2)
    amount_volatility = round(std_amt / avg_amt, 4) if avg_amt else 0.0
    high_value_ratio = round(clamp(rng.uniform(0.02, 0.08) + risk_level * 0.05, 0, 1), 4)

    days_since_first_txn = int(rng.uniform(200, 1500) * (1 - risk_level * 0.3))
    days_since_last_txn = int(rng.uniform(0, 20) + risk_level * rng.uniform(0, 15))
    days_since_last_txn = min(days_since_last_txn, days_since_first_txn)
    active_days = int(min(txn_count, days_since_first_txn) * rng.uniform(0.3, 0.7))

    txn_180 = max(1, int(txn_count * rng.uniform(0.5, 0.9)))
    txn_90 = int(txn_180 * rng.uniform(0.4, 0.7))
    txn_30 = int(txn_90 * rng.uniform(0.25, 0.6) * (1 + risk_level * 0.3))
    txn_7 = int(txn_30 * rng.uniform(0.15, 0.4))
    txn_30, txn_7 = max(txn_30, txn_7), txn_7
    spend_180 = round(total_spend * (txn_180 / txn_count), 2) if txn_count else 0.0
    spend_90 = round(spend_180 * (txn_90 / max(txn_180, 1)), 2)
    spend_30 = round(spend_90 * (txn_30 / max(txn_90, 1)), 2)
    spend_7 = round(spend_30 * (txn_7 / max(txn_30, 1)), 2)

    recent_mean = round(avg_amt * (1 + (risk_level - 0.3) * 0.6), 2)
    historical_mean = avg_amt
    historical_std_amount = round(std_amt * rng.uniform(0.7, 1.1), 2)
    amount_zscore = round((recent_mean - historical_mean) / historical_std_amount, 4) if historical_std_amount else 0.0

    unique_merchants = max(1, int(txn_count * rng.uniform(0.3, 0.7)))
    unique_mccs = max(1, int(unique_merchants * rng.uniform(0.3, 0.6)))

    online_r = round(clamp(rng.uniform(0.15, 0.35) + risk_level * 0.25, 0, 1), 4)
    chip_r = round(clamp(rng.uniform(0.35, 0.55) - risk_level * 0.15, 0, 1 - online_r), 4)
    swipe_r = round(clamp(1 - online_r - chip_r, 0, 1), 4)

    unique_states = rng.randint(1, 3) + (1 if risk_level > 0.6 else 0)
    out_of_state_ratio = round(clamp(rng.uniform(0.02, 0.1) + risk_level * 0.12, 0, 1), 4)

    night_ratio = round(clamp(rng.uniform(0.03, 0.12) + risk_level * 0.15, 0, 1), 4)
    weekend_ratio = round(clamp(rng.uniform(0.18, 0.32), 0, 1), 4)
    txn_hour_std = round(rng.uniform(3.5, 6.5), 3)
    hour_entropy = round(rng.uniform(2.2, 3.1), 3)

    error_count = int(txn_count * clamp(rng.uniform(0.0, 0.01) + risk_level * 0.02, 0, 0.3))
    error_rate = round(error_count / txn_count, 5) if txn_count else 0.0

    historical_fraud_count = int(rng.random() < (risk_level * 0.15)) * rng.randint(1, 2)
    historical_fraud_rate = round(historical_fraud_count / txn_count, 5) if txn_count else 0.0
    fraud_count_30d = historical_fraud_count if rng.random() < 0.5 else 0

    recent_spending_change = round(recent_mean / historical_mean, 4) if historical_mean else 0.0
    merchant_diversity_30d = max(1, int(unique_merchants * (txn_30 / max(txn_count, 1))))

    txn_ratio_30_180 = round(txn_30 / txn_180, 4) if txn_180 else 0.0
    days_since_last_hv = int(rng.uniform(10, 120) * (1 - risk_level * 0.4))
    mcc_novelty = round(clamp(rng.uniform(0.03, 0.1) + risk_level * 0.1, 0, 1), 4)
    state_novelty = round(clamp(rng.uniform(0.0, 0.05) + risk_level * 0.08, 0, 1), 4)

    merchant_concentration = round(clamp(rng.uniform(0.1, 0.3) - risk_level * 0.05, 0, 1), 4)
    mcc_concentration = round(clamp(rng.uniform(0.15, 0.35) - risk_level * 0.05, 0, 1), 4)
    spending_trend = round(rng.uniform(-15, 15) + risk_level * rng.uniform(0, 25), 3)

    income_to_credit_limit_ratio = round(yearly_income / total_credit_limit, 4) if total_credit_limit else 0.0
    fico_x_debt_to_income = round(fico * debt_to_income, 3)
    fraud_rate_x_recency = round(historical_fraud_rate * days_since_last_txn, 5)
    card_age_at_first_use_gap = int(oldest_card_age_days - days_since_first_txn)

    values = {
        "Current Age": age, "Retirement Age": retirement_age,
        "Per Capita Income - Zipcode": per_capita_income, "Yearly Income - Person": yearly_income,
        "Total Debt": total_debt, "FICO Score": fico, "Num Credit Cards": num_cards,
        "debt_to_income": debt_to_income, "income_per_card": income_per_card,
        "debt_per_card": debt_per_card, "years_to_retirement": years_to_retirement,
        "credit_risk_proxy": credit_risk_proxy,
        "num_active_cards": num_active_cards, "num_card_brands": num_card_brands,
        "total_credit_limit": total_credit_limit, "avg_credit_limit": avg_credit_limit,
        "avg_card_age_days": avg_card_age_days, "oldest_card_age_days": oldest_card_age_days,
        "pct_cards_with_chip": pct_cards_with_chip, "any_card_on_dark_web": any_card_on_dark_web,
        "txn_count": txn_count, "total_spend": total_spend, "avg_transaction_amount": avg_amt,
        "median_transaction_amount": median_amt, "max_transaction_amount": max_amt,
        "std_transaction_amount": std_amt, "amount_volatility": amount_volatility,
        "high_value_transaction_ratio": high_value_ratio,
        "days_since_first_txn": days_since_first_txn, "days_since_last_txn": days_since_last_txn,
        "active_days": active_days,
        "transactions_7d": txn_7, "spend_7d": spend_7, "transactions_30d": txn_30, "spend_30d": spend_30,
        "transactions_90d": txn_90, "spend_90d": spend_90, "transactions_180d": txn_180, "spend_180d": spend_180,
        "recent_mean_amount": recent_mean, "historical_mean_amount": historical_mean,
        "unique_merchants": unique_merchants, "unique_mccs": unique_mccs,
        "chip_transaction_ratio": chip_r, "online_transaction_ratio": online_r,
        "swipe_transaction_ratio": swipe_r,
        "unique_states": unique_states, "out_of_state_ratio": out_of_state_ratio,
        "night_transaction_ratio": night_ratio, "weekend_transaction_ratio": weekend_ratio,
        "txn_hour_std": txn_hour_std, "hour_entropy": hour_entropy,
        "error_count": error_count, "error_rate": error_rate,
        "historical_fraud_count": historical_fraud_count, "historical_fraud_rate": historical_fraud_rate,
        "fraud_count_30d": fraud_count_30d,
        "recent_spending_change": recent_spending_change, "merchant_diversity_30d": merchant_diversity_30d,
        "txn_count_ratio_30d_vs_180d": txn_ratio_30_180, "historical_std_amount": historical_std_amount,
        "amount_zscore_vs_own_history": amount_zscore,
        "days_since_last_high_value_txn": days_since_last_hv,
        "mcc_novelty_ratio_30d": mcc_novelty, "state_novelty_ratio_30d": state_novelty,
        "merchant_concentration": merchant_concentration, "mcc_concentration": mcc_concentration,
        "spending_trend": spending_trend,
        "income_to_credit_limit_ratio": income_to_credit_limit_ratio,
        "fico_x_debt_to_income": fico_x_debt_to_income,
        "historical_fraud_rate_x_days_since_last_txn": fraud_rate_x_recency,
        "card_age_at_first_use_gap": card_age_at_first_use_gap,
    }
    row.update(values)
    row["Gender"] = rng.choice(["Male", "Female"])
    row["State"] = rng.choice(STATES)
    return row


def load_schema_columns(schema_path: Path) -> tuple[list[str], list[str]]:
    spec = json.loads(schema_path.read_text())
    return spec["raw_numerical_columns"], spec["raw_categorical_columns"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--schema",
        type=Path,
        default=None,
        help="Path to a real feature_names.json to generate columns from instead of the "
        "built-in 74-field list (use this if your model's features have changed).",
    )
    parser.add_argument("--rows", type=int, default=5, help="Number of customer rows to generate.")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).parent / "sample_customers.csv",
        help="Output CSV path.",
    )
    parser.add_argument("--seed", type=int, default=7, help="Random seed for reproducibility.")
    args = parser.parse_args()

    if args.schema:
        numerical_cols, categorical_cols = load_schema_columns(args.schema)
    else:
        numerical_cols, categorical_cols = NUMERICAL_COLUMNS, CATEGORICAL_COLUMNS

    rng = random.Random(args.seed)
    n = args.rows
    profiles = PROFILES if n == len(PROFILES) else [
        {"name": f"row_{i}", "risk_level": i / max(n - 1, 1)} for i in range(n)
    ]

    rows = []
    for i, profile in enumerate(profiles[:n]):
        user_id = f"TEST-{1000 + i}"
        row = build_row(rng, user_id, profile["risk_level"])
        # If generating against a real (possibly different) schema, only keep declared
        # columns, in that exact order, and fall back to 0 / "" for anything unrecognized.
        if args.schema:
            filled = {"User": row["User"]}
            for c in numerical_cols:
                filled[c] = row.get(c, 0)
            for c in categorical_cols:
                filled[c] = row.get(c, "")
            row = filled
        rows.append(row)

    fieldnames = ["User"] + list(numerical_cols) + list(categorical_cols)
    with open(args.out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})

    print(f"Wrote {len(rows)} rows x {len(fieldnames)} columns to {args.out}")


if __name__ == "__main__":
    main()
