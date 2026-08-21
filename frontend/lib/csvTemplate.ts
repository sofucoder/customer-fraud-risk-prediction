import type { SchemaResponse } from "./types";
import { EXAMPLE_CUSTOMER } from "./exampleCustomer";

export function buildCsvTemplate(schema: SchemaResponse): string {
  const columns = ["User", ...schema.numerical_columns, ...schema.categorical_columns];
  const exampleRow = columns.map((c) => {
    const v = EXAMPLE_CUSTOMER[c];
    return v !== undefined ? String(v) : "";
  });
  const header = columns.join(",");
  return `${header}\n${exampleRow.join(",")}\n`;
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Cheap client-side row/column preview -- not a full CSV parser (no quoted-comma handling),
// good enough for the upload preview and a pre-flight "which required columns are missing"
// check before we spend a real API round-trip on an obviously malformed file.
export async function previewCsv(file: File): Promise<{ rowCount: number; columns: string[] }> {
  const text = await file.text();
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
  const columns = lines.length > 0 ? lines[0].split(",").map((c) => c.trim()) : [];
  return { rowCount: Math.max(0, lines.length - 1), columns };
}
