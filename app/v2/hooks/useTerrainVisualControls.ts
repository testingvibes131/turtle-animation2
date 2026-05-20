"use client";

import { useControls } from "leva";
import { useMemo } from "react";
import {
  DEFAULT_TERRAIN_VISUALS,
  hexToColorNumber,
  type TerrainVisualParams,
} from "@/app/v2/lib/terrainVisuals";

function colorControl(hex: string) {
  return { value: `#${hex.replace("#", "").toLowerCase()}` };
}

export function useTerrainVisualControls(): TerrainVisualParams {
  const d = DEFAULT_TERRAIN_VISUALS;

  const spheres = useControls("Spheres", {
    restColor: colorControl(`#${d.sphereRestColor.toString(16).padStart(6, "0")}`),
    emptyColor: colorControl(
      `#${d.emptySphereColor.toString(16).padStart(6, "0")}`,
    ),
    radiusRatio: {
      value: d.sphereRadiusRatio,
      min: 0.005,
      max: 0.12,
      step: 0.001,
      label: "radius ratio",
    },
    shadeEnabled: { value: d.sphereShadeEnabled, label: "slope shade" },
    shadeAzimuth: {
      value: d.sphereShadeAzimuthDeg,
      min: 0,
      max: 360,
      step: 1,
      label: "light azimuth°",
    },
    shadeElevation: {
      value: d.sphereShadeElevationDeg,
      min: 5,
      max: 89,
      step: 1,
      label: "light elevation°",
    },
    shadeAmbient: {
      value: d.sphereShadeAmbient,
      min: 0,
      max: 0.85,
      step: 0.02,
      label: "ambient",
    },
    shadeContrast: {
      value: d.sphereShadeContrast,
      min: 0.4,
      max: 4,
      step: 0.05,
      label: "contrast",
    },
  });

  const sticks = useControls("Sticks", {
    color: colorControl(`#${d.stickColor.toString(16).padStart(6, "0")}`),
    lineWidth: {
      value: d.stickLineWidth,
      min: 0.5,
      max: 8,
      step: 0.5,
      label: "width (px)",
    },
    dashMin: { value: d.stickDashMin, min: 0, max: 0.2, step: 0.005 },
    dashMul: { value: d.stickDashMul, min: 0, max: 0.3, step: 0.005 },
    gapMin: { value: d.stickGapMin, min: 0, max: 0.2, step: 0.005 },
    gapMul: { value: d.stickGapMul, min: 0, max: 0.3, step: 0.005 },
  });

  const grid = useControls("Grid", {
    subdiv: {
      value: d.gridSubdiv,
      min: 1,
      max: 12,
      step: 1,
      label: "subdiv (K×K)",
    },
    dashMin: { value: d.gridDashMin, min: 0, max: 0.2, step: 0.005 },
    dashMul: { value: d.gridDashMul, min: 0, max: 0.4, step: 0.005 },
    gapMin: { value: d.gridGapMin, min: 0, max: 0.2, step: 0.005 },
    gapMul: { value: d.gridGapMul, min: 0, max: 0.4, step: 0.005 },
    glowDashMin: { value: d.gridGlowDashMin, min: 0, max: 0.2, step: 0.005 },
    glowDashMul: { value: d.gridGlowDashMul, min: 0, max: 0.4, step: 0.005 },
    glowGapMin: { value: d.gridGlowGapMin, min: 0, max: 0.2, step: 0.005 },
    glowGapMul: { value: d.gridGlowGapMul, min: 0, max: 0.4, step: 0.005 },
    opacity: { value: d.gridOpacity, min: 0, max: 1, step: 0.02 },
    glowOpacity: { value: d.gridGlowOpacity, min: 0, max: 1, step: 0.02 },
    fadeStart: { value: d.gridFadeStart, min: 0, max: 1.5, step: 0.02 },
    fadeEnd: { value: d.gridFadeEnd, min: 0, max: 1.5, step: 0.02 },
  });

  const fog = useControls("Fog", {
    nearMul: {
      value: d.fogNearMul,
      min: 0,
      max: 1,
      step: 0.01,
      label: "near × extent",
    },
    farMul: {
      value: d.fogFarMul,
      min: 0.2,
      max: 3,
      step: 0.01,
      label: "far × extent",
    },
  });

  return useMemo(
    (): TerrainVisualParams => ({
      sphereRestColor: hexToColorNumber(spheres.restColor),
      emptySphereColor: hexToColorNumber(spheres.emptyColor),
      emptySphereRadiusMul: d.emptySphereRadiusMul,
      gridSubdiv: grid.subdiv,
      stickColor: hexToColorNumber(sticks.color),
      stickLineWidth: sticks.lineWidth,
      sphereRadiusRatio: spheres.radiusRatio,
      stickDashMin: sticks.dashMin,
      stickDashMul: sticks.dashMul,
      stickGapMin: sticks.gapMin,
      stickGapMul: sticks.gapMul,
      gridDashMin: grid.dashMin,
      gridDashMul: grid.dashMul,
      gridGapMin: grid.gapMin,
      gridGapMul: grid.gapMul,
      gridGlowDashMin: grid.glowDashMin,
      gridGlowDashMul: grid.glowDashMul,
      gridGlowGapMin: grid.glowGapMin,
      gridGlowGapMul: grid.glowGapMul,
      gridOpacity: grid.opacity,
      gridGlowOpacity: grid.glowOpacity,
      gridFadeStart: grid.fadeStart,
      gridFadeEnd: grid.fadeEnd,
      fogNearMul: fog.nearMul,
      fogFarMul: fog.farMul,
      sphereShadeEnabled: spheres.shadeEnabled,
      sphereShadeAzimuthDeg: spheres.shadeAzimuth,
      sphereShadeElevationDeg: spheres.shadeElevation,
      sphereShadeAmbient: spheres.shadeAmbient,
      sphereShadeContrast: spheres.shadeContrast,
    }),
    [spheres, sticks, grid, fog],
  );
}
