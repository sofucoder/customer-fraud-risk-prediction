from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class SingleCustomerRequest(BaseModel):
    """
    Raw feature values for one customer, keyed exactly as in
    config/feature_names.json (raw_numerical_columns + raw_categorical_columns),
    plus an optional 'User' id used for display only.
    """

    features: dict[str, Any] = Field(
        ..., description="Raw feature name -> value, matching feature_names.json"
    )


class PredictionResult(BaseModel):
    customer_id: Any
    raw_probability: float
    calibrated_probability: float
    risk_score: float
    risk_band: str
    fraud_flag: int
    threshold_used: float
    top_features: list[dict[str, Any]] | None = None


class BatchSummary(BaseModel):
    n_customers: int
    n_high_risk: int
    n_medium_risk: int
    n_low_risk: int
    n_very_low_risk: int
    n_very_high_risk: int
    average_risk_score: float


class BatchPredictionResponse(BaseModel):
    summary: BatchSummary
    results: list[PredictionResult]


class HealthResponse(BaseModel):
    status: str
    model_name: str
    model_version: str
    calibration_method: str
    decision_threshold: float
