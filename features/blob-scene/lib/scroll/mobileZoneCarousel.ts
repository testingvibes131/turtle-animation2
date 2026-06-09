/** Hold each curator highlight before advancing. */
export const MOBILE_ZONE_DWELL_SEC = 3.4;

/** Ease-in duration when a zone becomes active. */
export const MOBILE_ZONE_FADE_SEC = 0.45;

/** Exponential approach rate during fade-in (higher = snappier). */
export const MOBILE_ZONE_FADE_RATE = 9;

export const MOBILE_ZONE_BLEND_EPS = 0.015;

export function easeToward(
  current: number,
  target: number,
  rate: number,
  delta: number,
): number {
  const t = 1 - Math.exp(-rate * delta);
  return current + (target - current) * t;
}
