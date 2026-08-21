import type {
  BatchPredictionResponse,
  HealthResponse,
  MetricsResponse,
  PredictionResult,
  SchemaResponse,
} from "./types";

// Next.js requires the NEXT_PUBLIC_ prefix (not VITE_) for client-exposed env vars --
// this is the direct Next.js equivalent of the VITE_API_BASE_URL convention.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiRequestError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON -- keep statusText
    }
    throw new ApiRequestError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

async function safeFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, { cache: "no-store", ...init });
  } catch {
    // Network-level failure (API down, wrong URL, CORS) -- normalize to ApiRequestError
    // with status 0 so callers have one error type to handle everywhere.
    throw new ApiRequestError(0, "Network error: could not reach the API.");
  }
}

// --- Named to match the product spec's service-layer contract -------------------------

export async function getHealth(): Promise<HealthResponse> {
  return handleResponse<HealthResponse>(await safeFetch("/health"));
}

export async function getSchema(): Promise<SchemaResponse> {
  return handleResponse<SchemaResponse>(await safeFetch("/schema"));
}

export async function getMetrics(): Promise<MetricsResponse> {
  return handleResponse<MetricsResponse>(await safeFetch("/metrics"));
}

export async function predictCustomer(
  features: Record<string, string | number>
): Promise<PredictionResult> {
  return handleResponse<PredictionResult>(
    await safeFetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
    })
  );
}

export async function predictBatch(file: File): Promise<BatchPredictionResponse> {
  const form = new FormData();
  form.append("file", file);
  return handleResponse<BatchPredictionResponse>(
    await safeFetch("/predict/batch", { method: "POST", body: form })
  );
}

export async function downloadBatchPredictions(file: File): Promise<Blob> {
  const form = new FormData();
  form.append("file", file);
  const res = await safeFetch("/predict/batch/csv", { method: "POST", body: form });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new ApiRequestError(res.status, detail);
  }
  return res.blob();
}

// Back-compat aliases for the earlier build of this app.
export const fetchHealth = getHealth;
export const fetchSchema = getSchema;
export const predictSingle = predictCustomer;
export const downloadBatchCsv = downloadBatchPredictions;
