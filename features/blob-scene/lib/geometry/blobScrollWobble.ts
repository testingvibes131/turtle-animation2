import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";

/** Scroll delta (px) that roughly saturates wobble strength to 1. */
export const BLOB_SCROLL_WOBBLE_DELTA_REF = 28;

/** Noise time offset amplitude at full wobble strength. */
export const BLOB_SCROLL_WOBBLE_TIME_AMP = 0.14;

/** Extra noiseScale at full wobble strength. */
export const BLOB_SCROLL_WOBBLE_NOISE_MUL = 0.2;

/** Shortens perlin period while scrolling for livelier displacement. */
export const BLOB_SCROLL_WOBBLE_PERIOD_MUL = 0.35;

export function scrollWobbleStrengthFromDelta(
  deltaPx: number,
  current = 0,
): number {
  const boost = Math.min(1, deltaPx / BLOB_SCROLL_WOBBLE_DELTA_REF);
  return Math.min(1, current * 0.72 + boost * 0.55);
}

/** Layered sine drift through the noise field while scrolling. */
export function applyScrollWobble(
  params: PerlinBlobParams,
  strength: number,
  phase: number,
): { params: PerlinBlobParams; phase: number } {
  if (strength <= 0.001) return { params, phase };

  const nextPhase = phase + strength * 0.38;
  const wobble =
    Math.sin(nextPhase * 2.3) * 0.6 +
    Math.sin(nextPhase * 3.7 + 1.2) * 0.4;

  return {
    phase: nextPhase,
    params: {
      ...params,
      time: params.time + wobble * BLOB_SCROLL_WOBBLE_TIME_AMP * strength,
      noiseScale:
        params.noiseScale *
        (1 + strength * BLOB_SCROLL_WOBBLE_NOISE_MUL + wobble * 0.04 * strength),
      perlinPeriod:
        params.perlinPeriod / (1 + strength * BLOB_SCROLL_WOBBLE_PERIOD_MUL),
    },
  };
}
