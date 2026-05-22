import * as THREE from "three";

const _projected = new THREE.Vector3();
const _point2 = new THREE.Vector3();
const _point2Off = new THREE.Vector3();
const _point3Off = new THREE.Vector3();

function screenPoint(
  world: THREE.Vector3,
  camera: THREE.Camera,
  size: { width: number; height: number },
): THREE.Vector3 {
  const widthHalf = size.width / 2;
  const heightHalf = size.height / 2;
  camera.updateMatrixWorld(false);
  const v = _projected.copy(world).project(camera);
  v.x = v.x * widthHalf + widthHalf;
  v.y = -(v.y * heightHalf) + heightHalf;
  return v;
}

function unprojectScreen(
  x: number,
  y: number,
  z: number,
  camera: THREE.Camera,
  size: { width: number; height: number },
): THREE.Vector3 {
  const v = _point3Off.set(
    (x / size.width) * 2 - 1,
    -(y / size.height) * 2 + 1,
    z,
  );
  v.unproject(camera);
  return v;
}

/**
 * World-space scale for a 1×1 plane so its projected size is ~2×radiusPx across
 * the viewport (same approach as drei ScreenSizer).
 */
export function worldScaleForScreenPx(
  worldPos: THREE.Vector3,
  radiusPx: number,
  camera: THREE.Camera,
  size: { width: number; height: number },
): number {
  const point2 = screenPoint(worldPos, camera, size);
  let scale = 0;
  for (let i = 0; i < 2; i++) {
    _point2Off.copy(point2).setComponent(i, point2.getComponent(i) + radiusPx);
    const off = unprojectScreen(
      _point2Off.x,
      _point2Off.y,
      _point2Off.z,
      camera,
      size,
    );
    scale = Math.max(scale, worldPos.distanceTo(off));
  }
  return scale;
}
