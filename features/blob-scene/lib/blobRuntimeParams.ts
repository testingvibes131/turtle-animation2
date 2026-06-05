import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import {
  blobVisualParamsForSection1,
  type BlobSection1Tuning,
} from "@/features/blob-scene/lib/blobSection1Tuning";
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

const ORGANIC_KEYS = [
  "organicBodyWeight",
  "organicFlowWeight",
  "organicWarp",
  "organicAmpMul",
] as const satisfies readonly (keyof BlobSection1Tuning)[];

function organicFieldsForMix(
  section1: BlobSection1Tuning,
  mix: number,
): Pick<BlobVisualParams, (typeof ORGANIC_KEYS)[number]> {
  const inv = 1 - mix;
  return {
    organicBodyWeight: section1.organicBodyWeight * inv,
    organicFlowWeight: section1.organicFlowWeight * inv,
    organicWarp: section1.organicWarp * inv,
    organicAmpMul: 1 + (section1.organicAmpMul - 1) * inv,
  };
}

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
 * Option 2: Leva Section 1 panel → S2 preset blend via `coloredToGrayMix`.
 */
export function resolveBlobRuntimeParams(
  levaParams: BlobVisualParams,
  levaSetup: BlobSetupId,
  coloredToGrayMix: number,
  section1: BlobSection1Tuning,
): BlobVisualParams {
  const section1Params = blobVisualParamsForSection1(levaParams, section1);
  const section2 = {
    ...levaParams,
    ...pickFields(blobParamsForSetup("connected-lines"), PARAM_KEYS),
  };

  if (levaSetup !== "section-1-blob") {
    return { ...section2, time: 0 };
  }

  const mix = smoothstep01(coloredToGrayMix);
  if (mix >= 1) {
    return { ...section2, time: 0 };
  }

  if (mix <= 0) {
    return { ...section1Params, time: 0 };
  }

  const blended = Object.fromEntries(
    PARAM_KEYS.map((key) => [
      key,
      lerp(
        section1Params[key] as number,
        section2[key] as number,
        mix,
      ),
    ]),
  ) as Pick<BlobVisualParams, (typeof PARAM_KEYS)[number]>;

  return {
    ...levaParams,
    ...blended,
    ...organicFieldsForMix(section1, mix),
    time: 0,
  };
}
