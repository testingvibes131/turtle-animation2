import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";

/** Peak displacement multiplier at the center of the S1 → S2 scroll blend. */
export const BLOB_TRANSITION_DISTORT_PEAK_MUL = 4.25;

/**
 * 0 at settled S1/S2, 1 at the midpoint of `coloredToGrayMix` (smooth bump).
 */
export function blobTransitionDistortStrength(coloredToGrayMix: number): number {
  const t = Math.min(1, Math.max(0, coloredToGrayMix));
  return 4 * t * (1 - t);
}

/** Push noise harder mid-transition so the blob blooms apart then settles. */
export function applyTransitionDistort(
  params: PerlinBlobParams,
  coloredToGrayMix: number,
  peakMul = BLOB_TRANSITION_DISTORT_PEAK_MUL,
): PerlinBlobParams {
  const strength = blobTransitionDistortStrength(coloredToGrayMix);
  if (strength <= 0.001) return params;

  const amp = 1 + strength * (peakMul - 1);
  const freqMul = 1 + strength * 0.4;

  return {
    ...params,
    noiseScale: params.noiseScale * amp * freqMul,
    displacementDivisor: params.displacementDivisor / amp,
    perlinPeriod: params.perlinPeriod / (1 + strength * 0.25),
  };
}
