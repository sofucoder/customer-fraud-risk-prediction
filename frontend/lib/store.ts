"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PredictionResult } from "./types";

interface PredictionsState {
  history: PredictionResult[];
  addPrediction: (result: PredictionResult) => void;
  addBatch: (results: PredictionResult[]) => void;
  clear: () => void;
  getByCustomerId: (id: string | number) => PredictionResult | undefined;
}

// This is a real, downloadable Next.js app the user runs on their own machine/server --
// not a claude.ai sandboxed artifact -- so localStorage is fully supported here and gives
// the Dashboard/Customer Details pages something to show across page navigations without
// standing up a database, which was explicitly out of scope for this phase.
export const usePredictionsStore = create<PredictionsState>()(
  persist(
    (set, get) => ({
      history: [],
      addPrediction: (result) =>
        set((state) => ({
          history: [
            { ...result, predicted_at: new Date().toISOString() },
            ...state.history.filter((r) => r.customer_id !== result.customer_id),
          ],
        })),
      addBatch: (results) =>
        set((state) => {
          const now = new Date().toISOString();
          const stamped = results.map((r) => ({ ...r, predicted_at: now }));
          const ids = new Set(stamped.map((r) => r.customer_id));
          return {
            history: [...stamped, ...state.history.filter((r) => !ids.has(r.customer_id))],
          };
        }),
      clear: () => set({ history: [] }),
      getByCustomerId: (id) =>
        get().history.find((r) => String(r.customer_id) === String(id)),
    }),
    { name: "fraud-risk-predictions" }
  )
);
