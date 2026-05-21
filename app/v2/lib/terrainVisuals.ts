import type { SphereTerrainShadeParams } from "@/app/v2/lib/sphereTerrainShade";

export type TerrainVisualParams = {
  sphereRestColor: number;
  emptySphereColor: number;
  emptySphereRadiusMul: number;
  stickColor: number;
  stickLineWidth: number;
  sphereRadiusRatio: number;
  /** Micro-cells per macro edge (1 = one sphere per opportunity). */
  gridSubdiv: number;
  /** Macro grid width/height ratio (1 = square torus). */
  gridLayoutAspect: number;
  /** Featured placement radius from layout center (0 = tight cluster). */
  featuredSpread: number;
  stickDashMin: number;
  stickDashMul: number;
  stickGapMin: number;
  stickGapMul: number;
  /** Dotted grid: short dash = dot length along each edge. */
  gridDotMin: number;
  gridDotMul: number;
  /** Spacing between dots along each edge. */
  gridDotGapMin: number;
  gridDotGapMul: number;
  gridOpacity: number;
  fogNearMul: number;
  fogFarMul: number;
  /** × extent × fogNearMul for marker depth fade start. */
  depthFadeNearScale: number;
  /** × extent × fogFarMul for marker depth fade end. */
  depthFadeFarScale: number;
  /** × extent × fogNearMul for grid wireframe depth fade start. */
  gridDepthFadeNearScale: number;
  /** × extent × fogFarMul for grid wireframe depth fade end. */
  gridDepthFadeFarScale: number;
  depthFadeMinOpacity: number;
  sphereShadeEnabled: boolean;
  sphereShadeAzimuthDeg: number;
  sphereShadeElevationDeg: number;
  sphereShadeAmbient: number;
  sphereShadeContrast: number;
};

export const DEFAULT_TERRAIN_VISUALS: TerrainVisualParams = {
  sphereRestColor: 0xf9f9f9,
  emptySphereColor: 0xf9f9f9,
  emptySphereRadiusMul: 1,
  gridSubdiv: 3,
  gridLayoutAspect: 1,
  featuredSpread: 0.1,
  stickColor: 0x4a9a44,
  stickLineWidth: 1,
  stickDashMin: 0.02,
  stickDashMul: 0.055,
  stickGapMin: 0.012,
  stickGapMul: 0.032,
  gridDotMin: 0,
  gridDotMul: 0,
  gridDotGapMin: 0.01,
  gridDotGapMul: 0,
  gridOpacity: 1.0,
  fogNearMul: 0.16,
  fogFarMul: 0.58,
  depthFadeNearScale: 0.05,
  depthFadeFarScale: 0.31,
  gridDepthFadeNearScale: 0.02,
  gridDepthFadeFarScale: 0.5,
  depthFadeMinOpacity: 0.0,
  sphereRadiusRatio: 0.02,
  sphereShadeEnabled: true,
  sphereShadeAzimuthDeg: 225,
  sphereShadeElevationDeg: 36,
  sphereShadeAmbient: 0,
  sphereShadeContrast: 4.0,
};

export function sphereTerrainShadeFromVisuals(
  visuals: TerrainVisualParams,
): SphereTerrainShadeParams {
  return {
    enabled: visuals.sphereShadeEnabled,
    azimuthDeg: visuals.sphereShadeAzimuthDeg,
    elevationDeg: visuals.sphereShadeElevationDeg,
    ambient: visuals.sphereShadeAmbient,
    contrast: visuals.sphereShadeContrast,
  };
}

export function hexToColorNumber(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16);
}

/** Single sphere radius scale for data and empty markers. */
export function sphereRadiusRatioFromVisuals(
  visuals: TerrainVisualParams,
): number {
  return visuals.sphereRadiusRatio * visuals.emptySphereRadiusMul;
}

export function stickDashSizesFromVisuals(
  cellPitch: number,
  visuals: TerrainVisualParams,
): { dashSize: number; gapSize: number; lineWidth: number } {
  return {
    dashSize: Math.max(visuals.stickDashMin, cellPitch * visuals.stickDashMul),
    gapSize: Math.max(visuals.stickGapMin, cellPitch * visuals.stickGapMul),
    lineWidth: visuals.stickLineWidth,
  };
}

/** LineDashedMaterial dot length + gap for the terrain lattice. */
export function gridDotSizesFromVisuals(
  cellPitch: number,
  visuals: TerrainVisualParams,
): { dotSize: number; dotGap: number } {
  return {
    dotSize: Math.max(visuals.gridDotMin, cellPitch * visuals.gridDotMul),
    dotGap: Math.max(visuals.gridDotGapMin, cellPitch * visuals.gridDotGapMul),
  };
}
