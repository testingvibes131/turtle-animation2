import * as THREE from "three";

const _center = new THREE.Vector3();
const _closest = new THREE.Vector3();

/** Modest inflation vs rendered sphere for easier hits without a huge target. */
export const SPHERE_PICK_RADIUS_MUL = 2.25;
/** Tight fallback pick on colored points when the cap ray misses the blob. */
export const ZONE_MEMBER_PICK_RADIUS_MUL = 1.2;
export const SPHERE_PICK_MIN_RADIUS_MUL = 1.08;

export function pickVertexNearRay(
  ray: THREE.Ray,
  cameraPosition: THREE.Vector3,
  count: number,
  getCenter: (index: number, target: THREE.Vector3) => void,
  getRadius: (index: number) => number,
  minPickRadius: number,
  isPickable: (index: number) => boolean = () => true,
): number {
  let bestId = -1;
  let bestDepth = Infinity;

  for (let i = 0; i < count; i++) {
    if (!isPickable(i)) continue;
    getCenter(i, _center);
    const r = Math.max(
      getRadius(i) * SPHERE_PICK_RADIUS_MUL,
      minPickRadius,
    );

    ray.closestPointToPoint(_center, _closest);
    if (_closest.distanceTo(_center) > r) continue;

    const depth = _closest.distanceTo(cameraPosition);
    if (depth < bestDepth) {
      bestDepth = depth;
      bestId = i;
    }
  }

  return bestId;
}

/**
 * Nearest vertex along the ray. `isRayCandidate` gates which verts block the ray;
 * `isHoverTarget` must pass on the winner (zone membership, etc.).
 */
export function pickHoverVertexNearRay(
  ray: THREE.Ray,
  cameraPosition: THREE.Vector3,
  count: number,
  getCenter: (index: number, target: THREE.Vector3) => void,
  getRadius: (index: number) => number,
  minPickRadius: number,
  isRayCandidate: (index: number) => boolean,
  isHoverTarget: (index: number) => boolean,
): number {
  let bestId = -1;
  let bestDepth = Infinity;

  for (let i = 0; i < count; i++) {
    if (!isRayCandidate(i)) continue;
    getCenter(i, _center);
    const r = Math.max(
      getRadius(i) * SPHERE_PICK_RADIUS_MUL,
      minPickRadius,
    );

    ray.closestPointToPoint(_center, _closest);
    if (_closest.distanceTo(_center) > r) continue;

    const depth = _closest.distanceTo(cameraPosition);
    if (depth < bestDepth) {
      bestDepth = depth;
      bestId = i;
    }
  }

  if (bestId < 0 || !isHoverTarget(bestId)) return -1;
  return bestId;
}

/** Nearest zone member along the ray (colored cap points). */
export function pickZoneMemberNearRay(
  ray: THREE.Ray,
  cameraPosition: THREE.Vector3,
  zones: readonly { members: readonly number[] }[],
  getCenter: (index: number, target: THREE.Vector3) => void,
  getRadius: (index: number) => number,
  minPickRadius: number,
  radiusMul = ZONE_MEMBER_PICK_RADIUS_MUL,
): number {
  let bestId = -1;
  let bestDepth = Infinity;

  for (const zone of zones) {
    for (const vi of zone.members) {
      getCenter(vi, _center);
      const r = Math.max(getRadius(vi) * radiusMul, minPickRadius);

      ray.closestPointToPoint(_center, _closest);
      if (_closest.distanceTo(_center) > r) continue;

      const depth = _closest.distanceTo(cameraPosition);
      if (depth < bestDepth) {
        bestDepth = depth;
        bestId = vi;
      }
    }
  }

  return bestId;
}
