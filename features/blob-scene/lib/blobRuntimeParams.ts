import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { SECTION_2_PARAMS } from "@/features/blob-scene/lib/blobVisualPresets";

const PARAM_KEYS = [
  "detail",
  "noiseScale",
  "displacementDivisor",
  "perlinPeriod",
  "timeSpeed",
  "pointSizeRatio",
  "rotationSpeed",
  "depthFadeMinOpacity",
  "depthSizeNearOffset",
  "depthSizeFarOffset",
  "depthSizeMinMul",
  "depthSizeMaxMul",
  "noiseSlopeMinOpacity",
  "noiseSlopeMaxOpacity",
  "frontMinDot",
  "clusterMaxAngleDeg",
  "blobCenterLean",
  "zoneCenterOffsetRight",
  "hubOffsetSpheres",
  "hubLogoOutsetSpheres",
  "hubConnectionMul",
  "lineWidth",
  "lineOpacity",
] as const satisfies readonly (keyof BlobVisualParams)[];

function pickFields<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    out[key] = source[key];
  }
  return out;
}

/** Merge Leva overrides with the section 2 connected-lines preset. */
export function resolveBlobRuntimeParams(
  levaParams: BlobVisualParams,
): BlobVisualParams {
  return {
    ...levaParams,
    ...pickFields(SECTION_2_PARAMS, PARAM_KEYS),
    time: 0,
  };
}
