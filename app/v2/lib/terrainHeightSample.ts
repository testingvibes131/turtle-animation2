import type { GridLayout } from "@/app/v2/lib/gridLayout";
import { sampleHeightAt } from "@/app/v2/lib/heightField";
import type { PreparedTerrain } from "@/app/v2/lib/terrainGeometry";
import { sampleFieldToroidal } from "@/app/v2/lib/toroidal";

/** Matches animated field soft cap in `animatedField.ts`. */
const HEIGHT_CAP_MUL = 1.32;

export function layoutTerrainPeak(layout: GridLayout): number {
  let peak = 0;
  for (const cell of layout.cells) {
    if (cell.height > peak) peak = cell.height;
  }
  return peak * HEIGHT_CAP_MUL;
}

export function worldXZToGridUV(
  x: number,
  z: number,
  cols: number,
  rows: number,
  cellPitch: number,
): { u: number; v: number } {
  return {
    u: x / cellPitch + (cols - 1) * 0.5,
    v: z / cellPitch + (rows - 1) * 0.5,
  };
}

/** Height at world XZ on the scrolling terrain (toroidal, belt-safe). */
export function sampleTerrainHeightAtWorld(
  prepared: PreparedTerrain,
  x: number,
  z: number,
): number {
  const { field, cols, rows, cellPitch } = prepared;
  const { u, v } = worldXZToGridUV(x, z, cols, rows, cellPitch);
  return sampleFieldToroidal(field, cols, rows, u, v);
}

/** Rest height (no scroll) for layout-only checks. */
export function sampleRestTerrainHeightAtWorld(
  field: number[][],
  cols: number,
  rows: number,
  cellPitch: number,
  x: number,
  z: number,
): number {
  const { u, v } = worldXZToGridUV(x, z, cols, rows, cellPitch);
  return sampleHeightAt(field, cols, rows, u, v);
}

export type TerrainHeightSampler = (x: number, z: number) => number;
