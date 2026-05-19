import { getAnimatedGridUV, getAnimatedWorldXZ } from "@/app/v2/lib/conveyor";
import { sampleHeightAt } from "@/app/v2/lib/heightField";
import { sampleFieldToroidal } from "@/app/v2/lib/toroidal";
import type { DebugZone } from "@/app/v2/lib/debugZone";
import { markerScaleInDebugZone } from "@/app/v2/lib/debugZone";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import type { PreparedTerrain } from "@/app/v2/lib/terrainGeometry";
import { SPHERE_RADIUS_RATIO } from "@/app/v2/lib/markerVisuals";

const SURFACE_PAD = 1.04;
const BASE_SPHERE_RADIUS_RATIO = SPHERE_RADIUS_RATIO;
const TOP_SPHERE_RADIUS_RATIO = SPHERE_RADIUS_RATIO * (0.045 / 0.07);
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
  zone: DebugZone,
): MarkerWorldPose & { featuredBlend: number; zoneScale: number } {
  const { field, cols, rows, cellPitch } = prepared;
  const zoneScale = markerScaleInDebugZone(cell.x, cell.z, zone);
  const terrainY = sampleHeightAt(field, cols, rows, cell.col, cell.row);
  const radius = cellPitch * SPHERE_RADIUS_RATIO * zoneScale;
  const yRest = terrainY + radius * SURFACE_PAD;
  const y = yRest + (terrainY - yRest) * featuredBlend;
  return { x: cell.x, y, z: cell.z, featuredBlend, zoneScale };
}

export function getSphereMarkerPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  centerOnTerrain: boolean,
  moveWithBelt: boolean,
  zone: DebugZone,
): MarkerWorldPose & { zoneScale: number } {
  const { cols, rows, cellPitch } = prepared;
  let x = cell.x;
  let z = cell.z;
  if (moveWithBelt) {
    const pos = getAnimatedWorldXZ(cell, elapsed, cols, rows, cellPitch);
    x = pos.x;
    z = pos.z;
  }
  const zoneScale = markerScaleInDebugZone(x, z, zone);
  const terrainY = terrainYAtCell(cell, prepared, elapsed, moveWithBelt);
  const radius = cellPitch * SPHERE_RADIUS_RATIO * zoneScale;
  const y = centerOnTerrain ? terrainY : terrainY + radius * SURFACE_PAD;
  return { x, y, z, zoneScale };
}

export type FeaturedFlagPose = {
  x: number;
  z: number;
  yStickCenter: number;
  yTop: number;
  stickHeight: number;
  stickRadius: number;
  topRadius: number;
};

export function getFeaturedFlagPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  moveWithBelt: boolean,
  zone: DebugZone,
  featuredBlend = 1,
): FeaturedFlagPose {
  const { cols, rows, cellPitch } = prepared;
  let x = cell.x;
  let z = cell.z;
  if (moveWithBelt) {
    const pos = getAnimatedWorldXZ(cell, elapsed, cols, rows, cellPitch);
    x = pos.x;
    z = pos.z;
  }
  const zoneScale = markerScaleInDebugZone(x, z, zone);
  const terrainY = terrainYAtCell(cell, prepared, elapsed, moveWithBelt);
  const b = Math.max(0, Math.min(1, featuredBlend));
  const baseR = cellPitch * BASE_SPHERE_RADIUS_RATIO * zoneScale * b;
  const topR = cellPitch * TOP_SPHERE_RADIUS_RATIO * zoneScale * b;
  const stickR = cellPitch * STICK_RADIUS_RATIO * zoneScale * b;
  const poleH = cellPitch * FLAG_POLE_HEIGHT_RATIO * zoneScale * b;
  const yBaseTop = terrainY + baseR;
  const stickHeight = Math.max(STICK_MIN_HEIGHT * zoneScale * b, poleH);
  const yStickCenter = yBaseTop + stickHeight * 0.5;
  const yTop = yBaseTop + stickHeight + topR;
  return {
    x,
    z,
    yStickCenter,
    yTop,
    stickHeight,
    stickRadius: stickR,
    topRadius: topR,
  };
}

export function getMarkerLabelPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  moveWithBelt: boolean,
  zone: DebugZone,
): MarkerWorldPose {
  const gap = prepared.cellPitch * LABEL_GAP_RATIO;

  if (cell.featured) {
    const flag = getFeaturedFlagPose(cell, prepared, elapsed, moveWithBelt, zone);
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
    zone,
  );
  const radius = prepared.cellPitch * SPHERE_RADIUS_RATIO * sphere.zoneScale;
  return {
    x: sphere.x,
    z: sphere.z,
    y: sphere.y + radius + gap,
  };
}
