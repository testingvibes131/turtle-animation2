import type { CuratorZoneAssignment } from "@/features/blob-scene/lib/curators/zones";
import { zoneClockDegForLayout } from "@/features/blob-scene/lib/curators/zones";

/** Half-width of the lit band on the cap (degrees) — narrow = brief, spaced hits. */
export const BLOB_CAP_WAVE_HALF_WIDTH_DEG = 26;

/** Peak opacity multiplier for the sweep (material + instance).
 *  Kept low so the per-curator colors read as a subtle ambient glow that
 *  shifts as the wave rotates, rather than hard saturated patches. */
export const BLOB_CAP_WAVE_MAX_OPACITY = 0.12;

/** Base sweep speed (degrees per second) — lower = longer gaps between zones. */
export const BLOB_CAP_WAVE_SPEED_DEG = 11;

/** Extra sweep speed at full scroll wobble. */
export const BLOB_CAP_WAVE_SCROLL_SPEED_MUL = 14;

/** Exponential fade for section 1 ambient (cap gray + wave) into section 2. */
export const SECTION1_AMBIENT_FADE_RATE = 5.5;

/** Below this, section 1 ambient visuals are fully off. */
export const SECTION1_AMBIENT_FADE_EPS = 0.02;

export function capAngularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Soft bell — wide shoulders, gentle peak. */
function waveFalloff(dist: number, halfWidthDeg: number): number {
  const t = dist / Math.max(halfWidthDeg, 0.001);
  return Math.exp(-t * t * 1.65);
}

export type CapWaveHit = {
  zone: CuratorZoneAssignment;
  strength: number;
};

/** Zone whose clock position sits inside the sweeping band. */
export function pickCapWaveZone(
  zones: readonly CuratorZoneAssignment[],
  waveAngleDeg: number,
  layoutMirrored: boolean,
  halfWidthDeg = BLOB_CAP_WAVE_HALF_WIDTH_DEG,
): CapWaveHit | null {
  let best: CapWaveHit | null = null;

  for (const zone of zones) {
    const zoneDeg = zoneClockDegForLayout(zone.curator.name, layoutMirrored);
    const dist = capAngularDistance(zoneDeg, waveAngleDeg);
    if (dist > halfWidthDeg) continue;

    const strength =
      waveFalloff(dist, halfWidthDeg) * BLOB_CAP_WAVE_MAX_OPACITY;
    if (!best || strength > best.strength) {
      best = { zone, strength };
    }
  }

  return best;
}
