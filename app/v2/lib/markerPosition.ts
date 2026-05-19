import { getAnimatedGridUV, getAnimatedWorldXZ } from "@/app/v2/lib/conveyor";
import { sampleHeightAt } from "@/app/v2/lib/heightField";
import { sourceCellAtCrossing } from "@/app/v2/lib/scrolledCell";
import { sampleFieldToroidal } from "@/app/v2/lib/toroidal";
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

/** Fixed crossing; DNA at the vertex comes from the scrolled field. */
export function getScrolledDnaSpherePose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  lookup: (TerrainCell | undefined)[][],
): MarkerWorldPose & { featured: boolean } {
  const { field, cols, rows, cellPitch } = prepared;
  const source = sourceCellAtCrossing(cell, elapsed, lookup);
  const featured = source?.featured ?? false;
  const terrainY = sampleHeightAt(field, cols, rows, cell.col, cell.row);
  const radius = cellPitch * SPHERE_RADIUS_RATIO;
  const y = featured ? terrainY : terrainY + radius * SURFACE_PAD;
  return { x: cell.x, y, z: cell.z, featured };
}

export function getSphereMarkerPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  centerOnTerrain: boolean,
  moveWithBelt: boolean,
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
  moveWithBelt: boolean,
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

export function getMarkerLabelPose(
  cell: TerrainCell,
  prepared: PreparedTerrain,
  elapsed: number,
  moveWithBelt: boolean,
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
  );
  const radius = prepared.cellPitch * SPHERE_RADIUS_RATIO;
  return {
    x: sphere.x,
    z: sphere.z,
    y: sphere.y + radius + gap,
  };
}
