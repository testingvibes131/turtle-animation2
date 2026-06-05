"use client";

import { useControls } from "leva";
import { useMemo } from "react";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";
import {
  BLOB_SETUP_OPTIONS,
  blobParamsForSetup,
  type BlobSetupId,
} from "@/features/blob-scene/lib/blobVisualPresets";
import {
  BLOB_INTERACTION_SECTION1_START_FRAC,
  BLOB_VISUAL_TRANSITION_END_FRAC,
  BLOB_VISUAL_TRANSITION_START_FRAC,
} from "@/features/blob-scene/lib/scroll/blobScrollInteraction";
import { BLOB_TRANSITION_DISTORT_PEAK_MUL } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";

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

export type BlobTransitionTuning = {
  visualStartFrac: number;
  visualEndFrac: number;
  interactionStartFrac: number;
  distortPeakMul: number;
};

export type BlobColoredDotsTuning = {
  coreOpacity: number;
  glowScaleMul: number;
  glowOpacity: number;
};

export type BlobControls = {
  setup: BlobSetupId;
  params: BlobVisualParams;
  transition: BlobTransitionTuning;
  coloredDots: BlobColoredDotsTuning;
};

const DEFAULT_COLORED_DOTS: BlobColoredDotsTuning = {
  coreOpacity: 0.8,
  glowScaleMul: 2.35,
  glowOpacity: 0.2,
};

export function useBlobControls(): BlobControls {
  const { setup } = useControls("Setup", {
    setup: {
      value: "section-1-blob" satisfies BlobSetupId,
      options: BLOB_SETUP_OPTIONS,
    },
  });

  const defaults = blobParamsForSetup(setup as BlobSetupId);

  const shape = useControls(
    "Shape",
    {
      radius: { value: defaults.radius, min: 0.3, max: 1.2, step: 0.01 },
      detail: { value: defaults.detail, min: 0, max: 32, step: 1 },
      pointSizeRatio: {
        value: defaults.pointSizeRatio,
        min: 0.02,
        max: 0.35,
        step: 0.005,
      },
    },
    { collapsed: true },
  );

  const noise = useControls(
    "Noise",
    {
      noiseScale: { value: defaults.noiseScale, min: 0.5, max: 12, step: 0.05 },
      displacementDivisor: {
        value: defaults.displacementDivisor,
        min: 5,
        max: 80,
        step: 1,
      },
      perlinPeriod: {
        value: defaults.perlinPeriod,
        min: 0.05,
        max: 2,
        step: 0.01,
      },
      noiseSlopeMinOpacity: {
        value: defaults.noiseSlopeMinOpacity,
        min: 0,
        max: 1,
        step: 0.01,
      },
      noiseSlopeMaxOpacity: {
        value: defaults.noiseSlopeMaxOpacity,
        min: 0,
        max: 1,
        step: 0.01,
      },
    },
    { collapsed: true },
  );

  const motion = useControls(
    "Motion",
    {
      timeSpeed: { value: defaults.timeSpeed, min: 0, max: 0.05, step: 0.001 },
      rotationSpeed: {
        value: defaults.rotationSpeed,
        min: 0,
        max: 0.2,
        step: 0.005,
      },
    },
    { collapsed: true },
  );

  const depth = useControls(
    "Depth",
    {
      depthFadeMinOpacity: {
        value: defaults.depthFadeMinOpacity,
        min: 0,
        max: 1,
        step: 0.01,
      },
      depthSizeNearOffset: {
        value: defaults.depthSizeNearOffset,
        min: 0,
        max: 0.5,
        step: 0.01,
      },
      depthSizeFarOffset: {
        value: defaults.depthSizeFarOffset,
        min: 0,
        max: 0.5,
        step: 0.01,
      },
      depthSizeMinMul: {
        value: defaults.depthSizeMinMul,
        min: 0.2,
        max: 2,
        step: 0.01,
      },
      depthSizeMaxMul: {
        value: defaults.depthSizeMaxMul,
        min: 0.2,
        max: 2,
        step: 0.01,
      },
    },
    { collapsed: true },
  );

  const zones = useControls(
    "Zones",
    {
      frontMinDot: { value: defaults.frontMinDot, min: 0, max: 1, step: 0.01 },
      clusterMaxAngleDeg: {
        value: defaults.clusterMaxAngleDeg,
        min: 5,
        max: 60,
        step: 1,
      },
      blobCenterLean: {
        value: defaults.blobCenterLean,
        min: 0,
        max: 1,
        step: 0.01,
      },
      zoneCenterOffsetRight: {
        value: defaults.zoneCenterOffsetRight,
        min: -0.5,
        max: 0.5,
        step: 0.01,
      },
      hubOffsetSpheres: {
        value: defaults.hubOffsetSpheres,
        min: -5,
        max: 15,
        step: 0.1,
      },
      hubLogoOutsetSpheres: {
        value: defaults.hubLogoOutsetSpheres,
        min: 0,
        max: 20,
        step: 0.5,
      },
      hubConnectionMul: {
        value: defaults.hubConnectionMul,
        min: 0.5,
        max: 3,
        step: 0.05,
      },
    },
    { collapsed: true },
  );

  const lines = useControls(
    "Lines",
    {
      lineWidth: { value: defaults.lineWidth, min: 0.5, max: 6, step: 0.1 },
      lineOpacity: { value: defaults.lineOpacity, min: 0, max: 1, step: 0.01 },
    },
    { collapsed: true },
  );

  const transition = useControls(
    "Transition",
    {
      visualStartFrac: {
        value: BLOB_VISUAL_TRANSITION_START_FRAC,
        min: 0,
        max: 0.5,
        step: 0.01,
        label: "visual start",
      },
      visualEndFrac: {
        value: BLOB_VISUAL_TRANSITION_END_FRAC,
        min: 0.3,
        max: 1,
        step: 0.01,
        label: "visual end",
      },
      interactionStartFrac: {
        value: BLOB_INTERACTION_SECTION1_START_FRAC,
        min: 0,
        max: 0.9,
        step: 0.01,
        label: "interaction start",
      },
      distortPeakMul: {
        value: BLOB_TRANSITION_DISTORT_PEAK_MUL,
        min: 1,
        max: 10,
        step: 0.05,
        label: "distort peak",
      },
    },
    { collapsed: true },
  );

  const coloredDots = useControls(
    "Colored dots",
    {
      coreOpacity: {
        value: DEFAULT_COLORED_DOTS.coreOpacity,
        min: 0,
        max: 1,
        step: 0.01,
      },
      glowScaleMul: {
        value: DEFAULT_COLORED_DOTS.glowScaleMul,
        min: 1,
        max: 5,
        step: 0.05,
      },
      glowOpacity: {
        value: DEFAULT_COLORED_DOTS.glowOpacity,
        min: 0,
        max: 1,
        step: 0.01,
      },
    },
    { collapsed: true },
  );

  const debug = useControls(
    "Debug",
    {
      debugHoverZone: defaults.debugHoverZone,
    },
    { collapsed: true },
  );

  const params = useMemo(
    (): BlobVisualParams => ({
      ...shape,
      ...noise,
      ...motion,
      ...depth,
      ...zones,
      ...lines,
      ...debug,
      time: 0,
    }),
    [shape, noise, motion, depth, zones, lines, debug],
  );

  return {
    setup: setup as BlobSetupId,
    params,
    transition: transition as BlobTransitionTuning,
    coloredDots: coloredDots as BlobColoredDotsTuning,
  };
}
