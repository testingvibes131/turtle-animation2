"use client";

import { useControls } from "leva";
import { useMemo } from "react";
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
import {
  DEFAULT_SECTION_1_TUNING,
  type BlobSection1Tuning,
} from "@/features/blob-scene/lib/blobSection1Tuning";
import { BLOB_TRANSITION_DISTORT_PEAK_MUL } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";
import {
  DEFAULT_COLORED_DOTS,
  type BlobColoredDotsTuning,
  type BlobControls,
  type BlobTransitionTuning,
  type BlobVisualParams,
} from "@/features/blob-scene/hooks/blobControlTypes";

export function useBlobControlsDev(): BlobControls {
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

  const section1 = useControls(
    "Section 1",
    {
      noiseScale: {
        value: DEFAULT_SECTION_1_TUNING.noiseScale,
        min: 0.5,
        max: 12,
        step: 0.05,
        label: "noise scale",
      },
      displacementDivisor: {
        value: DEFAULT_SECTION_1_TUNING.displacementDivisor,
        min: 5,
        max: 200,
        step: 1,
        label: "displacement",
      },
      perlinPeriod: {
        value: DEFAULT_SECTION_1_TUNING.perlinPeriod,
        min: 0.05,
        max: 2,
        step: 0.01,
        label: "period",
      },
      noiseSlopeMinOpacity: {
        value: DEFAULT_SECTION_1_TUNING.noiseSlopeMinOpacity,
        min: 0,
        max: 1,
        step: 0.01,
        label: "slope min",
      },
      noiseSlopeMaxOpacity: {
        value: DEFAULT_SECTION_1_TUNING.noiseSlopeMaxOpacity,
        min: 0,
        max: 1,
        step: 0.01,
        label: "slope max",
      },
      organicDistortPeak: {
        value: DEFAULT_SECTION_1_TUNING.organicDistortPeak,
        min: 1,
        max: 10,
        step: 0.05,
        label: "spread peak",
      },
      heroScale: {
        value: DEFAULT_SECTION_1_TUNING.heroScale,
        min: 0.5,
        max: 2,
        step: 0.01,
        label: "hero scale",
      },
      heroLeftCrop: {
        value: DEFAULT_SECTION_1_TUNING.heroLeftCrop,
        min: 0,
        max: 0.5,
        step: 0.01,
        label: "left crop",
      },
      heroBelowViewport: {
        value: DEFAULT_SECTION_1_TUNING.heroBelowViewport,
        min: 0,
        max: 1,
        step: 0.01,
        label: "below viewport",
      },
      organicBodyWeight: {
        value: DEFAULT_SECTION_1_TUNING.organicBodyWeight,
        min: 0,
        max: 1,
        step: 0.01,
        label: "body weight",
      },
      organicFlowWeight: {
        value: DEFAULT_SECTION_1_TUNING.organicFlowWeight,
        min: 0,
        max: 1,
        step: 0.01,
        label: "flow weight",
      },
      organicWarp: {
        value: DEFAULT_SECTION_1_TUNING.organicWarp,
        min: 0,
        max: 1,
        step: 0.01,
        label: "warp",
      },
      organicAmpMul: {
        value: DEFAULT_SECTION_1_TUNING.organicAmpMul,
        min: 0.5,
        max: 3,
        step: 0.01,
        label: "amp mul",
      },
    },
    { collapsed: false },
  );

  const noise = useControls(
    "Noise (Section 2)",
    {
      noiseScale: { value: defaults.noiseScale, min: 0.5, max: 12, step: 0.05 },
      displacementDivisor: {
        value: defaults.displacementDivisor,
        min: 5,
        max: 200,
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
        label: "peak opacity",
      },
      glowScaleMul: {
        value: DEFAULT_COLORED_DOTS.glowScaleMul,
        min: 1,
        max: 6,
        step: 0.05,
        label: "spark radius",
      },
      glowOpacity: {
        value: DEFAULT_COLORED_DOTS.glowOpacity,
        min: 0,
        max: 1,
        step: 0.01,
        label: "glow opacity",
      },
      sparkRadiusMul: {
        value: DEFAULT_COLORED_DOTS.sparkRadiusMul,
        min: 0.5,
        max: 3,
        step: 0.01,
        label: "spark size mul",
      },
      haloRadiusMul: {
        value: DEFAULT_COLORED_DOTS.haloRadiusMul,
        min: 1,
        max: 4,
        step: 0.01,
        label: "halo size mul",
      },
      colorDim: {
        value: DEFAULT_COLORED_DOTS.colorDim,
        min: 0.2,
        max: 1.2,
        step: 0.01,
        label: "color dim",
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
    section1: section1 as BlobSection1Tuning,
    transition: transition as BlobTransitionTuning,
    coloredDots: coloredDots as BlobColoredDotsTuning,
  };
}
