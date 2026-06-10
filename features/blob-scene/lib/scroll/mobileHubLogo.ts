import * as THREE from "three";

const _dir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _pullHub = new THREE.Vector3();
const _pullToward = new THREE.Vector3();

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

/**
 * Mobile carousel: pull the hub strongly toward the camera-facing centre of the
 * globe so every partner's logo clusters near the middle (small per-hub offset);
 * the partner difference is carried by the fanned lines, not the logo position.
 * Camera-relative, so the logo holds centre as the globe turns. Used by BOTH the
 * hub logo and the plexus lines' hub end so they stay attached to one another.
 */
export function mobilePulledHubLocal(
  wobbledHub: THREE.Vector3,
  towardCamera: THREE.Vector3,
  target: THREE.Vector3,
): void {
  const len = wobbledHub.length();
  if (len < 1e-8) {
    target.copy(wobbledHub);
    return;
  }
  const bias = 0.72; // 0 = on the hub vertex, 1 = dead centre toward camera
  _pullHub.copy(wobbledHub).multiplyScalar(1 / len);
  _pullToward.copy(towardCamera).normalize();
  target
    .copy(_pullToward)
    .multiplyScalar(bias)
    .addScaledVector(_pullHub, 1 - bias);
  if (target.lengthSq() < 1e-8) target.copy(_pullToward);
  target.normalize().multiplyScalar(len * 1.04);
}

/** Layout drift check for mobile carousel (edges are always empty). */
export function mobileZoneLayoutSignature(zone: {
  hub: number;
  partners: readonly number[];
  members: readonly number[];
}): string {
  return `${zone.hub}|${zone.partners.join(",")}|${zone.members.length}`;
}
