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

const _toCam = new THREE.Vector3();
const _edgeWorld = new THREE.Vector3();

/** Screen-space radius of a world-space sphere toward the camera. */
export function sphereScreenRadiusPx(
  worldPos: THREE.Vector3,
  worldRadius: number,
  camera: THREE.Camera,
  size: { width: number; height: number },
): number {
  _toCam.copy(camera.position).sub(worldPos);
  const dist = _toCam.length();
  if (dist < 1e-8) return 0;
  _edgeWorld.copy(worldPos).addScaledVector(_toCam, worldRadius / dist);
  const centerPx = screenPoint(worldPos, camera, size);
  const edgePx = screenPoint(_edgeWorld, camera, size);
  return centerPx.distanceTo(edgePx);
}

function sphereScreenRadiusPxFromWorld(
  worldPos: THREE.Vector3,
  worldRadius: number,
  camera: THREE.Camera,
  size: { width: number; height: number },
): number {
  const worldPerPx = worldScaleForScreenPx(worldPos, 1, camera, size);
  if (worldPerPx < 1e-8) return 0;
  return worldRadius / worldPerPx;
}

/** Billboard ring scale (unit outer radius 1) wrapping a marker sphere. */
export function orbitRingBillboardScale(
  worldPos: THREE.Vector3,
  sphereWorldRadius: number,
  camera: THREE.Camera,
  size: { width: number; height: number },
  sizeVsSphere: number,
): number {
  const towardPx = sphereScreenRadiusPx(
    worldPos,
    sphereWorldRadius,
    camera,
    size,
  );
  const worldPx = sphereScreenRadiusPxFromWorld(
    worldPos,
    sphereWorldRadius,
    camera,
    size,
  );
  const spherePx = Math.max(towardPx, worldPx);
  return worldScaleForScreenPx(worldPos, spherePx * sizeVsSphere, camera, size);
}
