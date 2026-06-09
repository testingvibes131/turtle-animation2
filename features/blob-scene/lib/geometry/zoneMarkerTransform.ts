import * as THREE from "three";
import { depthSizeMultiplier } from "@/features/blob-scene/lib/geometry/sphereDepthSize";
import {
  readCachedVertexPosition,
  type BlobVertexFrameCache,
} from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";

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
  frameCache: BlobVertexFrameCache,
  vertexIndex: number,
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
  readCachedVertexPosition(frameCache, vertexIndex, out.localPosition);
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
