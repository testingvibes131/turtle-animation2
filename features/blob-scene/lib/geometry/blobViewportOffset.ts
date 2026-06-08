import * as THREE from "three";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";
import { BLOB_INTERACTION_SECTION1_START_FRAC } from "@/features/blob-scene/lib/scroll/blobScrollInteraction";

/** Default perspective camera for the blob canvas. */
export const BLOB_CAMERA_POSITION: [number, number, number] = [0, 0.12, 2.7];
export const BLOB_CAMERA_FOV = 50;

/** Fraction of blob diameter past the right viewport edge (legacy crop helper). */
export const BLOB_RIGHT_CROP_FRACTION = 0.05;

/** Section 1: shift blob down by this fraction of half the viewport height. */
export const BLOB_SECTION1_Y_LOWER_FRAC = 0.5;

export function blobVisualExtent(
  params: Pick<PerlinBlobParams, "radius" | "noiseScale" | "displacementDivisor">,
): number {
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
  return halfViewWidth - extent + cropFraction * diameter;
}

function viewHalfExtents(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
): { halfViewWidth: number; halfViewHeight: number } {
  const dist = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * viewportAspect);
  return {
    halfViewWidth: dist * Math.tan(hFov / 2),
    halfViewHeight: dist * Math.tan(vFov / 2),
  };
}

/**
 * Blob center X for one viewport half. `side` 1 = right half, -1 = left half.
 * Clamps so the full blob diameter stays inside the viewport.
 */
export function computeBlobOffsetXInHalf(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
  extent: number,
  side: 1 | -1,
): number {
  const { halfViewWidth } = viewHalfExtents(camera, viewportAspect);
  const targetX = (side * halfViewWidth) / 2;
  const maxX = halfViewWidth - extent;
  const minX = -halfViewWidth + extent;
  return Math.min(maxX, Math.max(minX, targetX));
}

export function computeBlobOffsetXForScroll(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
  extent: number,
  /** 0 = hero (left), 1 = section 2 (right on desktop, centered on portrait). */
  scrollProgress: number,
): number {
  const t = clampScrollProgress(scrollProgress);
  const section2X =
    viewportAspect < 1
      ? 0
      : computeBlobOffsetXInHalf(camera, viewportAspect, extent, 1);
  const section1X =
    viewportAspect < 1
      ? computeBlobOffsetXInHalf(camera, viewportAspect, extent, -1)
      : -section2X;
  return section1X + (section2X - section1X) * t;
}

export function computeBlobOffsetYForScroll(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
  scrollProgress: number,
): number {
  const { halfViewHeight } = viewHalfExtents(camera, viewportAspect);
  const t = clampScrollProgress(scrollProgress);
  const section1Y = -halfViewHeight * BLOB_SECTION1_Y_LOWER_FRAC;
  return section1Y * (1 - t);
}

/** Full Y-axis turn while scrolling hero → section 2. */
export const BLOB_SCROLL_ROTATION_Y = Math.PI * 2;

function clampScrollProgress(scrollProgress: number): number {
  return Math.min(1, Math.max(0, scrollProgress));
}

export function computeBlobRotationYForScroll(scrollProgress: number): number {
  const span = 1 - BLOB_INTERACTION_SECTION1_START_FRAC;
  const t = clampScrollProgress(
    (scrollProgress - BLOB_INTERACTION_SECTION1_START_FRAC) / span,
  );
  return t * BLOB_SCROLL_ROTATION_Y;
}

export type BlobScrollMotion = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationY: number;
};

/** Section 1 mirrors section 2 placement on the opposite (left) side. */
export function computeBlobScrollMotion(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
  extent: number,
  scrollProgress: number,
): BlobScrollMotion {
  return {
    offsetX: computeBlobOffsetXForScroll(
      camera,
      viewportAspect,
      extent,
      scrollProgress,
    ),
    offsetY: computeBlobOffsetYForScroll(
      camera,
      viewportAspect,
      scrollProgress,
    ),
    scale: 1,
    rotationY: computeBlobRotationYForScroll(scrollProgress),
  };
}

/** @deprecated Hero-only crop; section 1 now mirrors section 2. */
export const BLOB_HERO_LEFT_CROP_FRACTION = 0.2;
/** @deprecated Hero-only scale; section 1 now matches section 2. */
export const BLOB_HERO_SCALE = 1;
/** @deprecated Hero-only vertical pin; section 1 now matches section 2. */
export const BLOB_HERO_BELOW_VIEWPORT_FRACTION = 0;
