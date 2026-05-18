import { getConveyorOffset } from "@/app/v2/lib/conveyor";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
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

export function isFeaturedAtCrossing(
  cell: TerrainCell,
  elapsed: number,
  lookup: (TerrainCell | undefined)[][],
): boolean {
  return sourceCellAtCrossing(cell, elapsed, lookup)?.featured ?? false;
}
