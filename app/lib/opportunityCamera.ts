/**
 * Main-route orbit rig (wide lens, low perspective across the field).
 * Pose is scaled by layout `extent` so v2 matches v1 framing at a smaller world scale.
 */

export const DEFAULT_OPPORTUNITY_FOV = 50;

/** Pinned default rig (orbit target = look-at). */
export const DEFAULT_CAMERA_POSITION = [
  93.948418, 36.269469, 54.614967,
] as const;
export const DEFAULT_CAMERA_TARGET = [38.185166, 25.897914, -5.006759] as const;

/** Typical `layout.extent` when the pose above was authored (~887 rows, 16:9). */
export const OPPORTUNITY_CAMERA_REFERENCE_EXTENT = 176;

export type OpportunityCameraPose = {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
};

export function getOpportunityCameraPose(extent: number): OpportunityCameraPose {
  const s = extent / OPPORTUNITY_CAMERA_REFERENCE_EXTENT;
  const [cx, cy, cz] = DEFAULT_CAMERA_POSITION;
  const [tx, ty, tz] = DEFAULT_CAMERA_TARGET;
  return {
    position: [cx * s, cy * s, cz * s],
    target: [tx * s, ty * s, tz * s],
  };
}

export function getOpportunityCameraFar(
  position: readonly [number, number, number],
  target: readonly [number, number, number],
): number {
  const [cx, cy, cz] = position;
  const [tx, ty, tz] = target;
  return Math.max(
    6000,
    Math.hypot(cx, cy, cz) * 8,
    Math.hypot(tx, ty, tz) * 6,
  );
}

export const DEFAULT_ORBIT_ZOOM = 1;

export function getOpportunityOrbitDistanceBounds(
  extent: number,
  orbitZoom = DEFAULT_ORBIT_ZOOM,
): { minDistance: number; maxDistance: number } {
  return {
    minDistance: (extent * 0.18) / Math.max(0.25, orbitZoom),
    maxDistance: extent * 8,
  };
}
