import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import { wrapDiagonalToroidalUV } from "@/app/v2/lib/toroidal";

/** Grid-index scroll speed (field units per second). */
export const CONVEYOR_GRID_SPEED = 0.336;

/** Diagonal drift in grid space (+col, +row). */
export const CONVEYOR_DIR_U = 0.7071067811865476;
export const CONVEYOR_DIR_V = 0.7071067811865476;

export function getConveyorOffset(elapsed: number): {
  offsetU: number;
  offsetV: number;
} {
  const travel = elapsed * CONVEYOR_GRID_SPEED;
  return {
    offsetU: travel * CONVEYOR_DIR_U,
    offsetV: travel * CONVEYOR_DIR_V,
  };
}

export function gridUVToWorld(
  u: number,
  v: number,
  cols: number,
  rows: number,
  cellPitch: number,
): { x: number; z: number } {
  const x = (u - (cols - 1) * 0.5) * cellPitch;
  const z = (v - (rows - 1) * 0.5) * cellPitch;
  return { x, z };
}

/** Parcel drifts on the torus with the scrolling height field. */
export function getAnimatedGridUV(
  cell: TerrainCell,
  elapsed: number,
  cols: number,
  rows: number,
): { u: number; v: number } {
  const { offsetU, offsetV } = getConveyorOffset(elapsed);
  return wrapDiagonalToroidalUV(
    cell.col + offsetU,
    cell.row + offsetV,
    cols,
    rows,
    cell.col,
    cell.row,
  );
}

export function getAnimatedWorldXZ(
  cell: TerrainCell,
  elapsed: number,
  cols: number,
  rows: number,
  cellPitch: number,
): { u: number; v: number; x: number; z: number } {
  const { u, v } = getAnimatedGridUV(cell, elapsed, cols, rows);
  const { x, z } = gridUVToWorld(u, v, cols, rows, cellPitch);
  return { u, v, x, z };
}
