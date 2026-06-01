import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";

/** Hover turns on after this fraction of section 2 has scrolled in. */
export const BLOB_INTERACTION_SECTION2_FRAC = 0.5;

/**
 * Tour completes at this fraction of the scroll path to the hover threshold
 * (0.5 = halfway from block top → hover line).
 */
export const BLOB_SHOWCASE_FRAC_OF_INTERACTION_PATH = 0.5;

export type BlobScrollMetrics = {
  scrolled: number;
  heroScroll: number;
  section2Scroll: number;
};

export function blobInteractionEndScroll({
  heroScroll,
  section2Scroll,
}: Pick<BlobScrollMetrics, "heroScroll" | "section2Scroll">): number {
  return heroScroll + section2Scroll * BLOB_INTERACTION_SECTION2_FRAC;
}

/** Tour ends 50% along the way to the hover scroll offset (not % of section 2 alone). */
export function blobShowcaseEndScroll(
  metrics: BlobScrollMetrics,
): number {
  return (
    blobInteractionEndScroll(metrics) * BLOB_SHOWCASE_FRAC_OF_INTERACTION_PATH
  );
}

/**
 * 0 at blob top → 1 when the tour ends (halfway to hover threshold).
 */
export function blobShowcaseProgress(metrics: BlobScrollMetrics): number {
  const end = blobShowcaseEndScroll(metrics);
  if (end <= 0) return 0;
  return Math.min(1, Math.max(0, metrics.scrolled / end));
}

export function blobShowcaseTourCompleteFromScroll(
  metrics: BlobScrollMetrics,
): boolean {
  return metrics.scrolled >= blobShowcaseEndScroll(metrics) - 1;
}

/** Hover allowed once the auto-tour ends (same scroll line). */
export function blobInteractionEnabledFromScroll(metrics: BlobScrollMetrics): boolean {
  return blobShowcaseTourCompleteFromScroll(metrics);
}

/** Auto-tour only before the end line — then blob is clear for manual hover. */
export function blobShowcaseActiveFromScroll(metrics: BlobScrollMetrics): boolean {
  return metrics.scrolled > 0 && !blobShowcaseTourCompleteFromScroll(metrics);
}

/** Equal bands over the tour only — all curators before showcase end scroll. */
export function curatorIndexForShowcaseProgress(progress: number): number {
  const n = CURATORS.length;
  if (n === 0) return 0;
  const t = Math.min(1, Math.max(0, progress));
  if (t <= 0) return 0;
  if (t >= 1) return n - 1;
  return Math.min(n - 1, Math.floor(t * n));
}
