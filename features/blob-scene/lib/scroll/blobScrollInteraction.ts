import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";

/** Hover + scroll metrics for the hero → section 2 blob block. */

/**
 * Hover starts after this fraction of section 1 (hero) has scrolled past.
 * 0.5 = second half of the hero.
 */
export const BLOB_INTERACTION_SECTION1_START_FRAC = 0.5;

/** Option 2 visual transition begins at first scroll (fraction of hero). */
export const BLOB_VISUAL_TRANSITION_START_FRAC = 0;

/** Option 2 visual transition completes here (after interaction, for a long blend). */
export const BLOB_VISUAL_TRANSITION_END_FRAC = 0.78;

export type BlobScrollMetrics = {
  scrolled: number;
  heroScroll: number;
  section2Scroll: number;
};

export type BlobScrollTuning = {
  visualStartFrac?: number;
  visualEndFrac?: number;
  interactionStartFrac?: number;
};

/** Scroll offset where pointer hover turns on (mid-hero at 0.5). */
export function blobInteractionStartScroll(
  { heroScroll }: Pick<BlobScrollMetrics, "heroScroll">,
  interactionStartFrac = BLOB_INTERACTION_SECTION1_START_FRAC,
): number {
  return heroScroll * interactionStartFrac;
}

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Option 1 enables the S2 experience from here (shared boundary for Option 2). */
export function blobPastSection1Threshold(
  metrics: BlobScrollMetrics,
  interactionStartFrac = BLOB_INTERACTION_SECTION1_START_FRAC,
): boolean {
  return (
    metrics.scrolled >=
    blobInteractionStartScroll(metrics, interactionStartFrac) - 1
  );
}

/**
 * Option 2 dot palette: 0 = full color (S1), 1 = full gray (S2).
 * Starts on the first pixel of scroll; runs most of the way through the hero.
 * Option 1 is always 1.
 */
export function blobColoredToGrayMix(
  levaSetup: BlobSetupId,
  metrics: BlobScrollMetrics,
  tuning: BlobScrollTuning = {},
): number {
  if (levaSetup !== "section-1-blob") return 1;

  const visualStartFrac =
    tuning.visualStartFrac ?? BLOB_VISUAL_TRANSITION_START_FRAC;
  const visualEndFrac =
    tuning.visualEndFrac ?? BLOB_VISUAL_TRANSITION_END_FRAC;
  const start = metrics.heroScroll * visualStartFrac;
  const end = metrics.heroScroll * visualEndFrac;
  const span = Math.max(end - start, 1);
  const t = (metrics.scrolled - start) / span;
  return smoothstep01(t);
}

/** @param setup Runtime setup from {@link blobRuntimeSetup}. */
export function blobInteractionEnabledFromScroll(
  metrics: BlobScrollMetrics,
  _levaSetup: BlobSetupId = "connected-lines",
  tuning: BlobScrollTuning = {},
): boolean {
  return blobPastSection1Threshold(
    metrics,
    tuning.interactionStartFrac ?? BLOB_INTERACTION_SECTION1_START_FRAC,
  );
}

/**
 * Leva setup + scroll → runtime canvas mode.
 * Option 2 flips at the shared interaction threshold (mid-hero).
 */
export function blobRuntimeSetup(
  levaSetup: BlobSetupId,
  metrics: BlobScrollMetrics,
  tuning: BlobScrollTuning = {},
): BlobSetupId {
  if (levaSetup !== "section-1-blob") return "connected-lines";
  return blobPastSection1Threshold(
    metrics,
    tuning.interactionStartFrac ?? BLOB_INTERACTION_SECTION1_START_FRAC,
  )
    ? "connected-lines"
    : "section-1-blob";
}
