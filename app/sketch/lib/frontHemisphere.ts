import * as THREE from "three";

/** Camera looks from +Z; front of the blob faces the viewer. */
export const FRONT_AXIS = new THREE.Vector3(0, 0, 1);

/** Front cap where CSV rows and plexus may be placed. */
export const FRONT_CLUSTER_DOT = 0.55;

/** Tangent-plane radius for curator anchor layout on the front cap. */
export const FRONT_SEED_DISK_RADIUS = 0.5;

/** Max angular radius of each curator patch (radians on the sphere). */
export const CURATOR_PATCH_MAX_ANGLE = 1.5;

const _dir = new THREE.Vector3();
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function vertexDirection(
  positions: Float32Array,
  index: number,
  target = _dir,
): THREE.Vector3 {
  const i3 = index * 3;
  return target
    .set(positions[i3]!, positions[i3 + 1]!, positions[i3 + 2]!)
    .normalize();
}

export function frontVertexDot(
  positions: Float32Array,
  index: number,
): number {
  return vertexDirection(positions, index).dot(FRONT_AXIS);
}

export function collectFrontVertexIndices(
  positions: Float32Array,
  vertexCount: number,
  minDot = FRONT_CLUSTER_DOT,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < vertexCount; i++) {
    if (frontVertexDot(positions, i) >= minDot) out.push(i);
  }
  return out;
}

/** Golden-angle anchors on the front cap (tangent disk at +Z). */
export function layoutSpacedFrontCapSeeds(total: number): THREE.Vector3[] {
  if (total <= 0) return [];

  const seeds: THREE.Vector3[] = [];
  for (let i = 0; i < total; i++) {
    const angle = GOLDEN_ANGLE * i;
    const r =
      FRONT_SEED_DISK_RADIUS * Math.sqrt((i + 0.5) / Math.max(total, 1));
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
    seeds.push(new THREE.Vector3(x, y, z).normalize());
  }

  return seeds;
}

export function patchMinDot(): number {
  return Math.cos(CURATOR_PATCH_MAX_ANGLE);
}
