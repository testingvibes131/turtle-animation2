import {
  isDustTvl,
  type OpportunityRow,
} from "@/app/lib/opportunitiesCsv";
import type { PackedMarker } from "@/app/lib/opportunityCirclePack";

/** Matches instanced mesh scale in scene (same as circle pack). */
const RADIUS_SCALE = 0.34;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Deterministic [0, 1) from string + salt. */
function rnd(key: string, salt: number): number {
  const x = Math.sin((hashString(`${key}:${salt}`) >>> 0) * 0.0001) * 10000;
  return x - Math.floor(x);
}

/** Spatial APR smoothing: 3×3 binomial blur passes on the slot grid (so terrain/Y interpolate softly). */
const APR_GRID_SMOOTH_PASSES = 3;

const BLUR_KERNEL_3: readonly (readonly number[])[] = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
] as const;

function finiteEstApr(
  est: number,
  aprMin: number,
  aprMax: number,
  fallback: number,
): number {
  if (Number.isFinite(est)) return est;
  return fallback;
}

function blurAprGridOnce(
  inp: number[][],
  cols: number,
  gridRows: number,
): number[][] {
  const out: number[][] = Array.from({ length: cols }, () =>
    Array.from({ length: gridRows }, () => 0),
  );
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < gridRows; r++) {
      let acc = 0;
      let wsum = 0;
      for (let kc = -1; kc <= 1; kc++) {
        for (let kr = -1; kr <= 1; kr++) {
          const cc = c + kc;
          const rr = r + kr;
          if (cc >= 0 && cc < cols && rr >= 0 && rr < gridRows) {
            const w = BLUR_KERNEL_3[kc + 1]![kr + 1]!;
            acc += inp[cc]![rr]! * w;
            wsum += w;
          }
        }
      }
      out[c]![r] = wsum > 0 ? acc / wsum : inp[c]![r]!;
    }
  }
  return out;
}

/**
 * Fills a cols×gridRows APR field, blurs it (spatial low-pass), clamps to global APR range.
 * Empty trailing slots start at the dataset mean APR so edges stay stable.
 */
function smoothAprOnSlotGrid(
  staged: { row: OpportunityRow; col: number; rowIdx: number }[],
  cols: number,
  gridRows: number,
  aprMin: number,
  aprMax: number,
  allRows: OpportunityRow[],
): number[][] {
  let sum = 0;
  let cnt = 0;
  for (const row of allRows) {
    if (Number.isFinite(row.estAprPercent)) {
      sum += row.estAprPercent;
      cnt++;
    }
  }
  const meanApr = cnt > 0 ? sum / cnt : (aprMin + aprMax) * 0.5;

  let grid: number[][] = Array.from({ length: cols }, () =>
    Array.from({ length: gridRows }, () => meanApr),
  );
  for (const s of staged) {
    grid[s.col]![s.rowIdx] = finiteEstApr(
      s.row.estAprPercent,
      aprMin,
      aprMax,
      meanApr,
    );
  }

  for (let p = 0; p < APR_GRID_SMOOTH_PASSES; p++) {
    grid = blurAprGridOnce(grid, cols, gridRows);
  }

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < gridRows; r++) {
      const v = grid[c]![r]!;
      grid[c]![r] = Math.min(aprMax, Math.max(aprMin, v));
    }
  }
  return grid;
}

export type GridTopographyMarker = PackedMarker & {
  /** Sphere center Y (APR elevation above the ground plane). */
  y: number;
  /** Curator grouping for hover links (trimmed CSV `curator`). */
  curator: string;
  /** Grid column / row in the slot layout (for terrain + sticks). */
  col: number;
  row: number;
};

export type OpportunitiesGridTopographyLayout = {
  markers: GridTopographyMarker[];
  /** For camera / orbit framing (XZ radius of content + margin). */
  extent: number;
  planeHalfWidth: number;
  planeHalfDepth: number;
  /** Uniform XZ cell spacing (matches opportunity placement). */
  cellPitch: number;
  cols: number;
  gridRows: number;
};

/**
 * Rectangular grid on XZ: column count follows viewport aspect (`cols ≈ √(n·aspect)`),
 * uniform square cells, deterministic shuffle. Markers sit on exact slot centers (no XZ
 * jitter) so they align with the terrain wire grid. Marker **size** uses a narrow TVL band.
 * `y` uses **spatially smoothed** APR on the slot grid (3×3 blur, then curve + cap); each
 * marker still exposes raw `estAprPercent` from the row for labels.
 */
export function layoutOpportunitiesGridTopography(
  rows: OpportunityRow[],
  canvasAspect: number,
): OpportunitiesGridTopographyLayout {
  const n = rows.length;
  if (n === 0) {
    return {
      markers: [],
      extent: 16,
      planeHalfWidth: 8,
      planeHalfDepth: 8,
      cellPitch: 1,
      cols: 0,
      gridRows: 0,
    };
  }

  const aspect = Math.min(3.2, Math.max(0.45, canvasAspect));
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * aspect)));
  const gridRows = Math.max(1, Math.ceil(n / cols));

  const mains = rows.filter((r) => !isDustTvl(r.tvlUsd));
  let logMin = Infinity;
  let logMax = -Infinity;
  for (const r of mains) {
    const L = Math.log10(r.tvlUsd + 1);
    logMin = Math.min(logMin, L);
    logMax = Math.max(logMax, L);
  }
  const logSpan = logMax > logMin ? logMax - logMin : 1;

  /** Tight size range so TVL barely changes cube scale (circle pack uses a much wider span). */
  function markerSize(r: OpportunityRow): { size: number; dust: boolean } {
    const dust = isDustTvl(r.tvlUsd);
    if (dust) {
      return {
        size: 0.92 + rnd(r.id, 3) * 0.1,
        dust: true,
      };
    }
    const L = Math.log10(r.tvlUsd + 1);
    const t = (L - logMin) / logSpan;
    const core = 1.02 + Math.min(1, Math.max(0, t)) * 0.18;
    return { size: core * 1.04, dust: false };
  }

  let aprMin = Infinity;
  let aprMax = -Infinity;
  for (const r of rows) {
    if (Number.isFinite(r.estAprPercent)) {
      aprMin = Math.min(aprMin, r.estAprPercent);
      aprMax = Math.max(aprMax, r.estAprPercent);
    }
  }
  if (!Number.isFinite(aprMin)) aprMin = 0;
  if (!Number.isFinite(aprMax)) aprMax = 1;
  const aprSpan = aprMax > aprMin ? aprMax - aprMin : 1;
  /** Sphere center Y: normalized APR through a power curve, capped (tuned for strong relief). */
  const yBase = 0.92;
  const ySpan = 84;
  const yCap = 100;
  const aprShapeExp = 0.68;

  const indices = rows.map((_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd(`grid-shuffle:${i}`, 41) * (i + 1));
    const t = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = t;
  }

  let rMax = 0.2;
  const staged: {
    row: OpportunityRow;
    col: number;
    rowIdx: number;
    size: number;
    dust: boolean;
  }[] = [];

  for (let slot = 0; slot < n; slot++) {
    const row = rows[indices[slot]!]!;
    const { size, dust } = markerSize(row);
    rMax = Math.max(rMax, size * RADIUS_SCALE);
    const rowIdx = Math.floor(slot / cols);
    const col = slot % cols;
    staged.push({ row, col, rowIdx, size, dust });
  }

  const minPitch = rMax * 2.4 * 1.15;
  const pitchFromN = 168 / Math.max(cols, gridRows);
  const cellPitch = Math.max(minPitch, pitchFromN);

  const smoothedAprGrid = smoothAprOnSlotGrid(
    staged,
    cols,
    gridRows,
    aprMin,
    aprMax,
    rows,
  );

  const markers: GridTopographyMarker[] = [];

  for (const s of staged) {
    const x = (s.col - (cols - 1) * 0.5) * cellPitch;
    const z = (s.rowIdx - (gridRows - 1) * 0.5) * cellPitch;
    const aprForY = smoothedAprGrid[s.col]![s.rowIdx]!;
    const tApr = (aprForY - aprMin) / aprSpan;
    const uApr = Math.min(1, Math.max(0, tApr));
    const curved = Math.pow(uApr, aprShapeExp);
    const y = Math.min(yCap, yBase + curved * ySpan);

    markers.push({
      id: s.row.id,
      name: s.row.name,
      x,
      z,
      y,
      size: s.size,
      dust: s.dust,
      featured: s.row.featured,
      estAprPercent: s.row.estAprPercent,
      curator: s.row.curator.trim() || "Uncurated",
      col: s.col,
      row: s.rowIdx,
    });
  }

  let extent = 18;
  for (const m of markers) {
    const r = m.size * RADIUS_SCALE;
    extent = Math.max(extent, Math.hypot(m.x, m.z) + r * 1.1);
  }

  const margin = cellPitch * 0.55;
  const planeHalfWidth = (cols * cellPitch) * 0.5 + margin;
  const planeHalfDepth = (gridRows * cellPitch) * 0.5 + margin;

  return {
    markers,
    extent,
    planeHalfWidth,
    planeHalfDepth,
    cellPitch,
    cols,
    gridRows,
  };
}
