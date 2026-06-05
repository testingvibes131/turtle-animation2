import * as THREE from "three";

const _rootWorldQuat = new THREE.Quaternion();
const _cameraWorldQuat = new THREE.Quaternion();

/** Orient `object` parallel to the camera while `root` supplies world position. */
export function billboardToCamera(
  object: THREE.Object3D,
  root: THREE.Object3D,
  camera: THREE.Camera,
): void {
  root.updateMatrixWorld(true);
  root.getWorldQuaternion(_rootWorldQuat);
  camera.getWorldQuaternion(_cameraWorldQuat);
  object.quaternion.copy(_cameraWorldQuat).premultiply(_rootWorldQuat.invert());
}
