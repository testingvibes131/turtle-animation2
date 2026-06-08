"use client";

import { useControls } from "leva";
import { useMemo } from "react";
import { SECTION_2_PARAMS } from "@/features/blob-scene/lib/blobVisualPresets";
import {
  BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC,
  BLOB_VISUAL_TRANSITION_END_FRAC,
  BLOB_VISUAL_TRANSITION_START_FRAC,
} from "@/features/blob-scene/lib/scroll/blobScrollInteraction";
import {
  type BlobControls,
  type BlobTransitionTuning,
  type BlobVisualParams,
} from "@/features/blob-scene/hooks/blobControlTypes";

export function useBlobControlsDev(): BlobControls {
  const defaults = SECTION_2_PARAMS;

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
        value: BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC,
        min: 0,
        max: 1,
        step: 0.01,
        label: "viewport bottom @ section 2",
      },
      distortPeakMul: {
        value: 1,
        min: 1,
        max: 10,
        step: 0.05,
        label: "distort peak",
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
    params,
    transition: transition as BlobTransitionTuning,
  };
}
