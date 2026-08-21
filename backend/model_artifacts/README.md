cd ~/Desktop/InternShip/Summer_Camp/Project/fraud_backend_fastapi/backend# Fraud Risk Model Artifacts (v1.0.0)

Model: LogisticRegression (snapshot-weighted)
Calibration: isotonic
Decision threshold: 0.140 (objective: f1)

## Inference chain (must be reproduced exactly)
raw features -> preprocessor.transform -> model.predict_proba -> calibrator -> risk_score (prob*100) -> band

## Files
- model/model.pkl, model/preprocessor.pkl, model/calibrator.pkl
- config/config.json, config/feature_names.json
- metrics/validation_metrics.json, metrics/test_metrics.json
- predictions/test_predictions.csv

## Known limitations (see full audit for detail)
- Synthetic dataset; does not represent real customers or real fraud patterns.
- Trained on a target with documented non-stationarity across pooled training years;
  snapshot-reweighting was tested as a mitigation (see Section 13b/21) -- check config.json's
  snapshot_reweighting_used field for whether the shipped model used it.
- Risk bands are a presentation layer over calibrated probability, not an independently
  validated financial risk metric.
