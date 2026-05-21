import type { OpportunityRow } from "@/app/lib/opportunitiesCsv";
import { aprToHeight, type AprRange } from "@/app/v2/lib/apr";
import { applyBeltOppositeToCells } from "@/app/v2/lib/beltLayout";

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
  /** Unique respawn cell for diagonal belt wrap (one per opportunity). */
  beltOppositeCol?: number;
  beltOppositeRow?: number;
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
  /** Macro grid width / height (1 = square). Clamped to [0.5, 2.5]. */
  layoutAspect?: number;
  /** @deprecated Use layoutAspect. Kept for callers passing viewport aspect. */
  aspect?: number;
  /** Finer display lattice: K×K micro-cells per opportunity (1 = off). */
  subdiv?: number;
  /**
   * How far featured macro slots extend from center (0 = tight cluster).
   * Higher values push featured into farther center-sorted rings.
   */
  featuredSpread?: number;
};

const DEFAULT_CELL_PITCH = 1;
/** Peak APR relief (world Y). */
const DEFAULT_MAX_HEIGHT = 8;
const DEFAULT_SUBDIV = 3;
const MAX_SUBDIV = 12;

function macroCenterDistanceSq(
  col: number,
  row: number,
  macroCols: number,
  macroRows: number,
): number {
  const cx = (macroCols - 1) * 0.5;
  const cz = (macroRows - 1) * 0.5;
  const dx = col - cx;
  const dz = row - cz;
  return dx * dx + dz * dz;
}

/** Macro slots sorted from layout center outward (for featured-first placement). */
export function macroSlotsNearCenter(
  macroCols: number,
  macroRows: number,
): { col: number; row: number }[] {
  const slots: { col: number; row: number }[] = [];
  for (let row = 0; row < macroRows; row++) {
    for (let col = 0; col < macroCols; col++) {
      slots.push({ col, row });
    }
  }
  slots.sort((a, b) => {
    const da = macroCenterDistanceSq(a.col, a.row, macroCols, macroRows);
    const db = macroCenterDistanceSq(b.col, b.row, macroCols, macroRows);
    if (da !== db) return da - db;
    return a.row - b.row || a.col - b.col;
  });
  return slots;
}

function partitionOpportunities(opportunities: OpportunityRow[]): {
  featured: OpportunityRow[];
  rest: OpportunityRow[];
} {
  const featured: OpportunityRow[] = [];
  const rest: OpportunityRow[] = [];
  for (const opp of opportunities) {
    (opp.featured ? featured : rest).push(opp);
  }
  return { featured, rest };
}

/**
 * Indices into center-sorted macro slots for featured opportunities.
 * `spread` 0 = innermost cluster; higher = wider placement from center.
 */
export function featuredSlotIndices(
  featuredCount: number,
  slotCount: number,
  spread: number,
): number[] {
  if (featuredCount <= 0) return [];
  if (featuredCount === 1) return [0];

  const spreadClamped = Math.max(0, spread);
  const compactMax = featuredCount - 1;
  const extra = Math.max(0, slotCount - featuredCount);
  const maxRank = Math.min(
    slotCount - 1,
    compactMax + Math.floor(extra * spreadClamped * 0.55),
  );

  const exponent = 1 / (1 + spreadClamped * 2.5);
  const ranks: number[] = [];
  for (let i = 0; i < featuredCount; i++) {
    const t = i / (featuredCount - 1);
    ranks.push(Math.round(Math.pow(t, exponent) * maxRank));
  }

  for (let i = 1; i < ranks.length; i++) {
    ranks[i] = Math.max(ranks[i]!, ranks[i - 1]! + 1);
  }
  let last = ranks[ranks.length - 1]!;
  if (last > maxRank) {
    const overflow = last - maxRank;
    for (let i = ranks.length - 1; i >= 0; i--) {
      ranks[i] = Math.max(i, ranks[i]! - overflow);
    }
    for (let i = 1; i < ranks.length; i++) {
      ranks[i] = Math.max(ranks[i]!, ranks[i - 1]! + 1);
    }
  }

  return ranks;
}

function assignOpportunitiesToCenterSlots(
  opportunities: OpportunityRow[],
  slots: { col: number; row: number }[],
  featuredSpread: number,
): { opp: OpportunityRow; col: number; row: number }[] {
  const { featured, rest } = partitionOpportunities(opportunities);
  const featRanks = featuredSlotIndices(featured.length, slots.length, featuredSpread);
  const usedRanks = new Set(featRanks);
  const pairs: { opp: OpportunityRow; col: number; row: number }[] = [];

  for (let i = 0; i < featured.length; i++) {
    const rank = featRanks[i]!;
    const { col, row } = slots[rank]!;
    pairs.push({ opp: featured[i]!, col, row });
  }

  let restIdx = 0;
  for (let rank = 0; rank < slots.length && restIdx < rest.length; rank++) {
    if (usedRanks.has(rank)) continue;
    const { col, row } = slots[rank]!;
    pairs.push({ opp: rest[restIdx]!, col, row });
    restIdx++;
  }

  return pairs;
}

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

  applyBeltOppositeToCells(cells, cols, rows);

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
  const layoutAspect = options.layoutAspect ?? options.aspect ?? 16 / 9;
  const { cols: macroCols, rows: macroRows } = computeGridDimensions(
    n,
    layoutAspect,
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
  const slots = macroSlotsNearCenter(macroCols, macroRows);
  const featuredSpread = Math.max(0, options.featuredSpread ?? 0);
  const placements = assignOpportunitiesToCenterSlots(
    opportunities,
    slots,
    featuredSpread,
  );

  for (const { opp, col, row } of placements) {
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
    applyBeltOppositeToCells(macroCells, macroCols, macroRows);
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
