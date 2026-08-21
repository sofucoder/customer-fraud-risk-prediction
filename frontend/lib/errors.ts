export interface FriendlyError {
  message: string;
  raw: string;
}

export function toFriendlyError(status: number, rawDetail: string): FriendlyError {
  const lower = rawDetail.toLowerCase();

  if (status === 422 && lower.includes("missing required columns")) {
    return {
      message: "Some required customer fields are missing. Check the highlighted fields and try again.",
      raw: rawDetail,
    };
  }
  if (status === 422 && lower.includes("non-numeric values")) {
    return {
      message: "One or more numeric fields contain a value that isn't a number.",
      raw: rawDetail,
    };
  }
  if (status === 422 && lower.includes("duplicate customer ids")) {
    return {
      message: "This CSV has duplicate customer IDs. Each row needs a unique ID.",
      raw: rawDetail,
    };
  }
  if (status === 422 && lower.includes("2 or more customer rows")) {
    return {
      message: "Batch prediction needs at least 2 customer rows — for one customer, use Single Prediction.",
      raw: rawDetail,
    };
  }
  if (status === 422 && lower.includes("csv")) {
    return { message: "That file couldn't be read as a CSV. Check the format and try again.", raw: rawDetail };
  }
  if (status === 503) {
    return {
      message: "The prediction service isn't ready yet — it may still be starting up. Try again in a moment.",
      raw: rawDetail,
    };
  }
  if (status === 500) {
    return {
      message: "Something went wrong while scoring this request. No prediction was made.",
      raw: rawDetail,
    };
  }
  if (status === 0) {
    return {
      message: "Couldn't reach the API. Confirm the backend is running and reachable.",
      raw: rawDetail,
    };
  }
  return { message: rawDetail, raw: rawDetail };
}
