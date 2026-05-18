import * as THREE from "three";
import {
  buildHeightField,
  maxHeightInField,
  sampleHeightAt,
  smoothHeightField,
} from "@/app/v2/lib/heightField";
import type { GridLayout } from "@/app/v2/lib/gridLayout";

export type TerrainGeometryOptions = {
  smoothPasses?: number;
  /** Samples along each grid edge (smoother draped lines). */
  edgeSubdivisions?: number;
};

export const DEFAULT_SMOOTH_PASSES = 2;
const DEFAULT_EDGE_SUBDIV = 6;

export type PreparedTerrain = {
  field: number[][];
  cols: number;
  rows: number;
  cellPitch: number;
  maxH: number;
};

export function prepareTerrain(
  layout: GridLayout,
  options: TerrainGeometryOptions = {},
): PreparedTerrain | null {
  const { cols, rows, cellPitch } = layout;
  if (cols < 1 || rows < 1 || layout.cells.length === 0) return null;

  const smoothPasses = options.smoothPasses ?? DEFAULT_SMOOTH_PASSES;
  const raw = buildHeightField(layout);
  const field = smoothHeightField(raw, cols, rows, smoothPasses);

  return {
    field,
    cols,
    rows,
    cellPitch,
    maxH: maxHeightInField(field),
  };
}

function gridToWorld(
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

function heightAt(
  field: number[][],
  cols: number,
  rows: number,
  u: number,
  v: number,
): number {
  return sampleHeightAt(field, cols, rows, u, v);
}

function appendDrapedSegment(
  positions: number[],
  field: number[][],
  cols: number,
  rows: number,
  cellPitch: number,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  steps: number,
): void {
  for (let s = 0; s < steps; s++) {
    const t0 = s / steps;
    const t1 = (s + 1) / steps;
    const ua0 = u0 + (u1 - u0) * t0;
    const va0 = v0 + (v1 - v0) * t0;
    const ua1 = u0 + (u1 - u0) * t1;
    const va1 = v0 + (v1 - v0) * t1;

    const p0 = gridToWorld(ua0, va0, cols, rows, cellPitch);
    const p1 = gridToWorld(ua1, va1, cols, rows, cellPitch);
    const y0 = heightAt(field, cols, rows, ua0, va0);
    const y1 = heightAt(field, cols, rows, ua1, va1);

    positions.push(p0.x, y0, p0.z, p1.x, y1, p1.z);
  }
}

/**
 * Vaporwave-style draped grid: lines follow APR height along cell lattice.
 */
export function buildTerrainWireframeGeometry(
  prepared: PreparedTerrain,
  options: TerrainGeometryOptions = {},
): THREE.BufferGeometry {
  const { field, cols, rows, cellPitch } = prepared;
  const steps = options.edgeSubdivisions ?? DEFAULT_EDGE_SUBDIV;
  const positions: number[] = [];

  // Lines along columns (v increases)
  for (let c = 0; c < cols; c++) {
    appendDrapedSegment(
      positions,
      field,
      cols,
      rows,
      cellPitch,
      c,
      0,
      c,
      rows - 1,
      steps * Math.max(1, rows - 1),
    );
  }

  // Lines along rows (u increases)
  for (let r = 0; r < rows; r++) {
    appendDrapedSegment(
      positions,
      field,
      cols,
      rows,
      cellPitch,
      0,
      r,
      cols - 1,
      r,
      steps * Math.max(1, cols - 1),
    );
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(positions), 3),
  );
  return geom;
}

/** Flat reference grid under the terrain (vaporwave horizon). */
export function buildHorizonGridGeometry(
  layout: GridLayout,
  y = 0,
): THREE.BufferGeometry | null {
  const { cols, rows, cellPitch } = layout;
  if (cols < 1 || rows < 1) return null;

  const margin = 1.35;
  const halfW = (cols * cellPitch * margin) * 0.5;
  const halfD = (rows * cellPitch * margin) * 0.5;
  const lineCols = cols + 8;
  const lineRows = rows + 8;
  const positions: number[] = [];

  for (let i = 0; i <= lineCols; i++) {
    const t = i / lineCols;
    const x = -halfW + t * halfW * 2;
    positions.push(x, y, -halfD, x, y, halfD);
  }
  for (let j = 0; j <= lineRows; j++) {
    const t = j / lineRows;
    const z = -halfD + t * halfD * 2;
    positions.push(-halfW, y, z, halfW, y, z);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(positions), 3),
  );
  return geom;
}

export function getTerrainMaxHeight(
  layout: GridLayout,
  smoothPasses = DEFAULT_SMOOTH_PASSES,
): number {
  const prepared = prepareTerrain(layout, { smoothPasses });
  return prepared?.maxH ?? 0;
}
