import * as THREE from "three";

const _dir = new THREE.Vector3();
const _forward = new THREE.Vector3();

/**
 * Mobile hub logo: stay on the zone hub vertex, tuck rim zones slightly toward
 * the blob center (adaptive — front zones keep separation).
 */
export function mobileHubLogoLocalPosition(
  wobbledHub: THREE.Vector3,
  towardCamera: THREE.Vector3,
  target: THREE.Vector3,
): void {
  const len = wobbledHub.length();
  if (len < 1e-8) {
    target.copy(wobbledHub);
    return;
  }

  _dir.copy(wobbledHub).multiplyScalar(1 / len);
  _forward.copy(towardCamera).normalize();
  const rim = THREE.MathUtils.clamp(1 - Math.abs(_dir.dot(_forward)), 0, 1);
  const tuck = THREE.MathUtils.lerp(0.985, 0.9, rim * rim);
  target.copy(wobbledHub).multiplyScalar(tuck);
}

/** Layout drift check for mobile carousel (edges are always empty). */
export function mobileZoneLayoutSignature(zone: {
  hub: number;
  partners: readonly number[];
  members: readonly number[];
}): string {
  return `${zone.hub}|${zone.partners.join(",")}|${zone.members.length}`;
}
