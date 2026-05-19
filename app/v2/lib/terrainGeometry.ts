import * as THREE from "three";
import {
  buildHeightField,
  maxHeightInField,
  sampleHeightAt,
  smoothHeightField,
} from "@/app/v2/lib/heightField";
import type { GridLayout } from "@/app/v2/lib/gridLayout";
import {
  DEFAULT_TERRAIN_VISUALS,
  type TerrainVisualParams,
} from "@/app/v2/lib/terrainVisuals";
import { sampleFieldToroidal } from "@/app/v2/lib/toroidal";

export type TerrainGeometryOptions = {
  smoothPasses?: number;
  /** Samples along each grid edge (smoother draped lines). */
  edgeSubdivisions?: number;
  /** Conveyor-aligned cell diagonals (belt marker motion only). */
  beltDiagonals?: boolean;
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
  toroidal: boolean,
): number {
  return toroidal
    ? sampleFieldToroidal(field, cols, rows, u, v)
    : sampleHeightAt(field, cols, rows, u, v);
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
  toroidal: boolean,
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
    const y0 = heightAt(field, cols, rows, ua0, va0, toroidal);
    const y1 = heightAt(field, cols, rows, ua1, va1, toroidal);

    positions.push(p0.x, y0, p0.z, p1.x, y1, p1.z);
  }
}

/** One draped diagonal per cell, aligned with conveyor (+col, +row). */
function forEachBeltCellDiagonal(
  cols: number,
  rows: number,
  fn: (u0: number, v0: number, u1: number, v1: number) => void,
): void {
  if (cols < 2 || rows < 2) return;
  for (let c = 0; c < cols - 1; c++) {
    for (let r = 0; r < rows - 1; r++) {
      fn(c, r, c + 1, r + 1);
    }
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
  const beltDiagonals = options.beltDiagonals ?? false;
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
      false,
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
      false,
    );
  }

  if (beltDiagonals) {
    forEachBeltCellDiagonal(cols, rows, (u0, v0, u1, v1) => {
      appendDrapedSegment(
        positions,
        field,
        cols,
        rows,
        cellPitch,
        u0,
        v0,
        u1,
        v1,
        steps,
        false,
      );
    });
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(new Float32Array(positions), 3),
  );
  computeTerrainLineDistancesXZ(geom);
  computeTerrainWireframeVertexColors(geom, prepared);
  return geom;
}

/** Fade grid lines toward the layout perimeter (Chebyshev distance in XZ). */
export function computeTerrainWireframeVertexColors(
  geometry: THREE.BufferGeometry,
  prepared: PreparedTerrain,
  fade: Pick<TerrainVisualParams, "gridFadeStart" | "gridFadeEnd"> = DEFAULT_TERRAIN_VISUALS,
): void {
  const pos = geometry.getAttribute("position");
  if (!pos) return;

  const { cols, rows, cellPitch } = prepared;
  const halfX = Math.max(((cols - 1) * cellPitch) * 0.5, 1e-6);
  const halfZ = Math.max(((rows - 1) * cellPitch) * 0.5, 1e-6);
  const { gridFadeStart: fadeStart, gridFadeEnd: fadeEnd } = fade;

  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const t = Math.max(Math.abs(x) / halfX, Math.abs(z) / halfZ);
    let fade = 1;
    if (t > fadeStart) {
      const u = Math.min(1, (t - fadeStart) / (fadeEnd - fadeStart));
      const smooth = u * u * (3 - 2 * u);
      fade = 1 - smooth;
    }
    colors[i * 3] = fade;
    colors[i * 3 + 1] = fade;
    colors[i * 3 + 2] = fade;
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
}

/**
 * Dash phase from XZ edge length only (not 3D arc length).
 * Keeps dashes fixed on the lattice while APR height animates.
 */
export function computeTerrainLineDistancesXZ(
  geometry: THREE.BufferGeometry,
): void {
  const pos = geometry.getAttribute("position");
  if (!pos) return;

  const lineDistances = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i += 2) {
    const dx = pos.getX(i + 1) - pos.getX(i);
    const dz = pos.getZ(i + 1) - pos.getZ(i);
    lineDistances[i] = 0;
    lineDistances[i + 1] = Math.hypot(dx, dz);
  }

  geometry.setAttribute(
    "lineDistance",
    new THREE.Float32BufferAttribute(lineDistances, 1),
  );
}

/** Rewrite line vertex Y in place (fixed XZ lattice). */
export function updateTerrainWireframePositions(
  geometry: THREE.BufferGeometry,
  prepared: PreparedTerrain,
  options: TerrainGeometryOptions = {},
): void {
  const { field, cols, rows, cellPitch } = prepared;
  const steps = options.edgeSubdivisions ?? DEFAULT_EDGE_SUBDIV;
  const beltDiagonals = options.beltDiagonals ?? false;
  const attr = geometry.getAttribute("position") as
    | THREE.BufferAttribute
    | undefined;
  if (!attr) return;

  const positions = attr.array as Float32Array;
  let offset = 0;

  const writeSegment = (
    u0: number,
    v0: number,
    u1: number,
    v1: number,
    segmentSteps: number,
  ) => {
    for (let s = 0; s < segmentSteps; s++) {
      const t0 = s / segmentSteps;
      const t1 = (s + 1) / segmentSteps;
      const ua0 = u0 + (u1 - u0) * t0;
      const va0 = v0 + (v1 - v0) * t0;
      const ua1 = u0 + (u1 - u0) * t1;
      const va1 = v0 + (v1 - v0) * t1;

      const p0 = gridToWorld(ua0, va0, cols, rows, cellPitch);
      const p1 = gridToWorld(ua1, va1, cols, rows, cellPitch);
      const y0 = heightAt(field, cols, rows, ua0, va0, false);
      const y1 = heightAt(field, cols, rows, ua1, va1, false);

      positions[offset++] = p0.x;
      positions[offset++] = y0;
      positions[offset++] = p0.z;
      positions[offset++] = p1.x;
      positions[offset++] = y1;
      positions[offset++] = p1.z;
    }
  };

  for (let c = 0; c < cols; c++) {
    writeSegment(c, 0, c, rows - 1, steps * Math.max(1, rows - 1));
  }
  for (let r = 0; r < rows; r++) {
    writeSegment(0, r, cols - 1, r, steps * Math.max(1, cols - 1));
  }
  if (beltDiagonals) {
    forEachBeltCellDiagonal(cols, rows, (u0, v0, u1, v1) => {
      writeSegment(u0, v0, u1, v1, steps);
    });
  }

  attr.needsUpdate = true;
  geometry.computeBoundingSphere();
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
