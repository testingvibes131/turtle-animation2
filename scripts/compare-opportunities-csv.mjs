/**
 * Compare public/data/turtle-opportunities.csv against live Earn API.
 * Run: node scripts/compare-opportunities-csv.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV = join(__dirname, "..", "public", "data", "turtle-opportunities.csv");
const API = "https://earn.turtle.xyz/v1/opportunities/";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length > 0 && row.some((c) => c.length > 0)) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        continue;
      }
      field += c;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ",") {
      pushField();
      continue;
    }
    if (c === "\n") {
      pushField();
      pushRow();
      continue;
    }
    if (c === "\r") {
      if (next === "\n") i++;
      pushField();
      pushRow();
      continue;
    }
    field += c;
  }
  pushField();
  pushRow();
  return rows;
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

function rel(a, b) {
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9);
}

const csvText = readFileSync(CSV, "utf8");
const table = parseCsv(csvText);
const header = table[0].map((h) => h.trim());
const csvById = new Map();
for (let r = 1; r < table.length; r++) {
  const cells = table[r];
  const get = (name) => {
    const idx = header.indexOf(name);
    return idx >= 0 ? (cells[idx] ?? "").trim() : "";
  };
  const id = get("id");
  if (!id) continue;
  csvById.set(id, {
    id,
    name: get("name"),
    product: get("product"),
    tvlUsd: Number.parseFloat(get("tvl_usd")),
    estAprPercent: Number.parseFloat(get("est_apr_percent")) || 0,
    featured: get("featured").toLowerCase() === "true",
    curator: get("curator"),
    chain: get("chain"),
  });
}

const res = await fetch(API, {
  headers: { Accept: "application/json", "User-Agent": "turtle-redesign-compare/1" },
});
if (!res.ok) throw new Error(`API ${res.status}`);
const data = await res.json();
const apiById = new Map((data.opportunities ?? []).map((o) => [o.id, o]));

console.log("CSV rows:", csvById.size, "API rows:", apiById.size);

const onlyCsv = [...csvById.keys()].filter((id) => !apiById.has(id));
const onlyApi = [...apiById.keys()].filter((id) => !csvById.has(id));
console.log("Only in CSV:", onlyCsv.length, "Only in API:", onlyApi.length);

const aprDiffs = [];
const tvlDiffs = [];
const featuredDiffs = [];
const nameDiffs = [];
const chainDiffs = [];
const curatorDiffs = [];

for (const [id, csv] of csvById) {
  const api = apiById.get(id);
  if (!api) continue;
  const apiApr = api.estimatedApr ?? 0;
  const apiTvl = api.tvl ?? 0;
  const apiFeatured = api.featured === true;
  const apiChain = primaryChain(api);
  const apiCurator = api.curator?.name ?? "";
  const apiProduct = formatProductType(api.type);

  if (Math.abs(csv.estAprPercent - apiApr) > 0.0001) {
    aprDiffs.push({
      id,
      name: csv.name,
      csvApr: csv.estAprPercent,
      apiApr,
      delta: csv.estAprPercent - apiApr,
    });
  }
  if (rel(csv.tvlUsd, apiTvl) > 0.001 && Math.abs(csv.tvlUsd - apiTvl) > 1) {
    tvlDiffs.push({
      id,
      name: csv.name,
      csvTvl: csv.tvlUsd,
      apiTvl,
    });
  }
  if (csv.featured !== apiFeatured) {
    featuredDiffs.push({ id, name: csv.name, csv: csv.featured, api: apiFeatured });
  }
  if (csv.name !== api.name) nameDiffs.push({ id, csv: csv.name, api: api.name });
  if (csv.chain !== apiChain) chainDiffs.push({ id, name: csv.name, csv: csv.chain, api: apiChain });
  if (csv.curator !== apiCurator) {
    curatorDiffs.push({ id, name: csv.name, csv: csv.curator, api: apiCurator });
  }
  if (csv.product !== apiProduct) {
    /* product diff tracked separately if needed */
  }
}

aprDiffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

console.log("\n=== APR mismatches (csv est_apr_percent vs API estimatedApr) ===", aprDiffs.length);
if (aprDiffs.length === 0) {
  console.log("(none — CSV matches API estimatedApr for all shared IDs)");
} else {
  for (const d of aprDiffs.slice(0, 30)) {
    console.log(
      `  ${d.name.slice(0, 50)} | csv=${d.csvApr} api=${d.apiApr} Δ=${d.delta.toFixed(4)}`,
    );
  }
}

console.log("\n=== TVL mismatches ===", tvlDiffs.length);
for (const d of tvlDiffs.slice(0, 15)) {
  console.log(`  ${d.name.slice(0, 50)} | csv=${d.csvTvl} api=${d.apiTvl}`);
}

console.log("\n=== Featured mismatches ===", featuredDiffs.length);
console.log(featuredDiffs);

console.log("\n=== Name mismatches ===", nameDiffs.length);
for (const d of nameDiffs.slice(0, 10)) console.log(`  csv="${d.csv}" api="${d.api}"`);

console.log("\n=== Chain mismatches ===", chainDiffs.length);
for (const d of chainDiffs.slice(0, 10)) {
  console.log(`  ${d.name}: csv="${d.csv}" api="${d.api}"`);
}

console.log("\n=== Curator mismatches ===", curatorDiffs.length);
for (const d of curatorDiffs.slice(0, 10)) {
  console.log(`  ${d.name}: csv="${d.csv}" api="${d.api}"`);
}

// Explore incentives vs displayed APR
let csvMatchesIncentiveSum = 0;
let apiAprZeroButIncentives = 0;
const uiMismatchCandidates = [];

for (const [id, csv] of csvById) {
  const api = apiById.get(id);
  if (!api) continue;
  const incs = api.incentives ?? [];
  const incApr = incs.reduce((s, i) => s + (i.estimatedApr ?? i.apr ?? 0), 0);
  if (Math.abs(csv.estAprPercent - incApr) < 0.0001 && Math.abs(csv.estAprPercent - (api.estimatedApr ?? 0)) > 0.0001) {
    csvMatchesIncentiveSum++;
  }
  if ((api.estimatedApr ?? 0) === 0 && incApr > 0) apiAprZeroButIncentives++;
  if (incs.length > 0) {
    uiMismatchCandidates.push({
      name: api.name,
      csvApr: csv.estAprPercent,
      apiApr: api.estimatedApr ?? 0,
      incApr,
      incentives: incs.map((i) => ({
        label: i.label ?? i.name ?? i.type,
        apr: i.estimatedApr ?? i.apr,
      })),
    });
  }
}

console.log("\n=== Incentive analysis ===");
console.log("API estimatedApr=0 but incentives sum > 0:", apiAprZeroButIncentives);
console.log("CSV matches incentive sum but not estimatedApr:", csvMatchesIncentiveSum);

const featured = [...csvById.values()].filter((r) => r.featured);
console.log("\nFeatured in CSV:", featured.length, featured.map((r) => `${r.name} apr=${r.estAprPercent}`).join("\n  "));

const apiFeatured = (data.opportunities ?? []).filter((o) => o.featured);
console.log("\nFeatured in API:", apiFeatured.length);
for (const o of apiFeatured) {
  const csv = csvById.get(o.id);
  console.log(
    `  ${o.name} apiApr=${o.estimatedApr} csvApr=${csv?.estAprPercent ?? "missing"}`,
  );
}
