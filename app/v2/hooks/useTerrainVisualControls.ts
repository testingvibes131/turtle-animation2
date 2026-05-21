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
    layoutAspect: {
      value: d.gridLayoutAspect,
      min: 0.5,
      max: 2.5,
      step: 0.05,
      label: "macro aspect",
    },
    featuredSpread: {
      value: d.featuredSpread,
      min: 0,
      max: 3,
      step: 0.05,
      label: "featured spread",
    },
    dotMin: { value: d.gridDotMin, min: 0.002, max: 0.08, step: 0.001, label: "dot size min" },
    dotMul: { value: d.gridDotMul, min: 0, max: 0.2, step: 0.005, label: "dot size × pitch" },
    dotGapMin: { value: d.gridDotGapMin, min: 0.01, max: 0.25, step: 0.005, label: "dot gap min" },
    dotGapMul: { value: d.gridDotGapMul, min: 0, max: 0.5, step: 0.005, label: "dot gap × pitch" },
    opacity: { value: d.gridOpacity, min: 0, max: 1, step: 0.02 },
  });

  const depthFade = useControls("Depth fade", {
    markerNear: {
      value: d.depthFadeNearScale,
      min: 0.02,
      max: 0.5,
      step: 0.01,
      label: "marker near ×",
    },
    markerFar: {
      value: d.depthFadeFarScale,
      min: 0.08,
      max: 0.5,
      step: 0.01,
      label: "marker far ×",
    },
    gridNear: {
      value: d.gridDepthFadeNearScale,
      min: 0.02,
      max: 0.5,
      step: 0.01,
      label: "grid near ×",
    },
    gridFar: {
      value: d.gridDepthFadeFarScale,
      min: 0.08,
      max: 0.5,
      step: 0.01,
      label: "grid far ×",
    },
    minOpacity: {
      value: d.depthFadeMinOpacity,
      min: 0,
      max: 0.9,
      step: 0.01,
      label: "far min opacity",
    },
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
      min: 0.25,
      max: 4.2,
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
      gridLayoutAspect: grid.layoutAspect,
      featuredSpread: grid.featuredSpread,
      stickColor: hexToColorNumber(sticks.color),
      stickLineWidth: sticks.lineWidth,
      sphereRadiusRatio: spheres.radiusRatio,
      stickDashMin: sticks.dashMin,
      stickDashMul: sticks.dashMul,
      stickGapMin: sticks.gapMin,
      stickGapMul: sticks.gapMul,
      gridDotMin: grid.dotMin,
      gridDotMul: grid.dotMul,
      gridDotGapMin: grid.dotGapMin,
      gridDotGapMul: grid.dotGapMul,
      gridOpacity: grid.opacity,
      fogNearMul: fog.nearMul,
      fogFarMul: fog.farMul,
      depthFadeNearScale: depthFade.markerNear,
      depthFadeFarScale: depthFade.markerFar,
      gridDepthFadeNearScale: depthFade.gridNear,
      gridDepthFadeFarScale: depthFade.gridFar,
      depthFadeMinOpacity: depthFade.minOpacity,
      sphereShadeEnabled: spheres.shadeEnabled,
      sphereShadeAzimuthDeg: spheres.shadeAzimuth,
      sphereShadeElevationDeg: spheres.shadeElevation,
      sphereShadeAmbient: spheres.shadeAmbient,
      sphereShadeContrast: spheres.shadeContrast,
    }),
    [spheres, sticks, grid, depthFade, fog],
  );
}
