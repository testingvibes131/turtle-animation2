import * as THREE from "three";
import { depthSizeMultiplier } from "@/features/blob-scene/lib/geometry/sphereDepthSize";
import {
  displacedVertexPosition,
  type IcosahedronVertexData,
  type PerlinBlobParams,
} from "@/features/blob-scene/lib/geometry/perlinBlob";

export type ZoneMarkerLayout = {
  localPosition: THREE.Vector3;
  worldPosition: THREE.Vector3;
  sphereScale: number;
};

const _layout = {
  localPosition: new THREE.Vector3(),
  worldPosition: new THREE.Vector3(),
  sphereScale: 1,
};

/** Same placement + depth scale as zone instanced member spheres. */
export function computeZoneMarkerLayout(
  vertices: IcosahedronVertexData,
  vertexIndex: number,
  blobParams: PerlinBlobParams,
  pointRadius: number,
  scaleMul: number,
  camera: THREE.Camera,
  parent: THREE.Object3D | null,
  extent: number,
  depthSizeNearOffset: number,
  depthSizeFarOffset: number,
  depthSizeMinMul: number,
  depthSizeMaxMul: number,
  out: ZoneMarkerLayout = _layout,
): ZoneMarkerLayout {
  displacedVertexPosition(vertices, vertexIndex, blobParams, out.localPosition);
  out.worldPosition.copy(out.localPosition);
  parent?.localToWorld(out.worldPosition);

  const camDist = camera.position.length();
  const sizeNear = camDist - extent * depthSizeNearOffset;
  const sizeFar = camDist + extent * depthSizeFarOffset;
  const dist = camera.position.distanceTo(out.worldPosition);
  out.sphereScale =
    pointRadius *
    scaleMul *
    depthSizeMultiplier(
      dist,
      sizeNear,
      sizeFar,
      depthSizeMinMul,
      depthSizeMaxMul,
    );
  return out;
}
