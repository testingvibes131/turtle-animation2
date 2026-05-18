import type { GridTopographyMarker } from "@/app/lib/opportunityGridTopographyLayout";

export type FeaturedAprRange = {
  min: number;
  max: number;
};

export function computeFeaturedAprRange(
  markers: GridTopographyMarker[],
): FeaturedAprRange {
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
  if (min === max) return { min, max: min };
  return { min, max };
}

/**
 * Extra Y lift for featured markers on the grid topography (XZ stays on the cell).
 * Higher `estAprPercent` within `aprRange` → higher sphere.
 */
export function featuredGridAprLiftY(
  marker: GridTopographyMarker,
  aprRange: FeaturedAprRange,
): number {
  if (!marker.featured) return 0;

  const span = aprRange.max - aprRange.min;
  const t =
    span < 1e-6
      ? 1
      : Math.min(
          1,
          Math.max(0, (marker.estAprPercent - aprRange.min) / span),
        );
  const tLift = Math.pow(t, 0.82);

  const LIFT_FLOOR = 0.75;
  const LIFT_APR_SCALE = 16;
  return LIFT_FLOOR + tLift * LIFT_APR_SCALE + marker.size * 0.06;
}
