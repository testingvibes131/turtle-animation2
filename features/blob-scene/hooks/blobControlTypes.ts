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

export type BlobTransitionTuning = {
  visualStartFrac: number;
  visualEndFrac: number;
  interactionStartFrac: number;
  distortPeakMul: number;
};

export type BlobControls = {
  params: BlobVisualParams;
  transition: BlobTransitionTuning;
};
