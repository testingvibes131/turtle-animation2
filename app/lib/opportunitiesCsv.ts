export type OpportunityRow = {
  id: string;
  name: string;
  product: string;
  tvlUsd: number;
  estAprPercent: number;
  featured: boolean;
  curator: string;
  chain: string;
  description: string;
};

/** Minimal RFC 4180-style parser (quoted fields, doubled quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length > 0 && row.some((c) => c.length > 0)) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
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

const TVL_DUST_MAX = 100_000;

export function rowFromCells(header: string[], cells: string[]): OpportunityRow | null {
  if (cells.length < 9) return null;
  const get = (name: string) => {
    const idx = header.indexOf(name);
    return idx >= 0 ? (cells[idx] ?? "").trim() : "";
  };

  const tvl = Number.parseFloat(get("tvl_usd"));
  if (!Number.isFinite(tvl)) return null;

  return {
    id: get("id"),
    name: get("name"),
    product: get("product") || "Unknown",
    tvlUsd: tvl,
    estAprPercent: Number.parseFloat(get("est_apr_percent")) || 0,
    featured: get("featured").toLowerCase() === "true",
    curator: get("curator"),
    chain: get("chain"),
    description: get("description"),
  };
}

export function parseOpportunityRows(csvText: string): OpportunityRow[] {
  const table = parseCsv(csvText);
  if (table.length < 2) return [];
  const header = table[0]!.map((h) => h.trim());
  const out: OpportunityRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const row = rowFromCells(header, table[r]!);
    if (!row?.id || isDustTvl(row.tvlUsd)) continue;
    out.push(row);
  }
  return out;
}

export function isDustTvl(tvlUsd: number): boolean {
  return tvlUsd <= TVL_DUST_MAX;
}

/** Keep every featured row; keep 1/8 of non-featured (stable by id). */
const NON_FEATURED_KEEP_EVERY_NTH = 8;

export function thinNonFeaturedOpportunities(
  rows: OpportunityRow[],
): OpportunityRow[] {
  const featured: OpportunityRow[] = [];
  const rest: OpportunityRow[] = [];
  for (const row of rows) {
    (row.featured ? featured : rest).push(row);
  }
  rest.sort((a, b) => a.id.localeCompare(b.id));
  const thinRest = rest.filter((_, i) => i % NON_FEATURED_KEEP_EVERY_NTH === 0);
  return [...featured, ...thinRest];
}
