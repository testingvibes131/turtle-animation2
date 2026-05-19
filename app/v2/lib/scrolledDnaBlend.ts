import * as THREE from "three";
import { getConveyorOffset } from "@/app/v2/lib/conveyor";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import { COLOR_FEATURED, COLOR_REST } from "@/app/v2/lib/markerVisuals";
import { wrapIndex } from "@/app/v2/lib/toroidal";

const _restColor = new THREE.Color(COLOR_REST);
const _featuredColor = new THREE.Color(COLOR_FEATURED);
const _mixedColor = new THREE.Color();

/** Temporal ease toward spatial target (per second). */
export const DNA_BLEND_LERP_SPEED = 12;

/** Flag stick / top visible above this smoothed blend. */
export const FLAG_BLEND_SHOW_THRESHOLD = 0.1;

export function scrolledGridUV(
  cell: TerrainCell,
  elapsed: number,
): { u: number; v: number } {
  const { offsetU, offsetV } = getConveyorOffset(elapsed);
  return { u: cell.col - offsetU, v: cell.row - offsetV };
}

function wrapGridCoord(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function featuredAt(
  lookup: (TerrainCell | undefined)[][],
  cols: number,
  rows: number,
  col: number,
  row: number,
): number {
  const c = wrapIndex(col, cols);
  const r = wrapIndex(row, rows);
  return lookup[c]?.[r]?.featured ? 1 : 0;
}

/** Bilinear blend of featured (0–1) at fractional grid UV — spatial leg of hybrid. */
export function featuredBlendAtGrid(
  u: number,
  v: number,
  lookup: (TerrainCell | undefined)[][],
  cols: number,
  rows: number,
): number {
  if (cols < 1 || rows < 1) return 0;

  const uW = wrapGridCoord(u, cols);
  const vW = wrapGridCoord(v, rows);
  const c0 = Math.floor(uW);
  const r0 = Math.floor(vW);
  const c1 = (c0 + 1) % cols;
  const r1 = (r0 + 1) % rows;
  const tu = uW - c0;
  const tv = vW - r0;

  return (
    (1 - tu) * (1 - tv) * featuredAt(lookup, cols, rows, c0, r0) +
    tu * (1 - tv) * featuredAt(lookup, cols, rows, c1, r0) +
    tu * tv * featuredAt(lookup, cols, rows, c1, r1) +
    (1 - tu) * tv * featuredAt(lookup, cols, rows, c0, r1)
  );
}

export function spatialFeaturedBlendAtCrossing(
  cell: TerrainCell,
  elapsed: number,
  lookup: (TerrainCell | undefined)[][],
  cols: number,
  rows: number,
): number {
  const { u, v } = scrolledGridUV(cell, elapsed);
  return featuredBlendAtGrid(u, v, lookup, cols, rows);
}

/** Temporal leg: ease displayed blend toward spatial target. */
export function lerpBlendToward(
  displayed: number,
  target: number,
  dt: number,
  speed = DNA_BLEND_LERP_SPEED,
): number {
  if (dt <= 0) return target;
  const t = 1 - Math.exp(-speed * dt);
  return displayed + (target - displayed) * t;
}

export function colorFromFeaturedBlend(
  blend: number,
  restColor = COLOR_REST,
  featuredColor = COLOR_FEATURED,
): number {
  _restColor.setHex(restColor);
  _featuredColor.setHex(featuredColor);
  return _mixedColor.copy(_restColor).lerp(_featuredColor, blend).getHex();
}

export function updateScrolledDnaBlends(
  blends: Float32Array,
  cells: TerrainCell[],
  elapsed: number,
  lookup: (TerrainCell | undefined)[][],
  cols: number,
  rows: number,
  dt: number,
): void {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const target = spatialFeaturedBlendAtCrossing(
      cell,
      elapsed,
      lookup,
      cols,
      rows,
    );
    const prev = blends[i] ?? target;
    blends[i] = lerpBlendToward(prev, target, dt);
  }
}
