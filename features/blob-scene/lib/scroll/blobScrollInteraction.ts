import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";

/** Hover + scroll metrics for the hero → section 2 blob block. */

/** Scroll-progress remap for blob motion (hero → section 2). */
export const BLOB_INTERACTION_SECTION1_START_FRAC = 0;

/**
 * Hover when the viewport bottom crosses this fraction down section 2 (from its top).
 * 2/3 = bottom of screen reaches the two-thirds line of section 2.
 */
export const BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC = 2 / 3;

/** Visual transition begins at first scroll (fraction of hero). */
export const BLOB_VISUAL_TRANSITION_START_FRAC = 0;

/** Visual transition completes here (after interaction, for a long blend). */
export const BLOB_VISUAL_TRANSITION_END_FRAC = 0.78;

export type BlobScrollMetrics = {
  scrolled: number;
  heroScroll: number;
  section2Scroll: number;
};

export type BlobScrollTuning = {
  visualStartFrac?: number;
  visualEndFrac?: number;
  /** Fraction down section 2 where viewport bottom must reach (0.67 = two-thirds). */
  interactionStartFrac?: number;
};

function siteHeaderBottomPx(): number {
  if (typeof document === "undefined") return 76;
  const header = document.querySelector<HTMLElement>(".site-header");
  return header?.getBoundingClientRect().bottom ?? 76;
}

function viewportHeightPx(): number {
  if (typeof window === "undefined") return 800;
  return window.innerHeight;
}

/** Hover on once viewport bottom has reached `sectionFrac` down section 2. */
export function blobInteractionEnabledFromSection2Viewport(
  section2: HTMLElement,
  sectionFrac = BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC,
): boolean {
  const headerBottom = siteHeaderBottomPx();
  const viewportBottom = viewportHeightPx();
  const { top, bottom, height } = section2.getBoundingClientRect();

  if (height <= 0 || bottom <= headerBottom) return false;

  const triggerY = top + height * sectionFrac;
  return viewportBottom >= triggerY;
}

/** Scroll-offset fallback when the section node is unavailable. */
export function blobInteractionEnabledFromScrollMetrics(
  metrics: BlobScrollMetrics,
  tuning: BlobScrollTuning = {},
): boolean {
  const { scrolled, heroScroll, section2Scroll } = metrics;
  const sectionFrac =
    tuning.interactionStartFrac ?? BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC;
  const section2End = heroScroll + section2Scroll;
  const threshold =
    heroScroll + section2Scroll * sectionFrac - viewportHeightPx();
  return scrolled >= threshold - 1 && scrolled < section2End - 1;
}

/** True while the hero (section 1) is still the active scroll stage. */
export function blobInSection1({ scrolled, heroScroll }: BlobScrollMetrics): boolean {
  return scrolled < heroScroll - 1;
}

export function blobInteractionEnabledFromScroll(
  metrics: BlobScrollMetrics,
  tuning: BlobScrollTuning = {},
  section2?: HTMLElement | null,
): boolean {
  const sectionFrac =
    tuning.interactionStartFrac ?? BLOB_INTERACTION_SECTION2_VIEWPORT_BOTTOM_FRAC;
  if (section2) {
    return blobInteractionEnabledFromSection2Viewport(section2, sectionFrac);
  }
  return blobInteractionEnabledFromScrollMetrics(metrics, tuning);
}

/** Runtime canvas mode — always connected lines (gray dots). */
export function blobRuntimeSetup(): BlobSetupId {
  return "connected-lines";
}
