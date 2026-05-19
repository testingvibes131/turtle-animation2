import {
  DEFAULT_TERRAIN_VISUALS,
  stickDashSizesFromVisuals,
} from "@/app/v2/lib/terrainVisuals";

/** Default sphere tint (overridden at runtime via Leva). */
export const COLOR_REST = DEFAULT_TERRAIN_VISUALS.sphereRestColor;

export const COLOR_FEATURED = DEFAULT_TERRAIN_VISUALS.stickColor;

export const COLOR_STICK = DEFAULT_TERRAIN_VISUALS.stickColor;

export const SPHERE_RADIUS_RATIO = DEFAULT_TERRAIN_VISUALS.sphereRadiusRatio;

export function stickDashSizes(cellPitch: number): {
  dashSize: number;
  gapSize: number;
  lineWidth: number;
} {
  return stickDashSizesFromVisuals(cellPitch, DEFAULT_TERRAIN_VISUALS);
}
