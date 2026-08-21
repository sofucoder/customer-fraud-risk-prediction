from __future__ import annotations

import io
import logging

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .artifacts import ModelBundle, load_bundle
from .inference import InputValidationError, predict_batch, predict_dataframe, predict_single
from .schemas import (
    BatchPredictionResponse,
    BatchSummary,
    HealthResponse,
    PredictionResult,
    SingleCustomerRequest,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fraud_api")

app = FastAPI(
    title="Customer Fraud-Risk API",
    version="1.0.0",
    description=(
        "Serves the notebook's selected, calibrated fraud-risk model. Loads model/"
        "preprocessor/calibrator artifacts once at startup -- never retrains per request."
    ),
)

# Loosen for local dev; restrict to the real frontend origin(s) before deploying.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_bundle: ModelBundle | None = None


@app.on_event("startup")
def _startup() -> None:
    global _bundle
    _bundle = load_bundle()
    logger.info(
        "Loaded model bundle: %s (family=%s, threshold=%.3f, calibration=%s)",
        _bundle.config["model_name"],
        _bundle.model_family,
        _bundle.decision_threshold,
        _bundle.calibration_method,
    )


def _get_bundle() -> ModelBundle:
    if _bundle is None:
        raise HTTPException(status_code=503, detail="Model artifacts not loaded yet.")
    return _bundle


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    bundle = _get_bundle()
    return HealthResponse(
        status="ok",
        model_name=bundle.config["model_name"],
        model_version=bundle.config["model_version"],
        calibration_method=bundle.calibration_method,
        decision_threshold=bundle.decision_threshold,
    )


@app.get("/schema")
def schema() -> dict:
    """Exposes the exact raw feature contract (names + which are categorical) so a frontend
    can render a single-customer form dynamically instead of hardcoding feature names that
    will drift out of sync every time the notebook's feature engineering changes."""
    bundle = _get_bundle()
    return {
        "numerical_columns": bundle.feature_spec["raw_numerical_columns"],
        "categorical_columns": bundle.feature_spec["raw_categorical_columns"],
        "risk_bands": [
            {"min": b.lo, "max": b.hi, "label": b.label} for b in bundle.risk_bands
        ],
        "decision_threshold": bundle.decision_threshold,
        "model_name": bundle.config["model_name"],
    }


@app.get("/metrics")
def metrics() -> dict:
    """Read-only passthrough of the notebook's own saved validation/test metrics
    (metrics/validation_metrics.json, metrics/test_metrics.json under the artifact
    bundle), so a 'Model Insights' UI page can show real evaluation numbers instead of
    the frontend hardcoding figures that go stale the moment the model is retrained.
    Returns nulls for whichever file isn't present rather than failing the request."""
    from .artifacts import ARTIFACT_DIR
    import json as _json

    def _read(path):
        return _json.loads(path.read_text()) if path.exists() else None

    val_path = ARTIFACT_DIR / "metrics" / "validation_metrics.json"
    test_path = ARTIFACT_DIR / "metrics" / "test_metrics.json"
    return {"validation_metrics": _read(val_path), "test_metrics": _read(test_path)}


@app.post("/predict", response_model=PredictionResult)
def predict(req: SingleCustomerRequest) -> PredictionResult:
    bundle = _get_bundle()
    try:
        result = predict_single(req.features, bundle)
    except InputValidationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:  # pragma: no cover - defensive, logged for diagnosis
        logger.exception("Unexpected error in /predict")
        raise HTTPException(status_code=500, detail="Internal prediction error.") from e
    return PredictionResult(**result)


@app.post("/predict/batch", response_model=BatchPredictionResponse)
async def predict_batch_endpoint(file: UploadFile = File(...)) -> BatchPredictionResponse:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Only .csv uploads are supported.")

    bundle = _get_bundle()
    raw_bytes = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw_bytes))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse CSV: {e}") from e

    try:
        result_df = predict_batch(df, bundle)
    except InputValidationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    except Exception as e:  # pragma: no cover
        logger.exception("Unexpected error in /predict/batch")
        raise HTTPException(status_code=500, detail="Internal prediction error.") from e

    band_counts = result_df["risk_band"].value_counts().to_dict()
    summary = BatchSummary(
        n_customers=len(result_df),
        n_very_low_risk=band_counts.get("Very Low", 0),
        n_low_risk=band_counts.get("Low", 0),
        n_medium_risk=band_counts.get("Medium", 0),
        n_high_risk=band_counts.get("High", 0),
        n_very_high_risk=band_counts.get("Very High", 0),
        average_risk_score=float(result_df["risk_score"].mean()),
    )
    results = [PredictionResult(**row) for row in result_df.to_dict(orient="records")]
    return BatchPredictionResponse(summary=summary, results=results)


@app.post("/predict/batch/csv")
async def predict_batch_csv_download(file: UploadFile = File(...)) -> StreamingResponse:
    """Same as /predict/batch, but returns a downloadable CSV instead of JSON -- backs the
    frontend's 'Download results' button on the Batch Prediction page."""
    bundle = _get_bundle()
    raw_bytes = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw_bytes))
        result_df = predict_batch(df, bundle)
    except InputValidationError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e

    buf = io.StringIO()
    result_df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fraud_predictions.csv"},
    )
