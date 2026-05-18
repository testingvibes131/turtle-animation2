import { getAnimatedGridUV, getAnimatedWorldXZ } from "@/app/v2/lib/conveyor";
import { sampleFieldToroidal } from "@/app/v2/lib/toroidal";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import type { PreparedTerrain } from "@/app/v2/lib/terrainGeometry";

const SPHERE_RADIUS_RATIO = 0.07;
const SURFACE_PAD = 1.04;
const BASE_SPHERE_RADIUS_RATIO = 0.07;
const TOP_SPHERE_RADIUS_RATIO = 0.045;
const FLAG_POLE_HEIGHT_RATIO = 0.95;
const STICK_RADIUS_RATIO = 0.014;
const STICK_MIN_HEIGHT = 0.15;
const LABEL_GAP_RATIO = 0.12;

export type MarkerWorldPose = {
  x: number;
  y: number;
  z: number;
};

function terrainYAtParcel(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
): number {
  const { field, cols, rows } = prepared;
  const { u, v } = getAnimatedGridUV(cell, elapsed, cols, rows);
  return sampleFieldToroidal(field, cols, rows, u, v);
}

/** Rest / featured base sphere center — moves with the belt on XZ. */
export function getSphereMarkerPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  centerOnTerrain: boolean,
): MarkerWorldPose {
  const { cols, rows, cellPitch } = prepared;
  const { x, z } = getAnimatedWorldXZ(cell, elapsed, cols, rows, cellPitch);
  const terrainY = terrainYAtParcel(cell, prepared, elapsed);
  const radius = cellPitch * SPHERE_RADIUS_RATIO;
  const y = centerOnTerrain ? terrainY : terrainY + radius * SURFACE_PAD;
  return { x, y, z };
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
): FeaturedFlagPose {
  const { cols, rows, cellPitch } = prepared;
  const { x, z } = getAnimatedWorldXZ(cell, elapsed, cols, rows, cellPitch);
  const terrainY = terrainYAtParcel(cell, prepared, elapsed);
  const baseR = cellPitch * BASE_SPHERE_RADIUS_RATIO;
  const topR = cellPitch * TOP_SPHERE_RADIUS_RATIO;
  const stickR = cellPitch * STICK_RADIUS_RATIO;
  const poleH = cellPitch * FLAG_POLE_HEIGHT_RATIO;
  const yBaseTop = terrainY + baseR;
  const stickHeight = Math.max(STICK_MIN_HEIGHT, poleH);
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

/** Label anchor above the visible top of the marker. */
export function getMarkerLabelPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
): MarkerWorldPose {
  const gap = prepared.cellPitch * LABEL_GAP_RATIO;

  if (cell.featured) {
    const flag = getFeaturedFlagPose(cell, prepared, elapsed);
    return {
      x: flag.x,
      z: flag.z,
      y: flag.yTop + flag.topRadius + gap,
    };
  }

  const sphere = getSphereMarkerPose(cell, prepared, elapsed, false);
  const radius = prepared.cellPitch * SPHERE_RADIUS_RATIO;
  return {
    x: sphere.x,
    z: sphere.z,
    y: sphere.y + radius + gap,
  };
}
