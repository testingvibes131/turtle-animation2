/** px/s scroll speed → extra satellite orbit rad/s (capped). */
const SCROLL_VELOCITY_TO_RAD = 0.008;
const MAX_SCROLL_ORBIT_BOOST = 4.2;

export function satelliteOrbitBoostFromScroll(scrollPxPerSec: number): number {
  return Math.min(
    Math.abs(scrollPxPerSec) * SCROLL_VELOCITY_TO_RAD,
    MAX_SCROLL_ORBIT_BOOST,
  );
}

/** Idle decay per frame (~60fps baseline). */
export const SCROLL_VELOCITY_DECAY = 0.93;
export const SCROLL_VELOCITY_IDLE_MS = 64;
export const SCROLL_VELOCITY_ZERO_EPS = 2;
