import { getAnimatedGridUV } from "@/app/v2/lib/conveyor";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";

/** Rounded grid index for belt occupancy (one marker per cell). */
export function beltGridCellKey(u: number, v: number): string {
  return `${Math.round(u)},${Math.round(v)}`;
}

export function claimBeltGridCell(
  occupancy: Set<string>,
  cell: TerrainCell,
  elapsed: number,
  cols: number,
  rows: number,
): boolean {
  const { u, v } = getAnimatedGridUV(cell, elapsed, cols, rows);
  const key = beltGridCellKey(u, v);
  if (occupancy.has(key)) return false;
  occupancy.add(key);
  return true;
}

function homeKey(col: number, row: number): string {
  return `${col},${row}`;
}

/** Quadrant of home relative to layout center (0–3). */
function homeQuadrant(
  col: number,
  row: number,
  midCol: number,
  midRow: number,
): number {
  const east = col >= midCol;
  const south = row >= midRow;
  if (east && south) return 0;
  if (!east && south) return 1;
  if (east && !south) return 2;
  return 3;
}

/** Cells on the far side of the field for homes in `quadrant`. */
function oppositePoolForQuadrant(
  quadrant: number,
  cols: number,
  rows: number,
  midCol: number,
  midRow: number,
): { col: number; row: number }[] {
  const mc = Math.floor(midCol);
  const mr = Math.floor(midRow);
  const pool: { col: number; row: number }[] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const east = c >= midCol;
      const south = r >= midRow;
      let match = false;
      if (quadrant === 0) match = !east && !south;
      else if (quadrant === 1) match = east && !south;
      else if (quadrant === 2) match = !east && south;
      else match = east && south;

      if (match) pool.push({ col: c, row: r });
    }
  }

  pool.sort(
    (a, b) => a.col + a.row - (b.col + b.row) || a.col - b.col || a.row - b.row,
  );

  if (pool.length > 0) return pool;

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (c !== mc || r !== mr) pool.push({ col: c, row: r });
    }
  }
  return pool;
}

function expandOppositePool(
  quadrant: number,
  cols: number,
  rows: number,
  midCol: number,
  midRow: number,
  used: Set<string>,
  need: number,
): { col: number; row: number }[] {
  let pool = oppositePoolForQuadrant(quadrant, cols, rows, midCol, midRow).filter(
    (p) => !used.has(homeKey(p.col, p.row)),
  );

  if (pool.length >= need) return pool.slice(0, need);

  const extra: { col: number; row: number }[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const key = homeKey(c, r);
      if (used.has(key)) continue;
      if (pool.some((p) => p.col === c && p.row === r)) continue;
      extra.push({ col: c, row: r });
    }
  }
  extra.sort(
    (a, b) => a.col + a.row - (b.col + b.row) || a.col - b.col || a.row - b.row,
  );

  pool = [...pool, ...extra];
  return pool.slice(0, need);
}

/**
 * Assign each home a distinct opposite belt cell so parcels never share a grid
 * crossing on the respawn leg.
 */
export function assignBeltOppositeCells(
  homes: { col: number; row: number }[],
  cols: number,
  rows: number,
): Map<string, { col: number; row: number }> {
  const midCol = (cols - 1) * 0.5;
  const midRow = (rows - 1) * 0.5;
  const usedOpposite = new Set<string>();
  const byQuadrant: { col: number; row: number; key: string }[][] = [
    [],
    [],
    [],
    [],
  ];

  for (const { col, row } of homes) {
    const q = homeQuadrant(col, row, midCol, midRow);
    byQuadrant[q]!.push({ col, row, key: homeKey(col, row) });
  }

  const result = new Map<string, { col: number; row: number }>();

  for (let q = 0; q < 4; q++) {
    const list = byQuadrant[q]!.sort(
      (a, b) => a.col - b.col || a.row - b.row,
    );
    if (list.length === 0) continue;

    const pool = expandOppositePool(
      q,
      cols,
      rows,
      midCol,
      midRow,
      usedOpposite,
      list.length,
    );

    list.forEach((home, i) => {
      const pick = pool[i]!;
      result.set(home.key, pick);
      usedOpposite.add(homeKey(pick.col, pick.row));
    });
  }

  return result;
}

/** Write layout-time opposite cells onto terrain data cells. */
export function applyBeltOppositeToCells(
  cells: TerrainCell[],
  cols: number,
  rows: number,
): void {
  const dataHomes = cells
    .filter((c) => c.kind === "data")
    .map((c) => ({ col: c.col, row: c.row }));
  const opposites = assignBeltOppositeCells(dataHomes, cols, rows);

  for (const cell of cells) {
    if (cell.kind !== "data") continue;
    const opp = opposites.get(homeKey(cell.col, cell.row));
    if (!opp) continue;
    cell.beltOppositeCol = opp.col;
    cell.beltOppositeRow = opp.row;
  }
}
