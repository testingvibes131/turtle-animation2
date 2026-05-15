/**
 * Shared helpers for Turtle opportunities CSV export scripts.
 */

export const API = "https://earn.turtle.xyz/v1/opportunities/";

export const CSV_HEADERS = [
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

export function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function formatProductType(type) {
  if (!type) return "";
  return type
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function primaryChain(opp) {
  const t = opp.baseTokens ?? opp.receiptToken;
  return t?.chain?.name ?? "";
}

/** APR shown on app.turtle.xyz opportunity cards (fixed apr + minApr for range rewards). */
export function displayAprPercent(opp) {
  return (opp.incentives ?? []).reduce((sum, incentive) => {
    if (incentive.apr != null && Number.isFinite(incentive.apr)) {
      return sum + incentive.apr;
    }
    if (incentive.minApr != null && Number.isFinite(incentive.minApr)) {
      return sum + incentive.minApr;
    }
    return sum;
  }, 0);
}

export function opportunityToCells(opp, aprPercent) {
  return [
    opp.id,
    (opp.name ?? "").trim(),
    formatProductType(opp.type),
    opp.tvl ?? "",
    aprPercent,
    opp.featured === true ? "true" : opp.featured === false ? "false" : "",
    opp.curator?.name ?? "",
    primaryChain(opp),
    opp.description ?? "",
  ];
}

export async function fetchOpportunities() {
  const res = await fetch(API, {
    headers: { Accept: "application/json", "User-Agent": "turtle-redesign-export/1" },
  });
  if (!res.ok) {
    throw new Error(`GET ${API} failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const rows = [...(data.opportunities ?? [])];
  rows.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  return { rows, total: data.total };
}

export function rowsToCsvLines(rows, aprForOpportunity) {
  const lines = [CSV_HEADERS.map(csvCell).join(",")];
  for (const opp of rows) {
    lines.push(
      opportunityToCells(opp, aprForOpportunity(opp))
        .map(csvCell)
        .join(","),
    );
  }
  return lines;
}
