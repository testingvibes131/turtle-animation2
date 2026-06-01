"use client";

import { useControls } from "leva";
import { useMemo } from "react";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";

export type BlobVisualParams = PerlinBlobParams & {
  pointSizeRatio: number;
  rotationSpeed: number;
  depthFadeMinOpacity: number;
  depthSizeNearOffset: number;
  depthSizeFarOffset: number;
  depthSizeMinMul: number;
  depthSizeMaxMul: number;
  lineWidth: number;
  lineOpacity: number;
  timeSpeed: number;
  frontMinDot: number;
  clusterMaxAngleDeg: number;
  blobCenterLean: number;
  debugHoverZone: boolean;
  hubConnectionMul: number;
  zoneCenterOffsetRight: number;
  hubOffsetSpheres: number;
  hubLogoOutsetSpheres: number;
  noiseSlopeMinOpacity: number;
  noiseSlopeMaxOpacity: number;
};

const DEFAULTS = {
  radius: 0.7,
  detail: 24,
  noiseScale: 4.25,
  displacementDivisor: 38,
  perlinPeriod: 0.3,
  timeSpeed: 0.01,
  pointSizeRatio: 0.13,
  rotationSpeed: 0.04,
  depthFadeMinOpacity: 0,
  depthSizeNearOffset: 0.19,
  depthSizeFarOffset: 0.10,
  depthSizeMinMul: 0.76,
  depthSizeMaxMul: 1,
  lineWidth: 2,
  lineOpacity: 0.85,
  frontMinDot: 0.35,
  clusterMaxAngleDeg: 22,
  blobCenterLean: 0.4,
  debugHoverZone: false,
  hubConnectionMul: 1.5,
  zoneCenterOffsetRight: 0.3,
  hubOffsetSpheres: 0,
  hubLogoOutsetSpheres: 10,
  noiseSlopeMinOpacity: 0.42,
  noiseSlopeMaxOpacity: 1,
} satisfies Omit<BlobVisualParams, "time">;

export function useBlobControls(): BlobVisualParams {
  const blob = useControls("Blob", {
    radius: { value: DEFAULTS.radius, min: 0.5, max: 2.5, step: 0.05 },
    detail: {
      value: DEFAULTS.detail,
      min: 2,
      max: 24,
      step: 1,
      label: "icosphere detail",
    },
    pointSizeRatio: {
      value: DEFAULTS.pointSizeRatio,
      min: 0.04,
      max: 0.28,
      step: 0.01,
      label: "base sphere size",
    },
  });

  const perlin = useControls("Perlin", {
    noiseScale: {
      value: DEFAULTS.noiseScale,
      min: 0.5,
      max: 30,
      step: 0.25,
      label: "noise ×",
    },
    displacementDivisor: {
      value: DEFAULTS.displacementDivisor,
      min: 2,
      max: 60,
      step: 0.5,
      label: "÷ amplitude",
    },
    perlinPeriod: {
      value: DEFAULTS.perlinPeriod,
      min: 0.25,
      max: 30,
      step: 0.1,
      label: "period",
    },
    timeSpeed: {
      value: DEFAULTS.timeSpeed,
      min: 0,
      max: 2,
      step: 0.05,
      label: "anim speed",
    },
    noiseSlopeMinOpacity: {
      value: DEFAULTS.noiseSlopeMinOpacity,
      min: 0.1,
      max: 1,
      step: 0.02,
      label: "noise shadow opacity",
    },
    noiseSlopeMaxOpacity: {
      value: DEFAULTS.noiseSlopeMaxOpacity,
      min: 0.1,
      max: 1,
      step: 0.02,
      label: "noise light opacity",
    },
  });

  const motion = useControls("Motion", {
    rotationSpeed: {
      value: DEFAULTS.rotationSpeed,
      min: 0,
      max: 0.2,
      step: 0.005,
      label: "spin",
    },
  });

  const hoverCluster = useControls("Hover cluster", {
    frontMinDot: {
      value: DEFAULTS.frontMinDot,
      min: 0.2,
      max: 0.9,
      step: 0.02,
      label: "camera-facing zone (dot)",
    },
    clusterMaxAngleDeg: {
      value: DEFAULTS.clusterMaxAngleDeg,
      min: 8,
      max: 45,
      step: 1,
      label: "hub → partner distance °",
    },
    blobCenterLean: {
      value: DEFAULTS.blobCenterLean,
      min: 0,
      max: 1,
      step: 0.02,
      label: "blob center lean",
    },
    debugHoverZone: {
      value: DEFAULTS.debugHoverZone,
      label: "debug pickable (blue)",
    },
    zoneCenterOffsetRight: {
      value: DEFAULTS.zoneCenterOffsetRight,
      min: -0.2,
      max: 0.2,
      step: 0.005,
      label: "zone center → right",
    },
    hubOffsetSpheres: {
      value: DEFAULTS.hubOffsetSpheres,
      min: 0,
      max: 24,
      step: 1,
      label: "hub offset (0 = zone center)",
    },
    hubLogoOutsetSpheres: {
      value: DEFAULTS.hubLogoOutsetSpheres,
      min: 0,
      max: 24,
      step: 1,
      label: "logo / hub outward",
    },
  });

  const depthSize = useControls("Depth size", {
    depthSizeNearOffset: {
      value: DEFAULTS.depthSizeNearOffset,
      min: 0,
      max: 1.2,
      step: 0.02,
      label: "near band × extent",
    },
    depthSizeFarOffset: {
      value: DEFAULTS.depthSizeFarOffset,
      min: 0.1,
      max: 2,
      step: 0.02,
      label: "far band × extent",
    },
    depthSizeMinMul: {
      value: DEFAULTS.depthSizeMinMul,
      min: 0.1,
      max: 1.5,
      step: 0.02,
      label: "far scale",
    },
    depthSizeMaxMul: {
      value: DEFAULTS.depthSizeMaxMul,
      min: 0.5,
      max: 2.5,
      step: 0.02,
      label: "near scale",
    },
  });

  const depthFade = useControls("Depth fade", {
    depthFadeMinOpacity: {
      value: DEFAULTS.depthFadeMinOpacity,
      min: 0,
      max: 1,
      step: 0.02,
      label: "min opacity",
    },
  });

  const lines = useControls("Hover lines", {
    hubConnectionMul: {
      value: DEFAULTS.hubConnectionMul,
      min: 1,
      max: 10,
      step: 0.05,
      label: "hub connections ×",
    },
    lineWidth: {
      value: DEFAULTS.lineWidth,
      min: 0.5,
      max: 8,
      step: 0.25,
      label: "width",
    },
    lineOpacity: {
      value: DEFAULTS.lineOpacity,
      min: 0.1,
      max: 1,
      step: 0.02,
      label: "opacity",
    },
  });

  return useMemo(
    () => ({
      radius: blob.radius,
      detail: Math.round(blob.detail),
      pointSizeRatio: blob.pointSizeRatio,
      noiseScale: perlin.noiseScale,
      displacementDivisor: perlin.displacementDivisor,
      perlinPeriod: perlin.perlinPeriod,
      timeSpeed: perlin.timeSpeed,
      noiseSlopeMinOpacity: perlin.noiseSlopeMinOpacity,
      noiseSlopeMaxOpacity: perlin.noiseSlopeMaxOpacity,
      time: 0,
      rotationSpeed: motion.rotationSpeed,
      frontMinDot: hoverCluster.frontMinDot,
      clusterMaxAngleDeg: hoverCluster.clusterMaxAngleDeg,
      blobCenterLean: hoverCluster.blobCenterLean,
      debugHoverZone: hoverCluster.debugHoverZone,
      zoneCenterOffsetRight: hoverCluster.zoneCenterOffsetRight,
      hubOffsetSpheres: Math.round(hoverCluster.hubOffsetSpheres),
      hubLogoOutsetSpheres: Math.round(hoverCluster.hubLogoOutsetSpheres),
      depthFadeMinOpacity: depthFade.depthFadeMinOpacity,
      depthSizeNearOffset: depthSize.depthSizeNearOffset,
      depthSizeFarOffset: depthSize.depthSizeFarOffset,
      depthSizeMinMul: depthSize.depthSizeMinMul,
      depthSizeMaxMul: depthSize.depthSizeMaxMul,
      hubConnectionMul: lines.hubConnectionMul,
      lineWidth: lines.lineWidth,
      lineOpacity: lines.lineOpacity,
    }),
    [blob, perlin, motion, hoverCluster, depthSize, depthFade, lines],
  );
}
