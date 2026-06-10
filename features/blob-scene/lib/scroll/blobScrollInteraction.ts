import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";

/** Scroll-progress remap for blob motion (hero → section 2). */
export const BLOB_INTERACTION_SECTION1_START_FRAC = 0;

/** Visual transition begins at first scroll (fraction of hero). */
export const BLOB_VISUAL_TRANSITION_START_FRAC = 0;

/** Visual transition completes here (after interaction, for a long blend). */
export const BLOB_VISUAL_TRANSITION_END_FRAC = 0.78;

/** Per-frame ease rate for scroll-driven blob motion + dispersion. Higher tracks
 *  scroll more tightly (accurate); lower is smoother. Smooths re-render jitter. */
export const BLOB_SCROLL_EASE_RATE = 12;

const HANDOFF_EPS_PX = 1;

export type BlobScrollMetrics = {
  scrolled: number;
  heroScroll: number;
  section2Scroll: number;
};

export type BlobScrollTuning = {
  visualStartFrac?: number;
  visualEndFrac?: number;
  distortPeakMul?: number;
};

/**
 * Shared hero → section 2 boundary.
 * Section 1 cap wave ends here; section 2 hover begins here (desktop).
 */
export function blobPastHeroHandoff({
  scrolled,
  heroScroll,
}: BlobScrollMetrics): boolean {
  return scrolled >= heroScroll - HANDOFF_EPS_PX;
}

/** True while the hero (section 1) is still the active scroll stage. */
export function blobInSection1(metrics: BlobScrollMetrics): boolean {
  return !blobPastHeroHandoff(metrics);
}

/** True in section 2 while the blob block is still on screen. */
export function blobInSection2BlobBlock(metrics: BlobScrollMetrics): boolean {
  const { scrolled, heroScroll, section2Scroll } = metrics;
  const section2End = heroScroll + section2Scroll;
  return (
    blobPastHeroHandoff(metrics) && scrolled < section2End - HANDOFF_EPS_PX
  );
}

/** Fraction of hero scroll at which desktop hover turns on — slightly before the
 *  hero→section-2 handoff, so users can start exploring as the blob settles. */
export const BLOB_HOVER_EARLY_START_FRAC = 0.85;

/** Desktop hover — enabled from late hero (BLOB_HOVER_EARLY_START_FRAC) until the
 *  section 2 scroll (including the hold runway) ends. */
export function blobInteractionEnabledFromScroll(
  metrics: BlobScrollMetrics,
): boolean {
  const { scrolled, heroScroll, section2Scroll } = metrics;
  const section2End = heroScroll + section2Scroll;
  return (
    scrolled >= heroScroll * BLOB_HOVER_EARLY_START_FRAC &&
    scrolled < section2End - HANDOFF_EPS_PX
  );
}

/** Runtime canvas mode — always connected lines (gray dots). */
export function blobRuntimeSetup(): BlobSetupId {
  return "connected-lines";
}
