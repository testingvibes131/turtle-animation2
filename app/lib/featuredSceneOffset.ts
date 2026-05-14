import type { PackedMarker } from "@/app/lib/opportunityCirclePack";

/** Min/max APR (% points) among **featured** markers in the current layout. */
export type FeaturedAprRange = {
  min: number;
  max: number;
};

export function computeFeaturedAprRange(markers: PackedMarker[]): FeaturedAprRange {
  let min = Infinity;
  let max = -Infinity;
  for (const m of markers) {
    if (!m.featured) continue;
    const a = m.estAprPercent;
    if (Number.isFinite(a)) {
      min = Math.min(min, a);
      max = Math.max(max, a);
    }
  }
  if (!Number.isFinite(min)) return { min: 0, max: 1 };
  /** Same APR for all featured → span 0; lift uses full band (see `featuredSceneOffset`). */
  if (min === max) return { min, max: min };
  return { min, max };
}

/**
 * World-space lift + slight outward push for featured rows (features view).
 * **Y** uses APR normalized within `aprRange` so higher-APR deals read higher; XZ push unchanged.
 */
export function featuredSceneOffset(
  marker: PackedMarker,
  blend: number,
  aprRange: FeaturedAprRange,
): { ox: number; oy: number; oz: number } {
  if (!marker.featured || blend <= 0) return { ox: 0, oy: 0, oz: 0 };

  const push = blend * 2.35;
  const d = Math.hypot(marker.x, marker.z);
  const ux = d > 1e-7 ? marker.x / d : 0.7;
  const uz = d > 1e-7 ? marker.z / d : 0;

  const span = aprRange.max - aprRange.min;
  const t =
    span < 1e-6
      ? 1
      : Math.min(
          1,
          Math.max(0, (marker.estAprPercent - aprRange.min) / span),
        );
  /** Slight curve so top APR band separates more clearly from the middle. */
  const tLift = Math.pow(t, 0.82);

  const LIFT_FLOOR = 2.2;
  const LIFT_APR_SCALE = 46;
  const oy = blend * (LIFT_FLOOR + tLift * LIFT_APR_SCALE + marker.size * 0.12);

  return { ox: ux * push, oy, oz: uz * push };
}

/** Push non-featured markers slightly down in Y when features view is active (more separation vs elevated featured). */
export function nonFeaturedSceneYOffset(marker: PackedMarker, blend: number): number {
  if (marker.featured || blend <= 0) return 0;
  return -blend * 5.4;
}
