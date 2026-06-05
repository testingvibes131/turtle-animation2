import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import {
  BLOB_HERO_BELOW_VIEWPORT_FRACTION,
  BLOB_HERO_LEFT_CROP_FRACTION,
  BLOB_HERO_SCALE,
} from "@/features/blob-scene/lib/geometry/blobViewportOffset";
import { BLOB_ORGANIC_TRANSITION_DISTORT_PEAK_MUL } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";
import { SECTION_1_BLOB_PARAMS } from "@/features/blob-scene/lib/blobVisualPresets";

/** Leva-tunable Section 1 hero (Option 2 only). Section 2 stays on preset. */
export type BlobSection1Tuning = {
  noiseScale: number;
  displacementDivisor: number;
  perlinPeriod: number;
  noiseSlopeMinOpacity: number;
  noiseSlopeMaxOpacity: number;
  organicDistortPeak: number;
  heroScale: number;
  heroLeftCrop: number;
  heroBelowViewport: number;
  organicBodyWeight: number;
  organicFlowWeight: number;
  organicWarp: number;
  organicAmpMul: number;
};

export const DEFAULT_SECTION_1_TUNING: BlobSection1Tuning = {
  noiseScale: SECTION_1_BLOB_PARAMS.noiseScale,
  displacementDivisor: SECTION_1_BLOB_PARAMS.displacementDivisor,
  perlinPeriod: SECTION_1_BLOB_PARAMS.perlinPeriod,
  noiseSlopeMinOpacity: SECTION_1_BLOB_PARAMS.noiseSlopeMinOpacity,
  noiseSlopeMaxOpacity: SECTION_1_BLOB_PARAMS.noiseSlopeMaxOpacity,
  organicDistortPeak: BLOB_ORGANIC_TRANSITION_DISTORT_PEAK_MUL,
  heroScale: BLOB_HERO_SCALE,
  heroLeftCrop: BLOB_HERO_LEFT_CROP_FRACTION,
  heroBelowViewport: BLOB_HERO_BELOW_VIEWPORT_FRACTION,
  organicBodyWeight: 0.68,
  organicFlowWeight: 0.68,
  organicWarp: 0.36,
  organicAmpMul: 3,
};

const SECTION_1_PARAM_KEYS = [
  "noiseScale",
  "displacementDivisor",
  "perlinPeriod",
  "noiseSlopeMinOpacity",
  "noiseSlopeMaxOpacity",
] as const satisfies readonly (keyof BlobSection1Tuning)[];

/** Merge shared leva params with Section 1 noise / organic overrides. */
export function blobVisualParamsForSection1(
  levaParams: BlobVisualParams,
  section1: BlobSection1Tuning,
): BlobVisualParams {
  return {
    ...levaParams,
    noiseScale: section1.noiseScale,
    displacementDivisor: section1.displacementDivisor,
    perlinPeriod: section1.perlinPeriod,
    noiseSlopeMinOpacity: section1.noiseSlopeMinOpacity,
    noiseSlopeMaxOpacity: section1.noiseSlopeMaxOpacity,
    organicBodyWeight: section1.organicBodyWeight,
    organicFlowWeight: section1.organicFlowWeight,
    organicWarp: section1.organicWarp,
    organicAmpMul: section1.organicAmpMul,
  };
}

export function pickSection1NoiseFields(
  section1: BlobSection1Tuning,
): Pick<BlobVisualParams, (typeof SECTION_1_PARAM_KEYS)[number]> {
  return {
    noiseScale: section1.noiseScale,
    displacementDivisor: section1.displacementDivisor,
    perlinPeriod: section1.perlinPeriod,
    noiseSlopeMinOpacity: section1.noiseSlopeMinOpacity,
    noiseSlopeMaxOpacity: section1.noiseSlopeMaxOpacity,
  };
}
