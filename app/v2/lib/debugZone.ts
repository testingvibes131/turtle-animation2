import type { GridLayout } from "@/app/v2/lib/gridLayout";

/** Circular XZ debug region on the opportunity grid (centered on layout origin). */
export type DebugZone = {
  centerX: number;
  centerZ: number;
  radius: number;
};

/** Pass when zone scaling should be disabled (e.g. unused label paths). */
export const NO_ZONE_MODIFIER: DebugZone = {
  centerX: 0,
  centerZ: 0,
  radius: Number.POSITIVE_INFINITY,
};

export function buildDebugZone(layout: GridLayout): DebugZone {
  return {
    centerX: 0,
    centerZ: 0,
    radius: layout.extent * 0.38 * 0.8,
  };
}

export function isInsideDebugZone(
  x: number,
  z: number,
  zone: DebugZone,
): boolean {
  const dx = x - zone.centerX;
  const dz = z - zone.centerZ;
  return dx * dx + dz * dz <= zone.radius * zone.radius;
}

/** Smallest marker scale at the outer falloff edge. */
export const ZONE_SCALE_MIN = 0.32;

/** Falloff completes at `radius ×` this (outside → smaller toward edge). */
export const ZONE_SCALE_FALLOFF_MUL = 2.25;

/**
 * 1 inside the blue circle; smooth ramp to ZONE_SCALE_MIN farther out.
 * Uses world XZ (belt markers should pass animated x/z).
 */
export function markerScaleInDebugZone(
  x: number,
  z: number,
  zone: DebugZone,
): number {
  const dist = Math.hypot(x - zone.centerX, z - zone.centerZ);
  if (dist <= zone.radius) return 1;

  const outer = zone.radius * ZONE_SCALE_FALLOFF_MUL;
  const span = Math.max(outer - zone.radius, 1e-6);
  const t = Math.min(1, (dist - zone.radius) / span);
  const smooth = t * t * (3 - 2 * t);
  return 1 - smooth * (1 - ZONE_SCALE_MIN);
}
