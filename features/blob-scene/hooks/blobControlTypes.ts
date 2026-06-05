import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";
import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";
import type { BlobSection1Tuning } from "@/features/blob-scene/lib/blobSection1Tuning";

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
  sparkRadiusMul: number;
  haloRadiusMul: number;
  colorDim: number;
};

export type BlobControls = {
  setup: BlobSetupId;
  params: BlobVisualParams;
  section1: BlobSection1Tuning;
  transition: BlobTransitionTuning;
  coloredDots: BlobColoredDotsTuning;
};

export const DEFAULT_COLORED_DOTS: BlobColoredDotsTuning = {
  coreOpacity: 0.62,
  glowScaleMul: 4.85,
  glowOpacity: 0.42,
  sparkRadiusMul: 1.68,
  haloRadiusMul: 1.9,
  colorDim: 0.86,
};
