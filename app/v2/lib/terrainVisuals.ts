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
  stickDashMin: number;
  stickDashMul: number;
  stickGapMin: number;
  stickGapMul: number;
  gridDashMin: number;
  gridDashMul: number;
  gridGapMin: number;
  gridGapMul: number;
  gridGlowDashMin: number;
  gridGlowDashMul: number;
  gridGlowGapMin: number;
  gridGlowGapMul: number;
  gridOpacity: number;
  gridGlowOpacity: number;
  gridFadeStart: number;
  gridFadeEnd: number;
  fogNearMul: number;
  fogFarMul: number;
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
  gridSubdiv: 8,
  stickColor: 0x4a9a44,
  stickLineWidth: 1,
  /** Unified sphere size (matches prior empty sub-sphere scale at subdiv 2). */
  sphereRadiusRatio: 0.05,
  stickDashMin: 0.02,
  stickDashMul: 0.055,
  stickGapMin: 0.012,
  stickGapMul: 0.032,
  gridDashMin: 0.04,
  gridDashMul: 0.14,
  gridGapMin: 0.038,
  gridGapMul: 0.13,
  gridGlowDashMin: 0.05,
  gridGlowDashMul: 0.18,
  gridGlowGapMin: 0.044,
  gridGlowGapMul: 0.15,
  gridOpacity: 0.03,
  gridGlowOpacity: 0.16,
  gridFadeStart: 0.48,
  gridFadeEnd: 1.02,
  fogNearMul: 0.22,
  fogFarMul: 1.45,
  sphereShadeEnabled: true,
  /** Upper-left key light (reference-style rolling hills). */
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
