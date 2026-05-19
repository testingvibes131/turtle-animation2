export type TerrainVisualParams = {
  sphereRestColor: number;
  stickColor: number;
  stickLineWidth: number;
  sphereRadiusRatio: number;
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
};

export const DEFAULT_TERRAIN_VISUALS: TerrainVisualParams = {
  sphereRestColor: 0x8b8c8b,
  stickColor: 0x4a9a44,
  stickLineWidth: 1,
  sphereRadiusRatio: 0.0245,
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
  gridOpacity: 0.25,
  gridGlowOpacity: 0.16,
  gridFadeStart: 0.48,
  gridFadeEnd: 1.02,
  fogNearMul: 0.22,
  fogFarMul: 1.45,
};

export function hexToColorNumber(hex: string): number {
  return Number.parseInt(hex.replace("#", ""), 16);
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
