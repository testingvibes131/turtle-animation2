import { getAnimatedGridUV } from "@/app/v2/lib/conveyor";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import type { PreparedTerrain } from "@/app/v2/lib/terrainGeometry";
import { sampleFieldToroidal } from "@/app/v2/lib/toroidal";
import * as THREE from "three";

const DEG = Math.PI / 180;
const _normal = new THREE.Vector3();
const _light = new THREE.Vector3();

export type SphereTerrainShadeParams = {
  enabled: boolean;
  /** Horizontal light angle (degrees). 0 = +X, 90 = +Z. */
  azimuthDeg: number;
  /** Height above horizon (degrees). */
  elevationDeg: number;
  /** Minimum brightness on lee slopes (0–1). */
  ambient: number;
  /** >1 = stronger highlight/shadow separation. */
  contrast: number;
};

const GRAD_STEP = 1;

function heightAt(
  field: number[][],
  cols: number,
  rows: number,
  u: number,
  v: number,
): number {
  return sampleFieldToroidal(field, cols, rows, u, v);
}

/** 0–1 diffuse factor from terrain slope under grid (u, v). */
export function terrainShadeFactor(
  prepared: PreparedTerrain,
  u: number,
  v: number,
  shade: SphereTerrainShadeParams,
): number {
  if (!shade.enabled) return 1;

  const { field, cols, rows, cellPitch } = prepared;
  const pitch = Math.max(cellPitch, 1e-6);

  const hL = heightAt(field, cols, rows, u - GRAD_STEP, v);
  const hR = heightAt(field, cols, rows, u + GRAD_STEP, v);
  const hD = heightAt(field, cols, rows, u, v - GRAD_STEP);
  const hU = heightAt(field, cols, rows, u, v + GRAD_STEP);

  const dhdx = (hR - hL) / (2 * GRAD_STEP * pitch);
  const dhdz = (hU - hD) / (2 * GRAD_STEP * pitch);

  _normal.set(-dhdx, 1, -dhdz).normalize();

  const az = shade.azimuthDeg * DEG;
  const el = shade.elevationDeg * DEG;
  const ce = Math.cos(el);
  _light.set(ce * Math.cos(az), Math.sin(el), ce * Math.sin(az)).normalize();

  const ndotl = Math.max(0, _normal.dot(_light));
  const t = Math.pow(ndotl, Math.max(0.25, shade.contrast));
  return shade.ambient + (1 - shade.ambient) * t;
}

export function sphereGridUV(
  cell: TerrainCell,
  elapsed: number,
  cols: number,
  rows: number,
  moveWithBelt: boolean,
): { u: number; v: number } {
  if (moveWithBelt) {
    return getAnimatedGridUV(cell, elapsed, cols, rows);
  }
  return { u: cell.col, v: cell.row };
}

/** Multiply base instance color by slope shading. */
export function applyTerrainShadeToColor(
  target: THREE.Color,
  baseHex: number,
  factor: number,
): THREE.Color {
  target.setHex(baseHex);
  if (factor >= 0.999) return target;
  target.r *= factor;
  target.g *= factor;
  target.b *= factor;
  return target;
}
