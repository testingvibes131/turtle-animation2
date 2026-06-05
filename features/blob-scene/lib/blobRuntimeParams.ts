import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import {
  blobParamsForSetup,
  type BlobSetupId,
} from "@/features/blob-scene/lib/blobVisualPresets";

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const PARAM_KEYS = [
  "radius",
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

/**
 * Option 1: connected-lines preset only.
 * Option 2: S1 → S2 param blend follows `coloredToGrayMix` (not the mid-hero runtime flip).
 */
export function resolveBlobRuntimeParams(
  levaParams: BlobVisualParams,
  levaSetup: BlobSetupId,
  coloredToGrayMix: number,
): BlobVisualParams {
  const section1 = blobParamsForSetup("section-1-blob");
  const section2 = blobParamsForSetup("connected-lines");

  if (levaSetup !== "section-1-blob") {
    return {
      ...levaParams,
      ...pickFields(section2, PARAM_KEYS),
      time: 0,
    };
  }

  const mix = smoothstep01(coloredToGrayMix);
  if (mix >= 1) {
    return {
      ...levaParams,
      ...pickFields(section2, PARAM_KEYS),
      time: 0,
    };
  }

  if (mix <= 0) {
    return {
      ...levaParams,
      ...pickFields(section1, PARAM_KEYS),
      time: 0,
    };
  }

  const blended = Object.fromEntries(
    PARAM_KEYS.map((key) => [
      key,
      lerp(section1[key] as number, section2[key] as number, mix),
    ]),
  ) as Pick<BlobVisualParams, (typeof PARAM_KEYS)[number]>;

  return {
    ...levaParams,
    ...blended,
    time: 0,
  };
}
