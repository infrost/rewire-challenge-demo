import { readFile } from "node:fs/promises";
import path from "node:path";

import * as XLSX from "xlsx";

import { buildLandscapeMetricsFromWorkbook } from "@/lib/landscape-core";

export * from "@/lib/landscape-core";

export const landscapeWorkbookPath = path.join(
  process.cwd(),
  "requirements",
  "demo.xlsx",
);

export async function getLandscapeMetrics() {
  const buffer = await readFile(landscapeWorkbookPath);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  return buildLandscapeMetricsFromWorkbook(workbook);
}
