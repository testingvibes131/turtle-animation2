import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";

/** Hero auto-demo: curators at catalog indices 0–3 (Aave → YO). */
export const HERO_SHOWCASE_CURATORS = CURATORS.slice(0, 4);

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
export const HERO_SHOWCASE_MAX_CONNECTIONS = 5;

/** Max hub → target angle on the sphere (degrees). */
export const HERO_SHOWCASE_CLUSTER_MAX_ANGLE_DEG = 18;

/** Min angle between spoke endpoints so they don’t bunch on the hub. */
export const HERO_SHOWCASE_MIN_SPOKE_SEPARATION_DEG = 11;

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

/** Hero showcase while scroll progress is within this of section 1 top. */
export const HERO_SHOWCASE_MAX_PROGRESS = 0.02;

export function heroShowcaseCuratorIndex(elapsedMs: number): number {
  const n = HERO_SHOWCASE_CURATORS.length;
  if (n === 0) return 0;
  return Math.floor(elapsedMs / HERO_SHOWCASE_INTERVAL_MS) % n;
}

export function heroShowcaseCuratorName(elapsedMs: number): string {
  return HERO_SHOWCASE_CURATORS[heroShowcaseCuratorIndex(elapsedMs)]!.name;
}

export function blobHeroShowcaseActive(
  scrollProgress: number,
  interactionEnabled: boolean,
): boolean {
  if (interactionEnabled) return false;
  return scrollProgress <= HERO_SHOWCASE_MAX_PROGRESS;
}
