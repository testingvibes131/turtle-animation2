import type { OpportunityRow } from "@/app/lib/opportunitiesCsv";
import { aprToHeight, type AprRange } from "@/app/v2/lib/apr";

export type TerrainCellKind = "data" | "empty";

export type TerrainCell = {
  id: string;
  name: string;
  curator: string;
  col: number;
  row: number;
  x: number;
  z: number;
  apr: number;
  height: number;
  featured: boolean;
  kind: TerrainCellKind;
  /** Parent macro crossing when subdivided (same as col/row when subdiv = 1). */
  macroCol: number;
  macroRow: number;
};

export type GridLayout = {
  cols: number;
  rows: number;
  cellPitch: number;
  cells: TerrainCell[];
  /** Half-width of the grid in world XZ (for camera framing). */
  extent: number;
  /** Micro-cells per macro edge (1 = legacy one sphere per opportunity). */
  subdiv: number;
  macroCols: number;
  macroRows: number;
};

export type GridLayoutOptions = {
  cellPitch?: number;
  maxHeight?: number;
  /** Viewport width / height — wider viewports get more columns. */
  aspect?: number;
  /** Finer display lattice: K×K micro-cells per opportunity (1 = off). */
  subdiv?: number;
};

const DEFAULT_CELL_PITCH = 1.2;
/** Peak APR relief (world Y). */
const DEFAULT_MAX_HEIGHT = 34;
const DEFAULT_SUBDIV = 6;
const MAX_SUBDIV = 12;

export function isDataCell(cell: TerrainCell): boolean {
  return cell.kind === "data";
}

export function getDataCells(layout: GridLayout): TerrainCell[] {
  return layout.cells.filter(isDataCell);
}

/** Decorative sub-grid spheres (not stored on layout.cells). */
export function buildEmptyDisplayCells(layout: GridLayout): TerrainCell[] {
  const K = layout.subdiv;
  if (K <= 1 || layout.cells.length === 0) return [];

  const anchor = Math.floor(K / 2);
  const { cols, cellPitch } = layout;
  const empty: TerrainCell[] = [];

  for (const macro of layout.cells) {
    if (!isDataCell(macro)) continue;
    const mc = macro.macroCol;
    const mr = macro.macroRow;

    for (let dc = 0; dc < K; dc++) {
      for (let dr = 0; dr < K; dr++) {
        if (dc === anchor && dr === anchor) continue;
        const col = mc * K + dc;
        const row = mr * K + dr;
        empty.push({
          id: `empty-${macro.id}-${dc}-${dr}`,
          name: "",
          curator: "",
          col,
          row,
          x: (col - (cols - 1) * 0.5) * cellPitch,
          z: (row - (layout.rows - 1) * 0.5) * cellPitch,
          apr: macro.apr,
          height: macro.height,
          featured: false,
          kind: "empty",
          macroCol: mc,
          macroRow: mr,
        });
      }
    }
  }

  return empty;
}

export function computeGridDimensions(
  count: number,
  aspect = 16 / 9,
): { cols: number; rows: number } {
  if (count <= 0) return { cols: 0, rows: 0 };
  const a = Math.min(2.5, Math.max(0.5, aspect));
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * a)));
  const rows = Math.max(1, Math.ceil(count / cols));
  return { cols, rows };
}

function layoutExtent(
  cols: number,
  rows: number,
  cellPitch: number,
  maxHeight: number,
): number {
  const halfW = cols * cellPitch * 0.5;
  const halfD = rows * cellPitch * 0.5;
  return Math.max(halfW, halfD, 4) + maxHeight * 0.15;
}

function subdivideMacroLayout(
  macroCols: number,
  macroRows: number,
  cellPitch: number,
  macroCells: TerrainCell[],
  maxHeight: number,
  subdiv: number,
): GridLayout {
  const K = subdiv;
  const cols = macroCols * K;
  const rows = macroRows * K;
  const microPitch = cellPitch / K;
  const anchor = Math.floor(K / 2);
  const cells: TerrainCell[] = [];

  for (const macro of macroCells) {
    const { col: mc, row: mr } = macro;
    const col = mc * K + anchor;
    const row = mr * K + anchor;
    const x = (col - (cols - 1) * 0.5) * microPitch;
    const z = (row - (rows - 1) * 0.5) * microPitch;

    cells.push({
      id: macro.id,
      name: macro.name,
      curator: macro.curator,
      col,
      row,
      x,
      z,
      apr: macro.apr,
      height: macro.height,
      featured: macro.featured,
      kind: "data",
      macroCol: mc,
      macroRow: mr,
    });
  }

  return {
    cols,
    rows,
    cellPitch: microPitch,
    cells,
    extent: layoutExtent(cols, rows, microPitch, maxHeight),
    subdiv: K,
    macroCols,
    macroRows,
  };
}

export function layoutOpportunitiesOnGrid(
  opportunities: OpportunityRow[],
  aprRange: AprRange,
  options: GridLayoutOptions = {},
): GridLayout {
  const n = opportunities.length;
  const { cols: macroCols, rows: macroRows } = computeGridDimensions(
    n,
    options.aspect,
  );
  const cellPitch = options.cellPitch ?? DEFAULT_CELL_PITCH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;
  const subdiv = Math.max(
    1,
    Math.min(MAX_SUBDIV, Math.floor(options.subdiv ?? DEFAULT_SUBDIV)),
  );

  if (n === 0) {
    return {
      cols: 0,
      rows: 0,
      cellPitch,
      cells: [],
      extent: 8,
      subdiv: 1,
      macroCols: 0,
      macroRows: 0,
    };
  }

  const macroCells: TerrainCell[] = [];

  for (let i = 0; i < n; i++) {
    const opp = opportunities[i]!;
    const col = i % macroCols;
    const row = Math.floor(i / macroCols);
    const x = (col - (macroCols - 1) * 0.5) * cellPitch;
    const z = (row - (macroRows - 1) * 0.5) * cellPitch;
    const apr = Number.isFinite(opp.estAprPercent) ? opp.estAprPercent : aprRange.min;
    const height = aprToHeight(apr, aprRange, maxHeight);

    macroCells.push({
      id: opp.id,
      name: opp.name,
      curator: opp.curator.trim() || "Uncurated",
      col,
      row,
      x,
      z,
      apr,
      height,
      featured: opp.featured,
      kind: "data",
      macroCol: col,
      macroRow: row,
    });
  }

  if (subdiv <= 1) {
    return {
      cols: macroCols,
      rows: macroRows,
      cellPitch,
      cells: macroCells,
      extent: layoutExtent(macroCols, macroRows, cellPitch, maxHeight),
      subdiv: 1,
      macroCols,
      macroRows,
    };
  }

  return subdivideMacroLayout(
    macroCols,
    macroRows,
    cellPitch,
    macroCells,
    maxHeight,
    subdiv,
  );
}
