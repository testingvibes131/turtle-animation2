import type { BlobVisualParams } from "@/features/blob-scene/hooks/blobControlTypes";

/** Shared blob / motion / depth tuning (section-agnostic). */
const BASE = {
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
  depthSizeFarOffset: 0.1,
  depthSizeMinMul: 0.76,
  depthSizeMaxMul: 1,
  noiseSlopeMinOpacity: 0.42,
  noiseSlopeMaxOpacity: 1,
  debugHoverZone: false,
} as const;

/** Connected lines / curator overlay tuning. */
export const SECTION_2_PARAMS = {
  ...BASE,
  frontMinDot: 0.35,
  clusterMaxAngleDeg: 22,
  blobCenterLean: 0.4,
  zoneCenterOffsetRight: 0.3,
  hubOffsetSpheres: 0,
  hubLogoOutsetSpheres: 10,
  hubConnectionMul: 1.5,
  lineWidth: 2,
  lineOpacity: 0.85,
} as const satisfies Omit<BlobVisualParams, "time">;

/** Runtime canvas mode — always connected lines. */
export type BlobSetupId = "connected-lines";
