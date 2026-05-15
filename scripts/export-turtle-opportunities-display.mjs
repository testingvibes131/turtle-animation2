/**
 * Fetches opportunities from Turtle Earn API and writes a CSV using the
 * site-style display APR (matches app.turtle.xyz opportunity cards).
 *
 * Run: node scripts/export-turtle-opportunities-display.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  displayAprPercent,
  fetchOpportunities,
  rowsToCsvLines,
} from "./lib/turtleOpportunitiesExport.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(
  __dirname,
  "..",
  "public",
  "data",
  "turtle-opportunities-display.csv",
);

async function main() {
  const { rows, total } = await fetchOpportunities();
  const lines = rowsToCsvLines(rows, displayAprPercent);

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, lines.join("\n") + "\n", "utf8");

  console.log(
    `Wrote ${rows.length} rows (API total: ${total ?? "?"}) to ${OUT}`,
  );
  console.log("APR column uses site display formula (fixed apr + minApr for range rewards).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
