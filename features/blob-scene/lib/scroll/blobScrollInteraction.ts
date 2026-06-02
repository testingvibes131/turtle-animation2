/** Hover + scroll metrics for the hero → section 2 blob block. */

/**
 * Hover starts after this fraction of section 1 (hero) has scrolled past.
 * 0.5 = second half of the hero.
 */
export const BLOB_INTERACTION_SECTION1_START_FRAC = 0.5;

export type BlobScrollMetrics = {
  scrolled: number;
  heroScroll: number;
  section2Scroll: number;
};

/** Scroll offset where pointer hover turns on (mid-hero at 0.5). */
export function blobInteractionStartScroll({
  heroScroll,
}: Pick<BlobScrollMetrics, "heroScroll">): number {
  return heroScroll * BLOB_INTERACTION_SECTION1_START_FRAC;
}

export function blobInteractionEnabledFromScroll(metrics: BlobScrollMetrics): boolean {
  return metrics.scrolled >= blobInteractionStartScroll(metrics) - 1;
}
