import { getConveyorOffset } from "@/app/v2/lib/conveyor";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import { scrolledGridUV } from "@/app/v2/lib/scrolledDnaBlend";
import { wrapIndex } from "@/app/v2/lib/toroidal";

/** O(1) lookup: grid[col][row] → opportunity at that crossing. */
export function buildCellLookup(
  cells: TerrainCell[],
  cols: number,
  rows: number,
): (TerrainCell | undefined)[][] {
  const grid: (TerrainCell | undefined)[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => undefined),
  );
  for (const cell of cells) {
    if (cell.col >= 0 && cell.col < cols && cell.row >= 0 && cell.row < rows) {
      grid[cell.col]![cell.row] = cell;
    }
  }
  return grid;
}

export function cellAtGrid(
  col: number,
  row: number,
  lookup: (TerrainCell | undefined)[][],
): TerrainCell | undefined {
  if (lookup.length === 0 || (lookup[0]?.length ?? 0) === 0) return undefined;
  const c = wrapIndex(Math.round(col), lookup.length);
  const r = wrapIndex(Math.round(row), lookup[0]!.length);
  return lookup[c]?.[r];
}

/**
 * Which opportunity's DNA is at this fixed crossing (matches scrolled height field).
 * Integer grid snap — never falls back to the peg's own row in the CSV.
 */
export function sourceCellAtCrossing(
  cell: TerrainCell,
  elapsed: number,
  lookup: (TerrainCell | undefined)[][],
): TerrainCell | undefined {
  const { offsetU, offsetV } = getConveyorOffset(elapsed);
  return cellAtGrid(cell.col - offsetU, cell.row - offsetV, lookup);
}

/** True when this peg's fixed crossing currently shows its own opportunity DNA. */
export function ownsMarkerCrossing(
  cell: TerrainCell,
  elapsed: number,
  lookup: (TerrainCell | undefined)[][],
): boolean {
  return sourceCellAtCrossing(cell, elapsed, lookup)?.id === cell.id;
}

export function isFeaturedAtCrossing(
  cell: TerrainCell,
  elapsed: number,
  lookup: (TerrainCell | undefined)[][],
): boolean {
  return sourceCellAtCrossing(cell, elapsed, lookup)?.featured ?? false;
}

/**
 * Featured opportunity driving the scrolled DNA field at this crossing.
 * Snapped cell when featured; otherwise the highest-weight featured grid corner
 * (same bilinear weights as `featuredBlendAtGrid`).
 */
export function dominantFeaturedAtCrossing(
  cell: TerrainCell,
  elapsed: number,
  lookup: (TerrainCell | undefined)[][],
  cols: number,
  rows: number,
): TerrainCell | undefined {
  const snapped = sourceCellAtCrossing(cell, elapsed, lookup);
  if (snapped?.featured) return snapped;
  if (cols < 1 || rows < 1) return undefined;

  const { u, v } = scrolledGridUV(cell, elapsed);
  const uW = ((u % cols) + cols) % cols;
  const vW = ((v % rows) + rows) % rows;
  const c0 = Math.floor(uW);
  const r0 = Math.floor(vW);
  const c1 = (c0 + 1) % cols;
  const r1 = (r0 + 1) % rows;
  const tu = uW - c0;
  const tv = vW - r0;

  const corners = [
    { w: (1 - tu) * (1 - tv), col: c0, row: r0 },
    { w: tu * (1 - tv), col: c1, row: r0 },
    { w: tu * tv, col: c1, row: r1 },
    { w: (1 - tu) * tv, col: c0, row: r1 },
  ] as const;

  let best: TerrainCell | undefined;
  let bestW = 0;
  for (const { w, col, row } of corners) {
    if (w <= bestW) continue;
    const opp = lookup[wrapIndex(col, cols)]?.[wrapIndex(row, rows)];
    if (opp?.featured) {
      bestW = w;
      best = opp;
    }
  }
  return best;
}
