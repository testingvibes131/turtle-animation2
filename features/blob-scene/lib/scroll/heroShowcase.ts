import { CURATORS, type CuratorDef } from "@/features/blob-scene/lib/curators/catalog";

/** Hero auto-demo cycles every curator in catalog order. */
export const HERO_SHOWCASE_CURATORS = CURATORS;

/**
 * Hub anchor on the camera cap (0° = right, 90° = top).
 * Top-right of the visible hero crop.
 */
export const HERO_SHOWCASE_CLOCK_DEG = 45;

export const HERO_SHOWCASE_INTERVAL_S = 5;

export const HERO_SHOWCASE_INTERVAL_MS =
  HERO_SHOWCASE_INTERVAL_S * 1000;

/** Plexus spokes per curator step (random in [min, max]). */
export const HERO_SHOWCASE_MIN_CONNECTIONS = 3;
export const HERO_SHOWCASE_MAX_CONNECTIONS = 6;

/** Max hub → target angle on the sphere (degrees). */
export const HERO_SHOWCASE_CLUSTER_MAX_ANGLE_DEG = 20;

/** Min angle between spoke endpoints (prevents clumped lines/dots). */
export const HERO_SHOWCASE_MIN_SPOKE_SEPARATION_DEG = 17;

export function heroShowcaseConnectionCount(): number {
  const span =
    HERO_SHOWCASE_MAX_CONNECTIONS - HERO_SHOWCASE_MIN_CONNECTIONS + 1;
  return (
    HERO_SHOWCASE_MIN_CONNECTIONS +
    Math.floor(Math.random() * span)
  );
}

/** Keep hub + spoke off the cap rim in the hero crop. */
export const HERO_SHOWCASE_FRONT_MIN_DOT = 0.55;

/** Section 1 hero demo: multiplier on `hubLogoOutsetSpheres`. */
export const HERO_SHOWCASE_LOGO_OUTSET_MUL = 1.5;

/** Section 2 interactive hover: multiplier on `hubLogoOutsetSpheres`. */
export const SECTION_2_LOGO_OUTSET_MUL = 1.5;

/** Section 1: connected dot + outer ring vs section-2 member marker scale. */
export const HERO_SHOWCASE_CONNECTED_MARKER_SCALE_MUL = 1.25;

/** Hero showcase while scroll progress is within this of section 1 top. */
export const HERO_SHOWCASE_MAX_PROGRESS = 0.02;

export function heroShowcaseCuratorIndex(elapsedMs: number): number {
  const n = HERO_SHOWCASE_CURATORS.length;
  if (n === 0) return 0;
  return Math.floor(elapsedMs / HERO_SHOWCASE_INTERVAL_MS) % n;
}

export function heroShowcaseCurator(elapsedMs: number): CuratorDef {
  return HERO_SHOWCASE_CURATORS[heroShowcaseCuratorIndex(elapsedMs)]!;
}

export function heroShowcaseCuratorName(elapsedMs: number): string {
  return heroShowcaseCurator(elapsedMs).name;
}

export function blobHeroShowcaseActive(
  scrollProgress: number,
  interactionEnabled: boolean,
): boolean {
  if (interactionEnabled) return false;
  return scrollProgress <= HERO_SHOWCASE_MAX_PROGRESS;
}
