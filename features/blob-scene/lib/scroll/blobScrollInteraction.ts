import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";

/** Scroll-progress remap for blob motion (hero → section 2). */
export const BLOB_INTERACTION_SECTION1_START_FRAC = 0;

/** Visual transition begins at first scroll (fraction of hero). */
export const BLOB_VISUAL_TRANSITION_START_FRAC = 0;

/** Visual transition completes here (after interaction, for a long blend). */
export const BLOB_VISUAL_TRANSITION_END_FRAC = 0.78;

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

/** Desktop hover — same handoff as section 1 ambient, until section 2 scroll ends. */
export function blobInteractionEnabledFromScroll(
  metrics: BlobScrollMetrics,
): boolean {
  return blobInSection2BlobBlock(metrics);
}

/** Runtime canvas mode — always connected lines (gray dots). */
export function blobRuntimeSetup(): BlobSetupId {
  return "connected-lines";
}
