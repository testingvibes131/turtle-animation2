import * as THREE from "three";

/** Snapshot of a connected highlight sphere, shared with its orbit ring. */
export type ConnectedMarkerLayout = {
  localPosition: THREE.Vector3;
  worldPosition: THREE.Vector3;
  sphereScale: number;
};

export function createConnectedMarkerLayout(): ConnectedMarkerLayout {
  return {
    localPosition: new THREE.Vector3(),
    worldPosition: new THREE.Vector3(),
    sphereScale: 0,
  };
}
