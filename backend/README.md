# Fraud-Risk API (FastAPI backend)

Serves the model trained and saved by the notebook's Section 33 ("Production Artifacts").
Loads artifacts once at startup -- no retraining, no per-request model loading.

## Setup

1. Run the notebook through Section 33 in Kaggle.
2. Download `/kaggle/working/fraud_detection_output/` and place its contents at
   `backend/model_artifacts/` (i.e. `backend/model_artifacts/model/model.pkl`, etc.).
3. `pip install -r requirements.txt`
4. `uvicorn app.main:app --reload --port 8000`

## Endpoints

- `GET  /health` -- liveness + which model/threshold/calibration is loaded
- `POST /predict` -- single customer, JSON body `{"features": {...}}`
- `POST /predict/batch` -- CSV upload (multipart/form-data, field name `file`), JSON response
- `POST /predict/batch/csv` -- same as above, but returns a downloadable CSV

## Design notes

- `app/inference.py` has ONE shared `predict_dataframe` function used by both single and
  batch paths, so the two modes cannot silently diverge from each other.
- Input validation (`InputValidationError`) checks required columns and numeric-coercibility
  before ever calling `preprocessor.transform` -- malformed input gets a 422 with a clear
  message, never a best-effort/garbage prediction.
- `app/artifacts.py` is the only place that deserializes pickles; it fails loudly and early
  (at startup) if artifacts are missing, rather than failing on the first real request.
