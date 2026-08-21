export type RiskBandLabel = "Very Low" | "Low" | "Medium" | "High" | "Very High";

export interface RiskBandConfig {
  min: number;
  max: number;
  label: RiskBandLabel;
}

export interface SchemaResponse {
  numerical_columns: string[];
  categorical_columns: string[];
  risk_bands: RiskBandConfig[];
  decision_threshold: number;
  model_name: string;
}

export interface HealthResponse {
  status: string;
  model_name: string;
  model_version: string;
  calibration_method: string;
  decision_threshold: number;
}

export interface PredictionResult {
  customer_id: string | number;
  raw_probability: number;
  calibrated_probability: number;
  risk_score: number;
  risk_band: RiskBandLabel;
  fraud_flag: number;
  threshold_used: number;
  top_features?: { feature: string; contribution: number; direction?: "increase" | "decrease" }[] | null;
  // Populated client-side when the prediction is stored, not by the API.
  source_features?: Record<string, string | number>;
  predicted_at?: string;
}

export interface BatchSummary {
  n_customers: number;
  n_very_low_risk: number;
  n_low_risk: number;
  n_medium_risk: number;
  n_high_risk: number;
  n_very_high_risk: number;
  average_risk_score: number;
}

export interface BatchPredictionResponse {
  summary: BatchSummary;
  results: PredictionResult[];
}

export interface ApiError {
  detail: string;
}

export interface ModelMetricsBlock {
  selected_model?: string;
  metrics?: Record<string, number>;
  calibration_brier?: Record<string, number>;
  [key: string]: unknown;
}

export interface MetricsResponse {
  validation_metrics: ModelMetricsBlock | null;
  test_metrics: Record<string, number> | null;
}
