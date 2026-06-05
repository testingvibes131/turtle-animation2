import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";

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

/** Option 1 — section 2 hover interaction with hub plexus lines. */
export const CONNECTED_LINES_PARAMS = {
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

/** Option 2 — section 1 colored blob only; section 2 matches connected-lines. */
export const SECTION_1_BLOB_PARAMS = {
  ...BASE,
  frontMinDot: 0.55,
  clusterMaxAngleDeg: 20,
  blobCenterLean: 0.4,
  zoneCenterOffsetRight: 0.3,
  hubOffsetSpheres: 0,
  hubLogoOutsetSpheres: 10,
  hubConnectionMul: 1.5,
  lineWidth: 2,
  lineOpacity: 0.85,
} as const satisfies Omit<BlobVisualParams, "time">;

export type BlobSetupId = "connected-lines" | "section-1-blob";

export type BlobSetupConfig = {
  id: BlobSetupId;
  label: string;
  params: Omit<BlobVisualParams, "time">;
};

export const BLOB_SETUP_OPTIONS = {
  "Option 1 — Connected lines": "connected-lines",
  "Option 2 — Section 1 blob": "section-1-blob",
} as const satisfies Record<string, BlobSetupId>;

export const BLOB_SETUP_CONFIG: Record<BlobSetupId, BlobSetupConfig> = {
  "connected-lines": {
    id: "connected-lines",
    label: "Connected lines",
    params: CONNECTED_LINES_PARAMS,
  },
  "section-1-blob": {
    id: "section-1-blob",
    label: "Section 1 blob",
    params: SECTION_1_BLOB_PARAMS,
  },
};

export function blobParamsForSetup(
  setup: BlobSetupId,
): Omit<BlobVisualParams, "time"> {
  return BLOB_SETUP_CONFIG[setup].params;
}
