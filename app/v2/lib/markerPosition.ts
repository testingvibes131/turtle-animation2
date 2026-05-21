import { getAnimatedGridUV, getAnimatedWorldXZ } from "@/app/v2/lib/conveyor";
import { sampleHeightAt } from "@/app/v2/lib/heightField";
import { sampleFieldToroidal } from "@/app/v2/lib/toroidal";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import type { PreparedTerrain } from "@/app/v2/lib/terrainGeometry";
import { SPHERE_RADIUS_RATIO } from "@/app/v2/lib/markerVisuals";

const SURFACE_PAD = 1.04;
const TOP_SPHERE_TO_BASE = 0.045 / 0.07;
const FLAG_POLE_HEIGHT_RATIO = 0.95;
const STICK_RADIUS_RATIO = 0.014;
const STICK_MIN_HEIGHT = 0.15;
const LABEL_GAP_RATIO = 0.12;

export type MarkerWorldPose = {
  x: number;
  y: number;
  z: number;
};

function terrainYAtCell(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  moveWithBelt: boolean,
): number {
  const { field, cols, rows } = prepared;

  if (moveWithBelt) {
    const { u, v } = getAnimatedGridUV(cell, elapsed, cols, rows);
    return sampleFieldToroidal(field, cols, rows, u, v);
  }

  return sampleHeightAt(field, cols, rows, cell.col, cell.row);
}

/** Fixed crossing; height + lift follow smoothed featured blend (0–1). */
export function getScrolledDnaSpherePose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  featuredBlend: number,
  sphereRadiusRatio = SPHERE_RADIUS_RATIO,
): MarkerWorldPose & { featuredBlend: number } {
  const { field, cols, rows, cellPitch } = prepared;
  const terrainY = sampleHeightAt(field, cols, rows, cell.col, cell.row);
  const radius = cellPitch * sphereRadiusRatio;
  const yRest = terrainY + radius * SURFACE_PAD;
  const y = yRest + (terrainY - yRest) * featuredBlend;
  return { x: cell.x, y, z: cell.z, featuredBlend };
}

export function getSphereMarkerPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  centerOnTerrain: boolean,
  moveWithBelt: boolean,
  sphereRadiusRatio = SPHERE_RADIUS_RATIO,
): MarkerWorldPose {
  const { cols, rows, cellPitch } = prepared;
  let x = cell.x;
  let z = cell.z;
  if (moveWithBelt) {
    const pos = getAnimatedWorldXZ(cell, elapsed, cols, rows, cellPitch);
    x = pos.x;
    z = pos.z;
  }
  const terrainY = terrainYAtCell(cell, prepared, elapsed, moveWithBelt);
  const radius = cellPitch * sphereRadiusRatio;
  const y = centerOnTerrain ? terrainY : terrainY + radius * SURFACE_PAD;
  return { x, y, z };
}

export type FeaturedFlagPose = {
  x: number;
  z: number;
  yStickCenter: number;
  yTop: number;
  stickHeight: number;
  /** Fixed dash UV span at full height (blend = 1); keeps dashes anchored while growing. */
  stickDashSpan: number;
  stickRadius: number;
  topRadius: number;
};

/** Nominal pole height for stick dash phase (independent of featured blend). */
export function getStickDashSpan(cellPitch: number): number {
  return Math.max(STICK_MIN_HEIGHT, cellPitch * FLAG_POLE_HEIGHT_RATIO);
}

export function getFeaturedFlagPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  moveWithBelt: boolean,
  featuredBlend = 1,
  sphereRadiusRatio = SPHERE_RADIUS_RATIO,
): FeaturedFlagPose {
  const { cols, rows, cellPitch } = prepared;
  let x = cell.x;
  let z = cell.z;
  if (moveWithBelt) {
    const pos = getAnimatedWorldXZ(cell, elapsed, cols, rows, cellPitch);
    x = pos.x;
    z = pos.z;
  }
  const terrainY = terrainYAtCell(cell, prepared, elapsed, moveWithBelt);
  const b = Math.max(0, Math.min(1, featuredBlend));
  const baseR = cellPitch * sphereRadiusRatio * b;
  const topR = cellPitch * sphereRadiusRatio * TOP_SPHERE_TO_BASE * b;
  const stickR = cellPitch * STICK_RADIUS_RATIO * b;
  const poleH = cellPitch * FLAG_POLE_HEIGHT_RATIO * b;
  const yBaseTop = terrainY + baseR;
  const stickHeight = Math.max(STICK_MIN_HEIGHT * b, poleH);
  const yStickCenter = yBaseTop + stickHeight * 0.5;
  const yTop = yBaseTop + stickHeight + topR;
  return {
    x,
    z,
    yStickCenter,
    yTop,
    stickHeight,
    stickDashSpan: getStickDashSpan(cellPitch),
    stickRadius: stickR,
    topRadius: topR,
  };
}

export function getMarkerLabelPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  moveWithBelt: boolean,
  sphereRadiusRatio = SPHERE_RADIUS_RATIO,
): MarkerWorldPose {
  const gap = prepared.cellPitch * LABEL_GAP_RATIO;

  if (cell.featured) {
    const flag = getFeaturedFlagPose(cell, prepared, elapsed, moveWithBelt);
    return {
      x: flag.x,
      z: flag.z,
      y: flag.yTop + flag.topRadius + gap,
    };
  }

  const sphere = getSphereMarkerPose(
    cell,
    prepared,
    elapsed,
    false,
    moveWithBelt,
    sphereRadiusRatio,
  );
  const radius = prepared.cellPitch * sphereRadiusRatio;
  return {
    x: sphere.x,
    z: sphere.z,
    y: sphere.y + radius + gap,
  };
}
