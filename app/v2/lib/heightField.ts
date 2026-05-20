import type { GridLayout } from "@/app/v2/lib/gridLayout";
import { sampleFieldToroidal } from "@/app/v2/lib/toroidal";

const BLUR_KERNEL = [
  [1, 2, 1],
  [2, 4, 2],
  [1, 2, 1],
] as const;

/**
 * Ease only the upper tail into `cap` — keeps rolling body, tames isolated spikes.
 */
export function softCapHeightField(
  field: number[][],
  cap: number,
  kneeRatio = 0.78,
): void {
  const knee = cap * kneeRatio;
  const span = Math.max(cap - knee, 1e-6);

  for (const col of field) {
    for (let r = 0; r < col.length; r++) {
      const h = col[r]!;
      if (h <= knee) continue;
      const t = Math.min(1, (h - knee) / span);
      const ease = t * t * (3 - 2 * t);
      col[r] = knee + span * ease;
    }
  }
}

export function buildMacroHeightField(layout: GridLayout): number[][] {
  const { macroCols, macroRows } = layout;
  const field: number[][] = Array.from({ length: macroCols }, () =>
    Array.from({ length: macroRows }, () => 0),
  );

  for (const cell of layout.cells) {
    if (cell.kind !== "data") continue;
    field[cell.macroCol]![cell.macroRow] = cell.height;
  }

  return field;
}

/** Bilinear upsample — avoids K×K flat terraces from nearest-neighbor blocks. */
export function upsampleMacroToMicroInPlace(
  macroField: number[][],
  microField: number[][],
  layout: GridLayout,
): void {
  const { cols, rows, subdiv, macroCols, macroRows } = layout;

  for (let c = 0; c < cols; c++) {
    const u = cols > 1 ? c / subdiv : 0;
    for (let r = 0; r < rows; r++) {
      const v = rows > 1 ? r / subdiv : 0;
      microField[c]![r] = sampleFieldToroidal(
        macroField,
        macroCols,
        macroRows,
        u,
        v,
      );
    }
  }
}

function upsampleMacroToMicro(
  macroField: number[][],
  layout: GridLayout,
): number[][] {
  const { cols, rows } = layout;
  const field: number[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => 0),
  );
  upsampleMacroToMicroInPlace(macroField, field, layout);
  return field;
}

/** Cell-centered heights (world Y), indexed [col][row]. */
export function buildHeightField(layout: GridLayout): number[][] {
  const { cols, rows, subdiv } = layout;
  if (subdiv <= 1) {
    const field: number[][] = Array.from({ length: cols }, () =>
      Array.from({ length: rows }, () => 0),
    );

    for (const cell of layout.cells) {
      field[cell.col]![cell.row] = cell.height;
    }

    return field;
  }

  return upsampleMacroToMicro(buildMacroHeightField(layout), layout);
}

function blurOnce(
  input: number[][],
  cols: number,
  rows: number,
): number[][] {
  const out: number[][] = Array.from({ length: cols }, () =>
    Array.from({ length: rows }, () => 0),
  );

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      let sum = 0;
      let weight = 0;
      for (let kc = -1; kc <= 1; kc++) {
        for (let kr = -1; kr <= 1; kr++) {
          const cc = c + kc;
          const rr = r + kr;
          if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) continue;
          const w = BLUR_KERNEL[kc + 1]![kr + 1]!;
          sum += input[cc]![rr]! * w;
          weight += w;
        }
      }
      out[c]![r] = weight > 0 ? sum / weight : input[c]![r]!;
    }
  }

  return out;
}

/** Spatial smoothing so APR peaks read as ridges, not isolated spikes. */
export function smoothHeightField(
  field: number[][],
  cols: number,
  rows: number,
  passes = 2,
): number[][] {
  let current = field;
  for (let p = 0; p < passes; p++) {
    current = blurOnce(current, cols, rows);
  }
  return current;
}

function bilinearSample(
  field: number[][],
  cols: number,
  rows: number,
  u: number,
  v: number,
): number {
  if (cols <= 0 || rows <= 0) return 0;
  if (cols === 1 && rows === 1) return field[0]![0]!;

  const uClamped = Math.max(0, Math.min(cols - 1, u));
  const vClamped = Math.max(0, Math.min(rows - 1, v));
  const c0 = Math.floor(uClamped);
  const r0 = Math.floor(vClamped);
  const c1 = Math.min(c0 + 1, cols - 1);
  const r1 = Math.min(r0 + 1, rows - 1);
  const tc = uClamped - c0;
  const tr = vClamped - r0;

  const h00 = field[c0]![r0]!;
  const h10 = field[c1]![r0]!;
  const h01 = field[c0]![r1]!;
  const h11 = field[c1]![r1]!;

  const hx0 = h00 + (h10 - h00) * tc;
  const hx1 = h01 + (h11 - h01) * tc;
  return hx0 + (hx1 - hx0) * tr;
}

export function sampleHeightAt(
  field: number[][],
  cols: number,
  rows: number,
  u: number,
  v: number,
): number {
  return bilinearSample(field, cols, rows, u, v);
}

export function maxHeightInField(field: number[][]): number {
  let max = 0;
  for (const col of field) {
    for (const h of col) {
      if (h > max) max = h;
    }
  }
  return max;
}
