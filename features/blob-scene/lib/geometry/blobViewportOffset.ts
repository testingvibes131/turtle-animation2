import * as THREE from "three";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";

/** Fraction of blob diameter past the right viewport edge (lower = further left). */
export const BLOB_RIGHT_CROP_FRACTION = 0.05;

export function blobVisualExtent(params: BlobVisualParams): number {
  const maxDisp =
    (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
  return params.radius + maxDisp;
}

/**
 * Horizontal shift for the blob. Positive cropFraction pushes right; negative pulls left.
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
