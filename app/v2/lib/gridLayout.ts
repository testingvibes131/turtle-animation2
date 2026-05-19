import type { OpportunityRow } from "@/app/lib/opportunitiesCsv";
import { aprToHeight, type AprRange } from "@/app/v2/lib/apr";

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
};

export type GridLayout = {
  cols: number;
  rows: number;
  cellPitch: number;
  cells: TerrainCell[];
  /** Half-width of the grid in world XZ (for camera framing). */
  extent: number;
};

export type GridLayoutOptions = {
  cellPitch?: number;
  maxHeight?: number;
  /** Viewport width / height — wider viewports get more columns. */
  aspect?: number;
};

const DEFAULT_CELL_PITCH = 1.2;
const DEFAULT_MAX_HEIGHT = 18;

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

export function layoutOpportunitiesOnGrid(
  opportunities: OpportunityRow[],
  aprRange: AprRange,
  options: GridLayoutOptions = {},
): GridLayout {
  const n = opportunities.length;
  const { cols, rows } = computeGridDimensions(n, options.aspect);
  const cellPitch = options.cellPitch ?? DEFAULT_CELL_PITCH;
  const maxHeight = options.maxHeight ?? DEFAULT_MAX_HEIGHT;

  if (n === 0) {
    return { cols: 0, rows: 0, cellPitch, cells: [], extent: 8 };
  }

  const cells: TerrainCell[] = [];

  for (let i = 0; i < n; i++) {
    const opp = opportunities[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) * 0.5) * cellPitch;
    const z = (row - (rows - 1) * 0.5) * cellPitch;
    const apr = Number.isFinite(opp.estAprPercent) ? opp.estAprPercent : aprRange.min;
    const height = aprToHeight(apr, aprRange, maxHeight);

    cells.push({
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
    });
  }

  const halfW = (cols * cellPitch) * 0.5;
  const halfD = (rows * cellPitch) * 0.5;
  const extent = Math.max(halfW, halfD, 4) + maxHeight * 0.15;

  return { cols, rows, cellPitch, cells, extent };
}
