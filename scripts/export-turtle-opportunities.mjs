/**
 * Fetches opportunities from Turtle Earn API (same source as app.turtle.xyz earn UI)
 * and writes a CSV to public/data/turtle-opportunities.csv
 *
 * Run: node scripts/export-turtle-opportunities.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "data", "turtle-opportunities.csv");
const API = "https://earn.turtle.xyz/v1/opportunities/";

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatProductType(type) {
  if (!type) return "";
  return type
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function primaryChain(opp) {
  const t = opp.baseTokens ?? opp.receiptToken;
  return t?.chain?.name ?? "";
}

async function main() {
  const res = await fetch(API, {
    headers: { Accept: "application/json", "User-Agent": "turtle-redesign-export/1" },
  });
  if (!res.ok) {
    throw new Error(`GET ${API} failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const rows = [...(data.opportunities ?? [])];
  rows.sort((a, b) => a.name.localeCompare(b.name));

  const headers = [
    "id",
    "name",
    "product",
    "tvl_usd",
    "est_apr_percent",
    "featured",
    "curator",
    "chain",
    "description",
  ];

  const lines = [headers.map(csvCell).join(",")];
  for (const o of rows) {
    lines.push(
      [
        o.id,
        o.name,
        formatProductType(o.type),
        o.tvl ?? "",
        o.estimatedApr ?? "",
        o.featured === true ? "true" : o.featured === false ? "false" : "",
        o.curator?.name ?? "",
        primaryChain(o),
        o.description ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, lines.join("\n") + "\n", "utf8");

  console.log(`Wrote ${rows.length} rows (API total: ${data.total ?? "?"}) to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
