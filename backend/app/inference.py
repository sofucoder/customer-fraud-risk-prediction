"""
One shared inference function used by both the single-customer and batch endpoints,
so the two modes can never silently drift apart from each other (audit Section J).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .artifacts import ModelBundle


class InputValidationError(ValueError):
    """Raised for anything a client should fix and resubmit -- never silently coerced."""


def validate_columns(df: pd.DataFrame, bundle: ModelBundle) -> None:
    required = set(bundle.required_columns)
    missing = required - set(df.columns)
    if missing:
        raise InputValidationError(f"Missing required columns: {sorted(missing)}")

    # Type/NaN sanity: numeric columns must actually be numeric-coercible.
    bad_numeric = []
    for col in bundle.feature_spec["raw_numerical_columns"]:
        coerced = pd.to_numeric(df[col], errors="coerce")
        # A value that fails to coerce becomes NaN; if the ORIGINAL wasn't already
        # NaN/empty, that's a genuinely invalid value, not just a missing one.
        newly_invalid = coerced.isna() & df[col].notna() & (df[col].astype(str).str.strip() != "")
        if newly_invalid.any():
            bad_numeric.append(col)
    if bad_numeric:
        raise InputValidationError(f"Non-numeric values found in numeric columns: {bad_numeric}")


def predict_dataframe(df: pd.DataFrame, bundle: ModelBundle) -> pd.DataFrame:
    validate_columns(df, bundle)

    cols = bundle.required_columns
    X = bundle.preprocessor.transform(df[cols])

    if bundle.model_family == "FT-Transformer":
        raw_probs = _ft_predict_proba(bundle.model, X)
    else:
        raw_probs = bundle.model.predict_proba(X)[:, 1]

    calibrated_probs = _apply_calibrator(bundle.calibrator, raw_probs, bundle.calibration_method)
    scores = calibrated_probs * 100
    bands = [bundle.score_to_band(s) for s in scores]
    flags = (calibrated_probs >= bundle.decision_threshold).astype(int)

    return pd.DataFrame(
        {
            "customer_id": df["User"].values if "User" in df.columns else np.arange(len(df)),
            "raw_probability": raw_probs,
            "calibrated_probability": calibrated_probs,
            "risk_score": scores,
            "risk_band": bands,
            "fraud_flag": flags,
            "threshold_used": bundle.decision_threshold,
        }
    )


def predict_single(customer_features: dict, bundle: ModelBundle) -> dict:
    df = pd.DataFrame([customer_features])
    return predict_dataframe(df, bundle).iloc[0].to_dict()


def predict_batch(df: pd.DataFrame, bundle: ModelBundle) -> pd.DataFrame:
    if len(df) < 2:
        raise InputValidationError("Batch prediction expects 2 or more customer rows.")
    if "User" in df.columns and df["User"].duplicated().any():
        dupes = df.loc[df["User"].duplicated(), "User"].tolist()
        raise InputValidationError(f"Duplicate customer IDs in batch input: {dupes}")
    return predict_dataframe(df, bundle)


def _apply_calibrator(calibrator, raw_probs: np.ndarray, method: str) -> np.ndarray:
    # Mirrors the notebook's apply_calibrator exactly -- isotonic exposes .predict(),
    # Platt-scaling is a fitted LogisticRegression exposing .predict_proba().
    if method == "isotonic":
        return np.clip(calibrator.predict(raw_probs), 0.0, 1.0)
    if method == "platt":
        return calibrator.predict_proba(raw_probs.reshape(-1, 1))[:, 1]
    raise ValueError(f"Unknown calibration method in config.json: {method!r}")


def _ft_predict_proba(model, X, batch_size: int = 1024) -> np.ndarray:
    # Local import so environments serving only sklearn/GBM models don't require torch.
    import torch

    device = next(model.parameters()).device
    model.eval()
    out = []
    X = np.asarray(X, dtype=np.float32)
    with torch.no_grad():
        for i in range(0, len(X), batch_size):
            xb = torch.tensor(X[i : i + batch_size], dtype=torch.float32).to(device)
            out.append(torch.sigmoid(model(xb)).cpu().numpy())
    return np.concatenate(out)
