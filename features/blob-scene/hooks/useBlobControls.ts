"use client";

import { useControls } from "leva";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";
import {
  BLOB_SETUP_OPTIONS,
  type BlobSetupId,
} from "@/features/blob-scene/lib/blobVisualPresets";

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

export type BlobControls = {
  setup: BlobSetupId;
};

export function useBlobControls(): BlobControls {
  const { setup } = useControls("Setup", {
    setup: {
      value: "section-1-blob" satisfies BlobSetupId,
      options: BLOB_SETUP_OPTIONS,
    },
  });

  return { setup: setup as BlobSetupId };
}
