import type { GridLayout } from "@/app/v2/lib/gridLayout";

/** Circular XZ debug region on the opportunity grid (centered on layout origin). */
export type DebugZone = {
  centerX: number;
  centerZ: number;
  radius: number;
};

export function buildDebugZone(layout: GridLayout): DebugZone {
  return {
    centerX: 0,
    centerZ: 0,
    radius: layout.extent * 0.38,
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
