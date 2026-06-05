import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";

/** Displacement multiplier at scroll start (spread-out hero state). */
export const BLOB_TRANSITION_DISTORT_PEAK_MUL = 4.25;

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * 1 at scroll start (spread), 0 once the S1 → S2 blend completes (compact blob).
 * One-way — no mid-scroll bloom that settles back.
 */
export function blobTransitionDistortStrength(coloredToGrayMix: number): number {
  const t = Math.min(1, Math.max(0, coloredToGrayMix));
  return 1 - smoothstep01(t);
}

/** Ease noise from spread-out toward settled blob as scroll progresses. */
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
