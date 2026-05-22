import * as THREE from "three";
import type { PerlinBlobVisualParams } from "@/app/sketch/hooks/useNoiseSphereControls";

/** Fraction of blob diameter that sits past the right viewport edge. */
export const BLOB_RIGHT_CROP_FRACTION = 0.15;

export function blobVisualExtent(params: PerlinBlobVisualParams): number {
  const maxDisp =
    (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
  return params.radius + maxDisp;
}

/**
 * +X shift so ~25% of the blob diameter extends beyond the right screen edge.
 */
export function computeBlobOffsetX(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
  extent: number,
  cropFraction = BLOB_RIGHT_CROP_FRACTION,
): number {
  const dist = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * viewportAspect);
  const halfViewWidth = dist * Math.tan(hFov / 2);
  const diameter = extent * 2;
  // Camera looks at origin; blob at +X so ~cropFraction of diameter clears the right edge.
  return halfViewWidth - extent + cropFraction * diameter;
}
