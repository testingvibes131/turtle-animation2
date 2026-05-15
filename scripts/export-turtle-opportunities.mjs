/**
 * Fetches opportunities from Turtle Earn API (same source as app.turtle.xyz earn UI)
 * and writes a CSV to public/data/turtle-opportunities.csv (API `estimatedApr`).
 *
 * For site-style display APR, use: node scripts/export-turtle-opportunities-display.mjs
 *
 * Run: node scripts/export-turtle-opportunities.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchOpportunities, rowsToCsvLines } from "./lib/turtleOpportunitiesExport.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "data", "turtle-opportunities.csv");

async function main() {
  const { rows, total } = await fetchOpportunities();
  const lines = rowsToCsvLines(rows, (o) => o.estimatedApr ?? "");

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, lines.join("\n") + "\n", "utf8");

  console.log(`Wrote ${rows.length} rows (API total: ${total ?? "?"}) to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
