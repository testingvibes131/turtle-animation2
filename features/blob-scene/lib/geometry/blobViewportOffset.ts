import * as THREE from "three";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";
import { BLOB_INTERACTION_SECTION1_START_FRAC } from "@/features/blob-scene/lib/scroll/blobScrollInteraction";

/** Fraction of blob diameter past the right viewport edge (lower = further left). */
export const BLOB_RIGHT_CROP_FRACTION = 0.05;

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
  // Camera looks at origin; blob at +X so ~cropFraction of diameter clears the right edge.
  return halfViewWidth - extent + cropFraction * diameter;
}

export function computeBlobOffsetXForScroll(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
  extent: number,
  /** 0 = hero (left), 1 = section 2 (right on desktop, centered on portrait). */
  scrollProgress: number,
): number {
  const right = computeBlobOffsetX(
    camera,
    viewportAspect,
    extent,
    BLOB_RIGHT_CROP_FRACTION,
  );
  // Mirror the final right placement across the viewport center.
  const left = -right;
  const t = Math.min(1, Math.max(0, scrollProgress));
  const endX = viewportAspect < 1 ? 0 : right;
  return left + (endX - left) * t;
}

/** Hero (section 1) scale; section 2 uses 1. */
export const BLOB_HERO_SCALE = 1.35;

/** Full Y-axis turn while scrolling hero → section 2. */
export const BLOB_SCROLL_ROTATION_Y = Math.PI * 2;

function clampScrollProgress(scrollProgress: number): number {
  return Math.min(1, Math.max(0, scrollProgress));
}

export function computeBlobScaleForScroll(scrollProgress: number): number {
  const t = clampScrollProgress(scrollProgress);
  return BLOB_HERO_SCALE + (1 - BLOB_HERO_SCALE) * t;
}

export function computeBlobRotationYForScroll(
  scrollProgress: number,
  rotationEnabled: boolean,
): number {
  if (!rotationEnabled) return 0;
  const span = 1 - BLOB_INTERACTION_SECTION1_START_FRAC;
  const t = clampScrollProgress(
    (scrollProgress - BLOB_INTERACTION_SECTION1_START_FRAC) / span,
  );
  return t * BLOB_SCROLL_ROTATION_Y;
}

/** Fraction of blob diameter that sits below the viewport bottom in the hero. */
export const BLOB_HERO_BELOW_VIEWPORT_FRACTION = 1 / 3;

/**
 * Hero: shift down so BLOB_HERO_BELOW_VIEWPORT_FRACTION of the diameter is off-screen.
 */
export function computeBlobOffsetYForScroll(
  camera: THREE.PerspectiveCamera,
  extent: number,
  scrollProgress: number,
): number {
  const t = clampScrollProgress(scrollProgress);
  const scale = computeBlobScaleForScroll(scrollProgress);
  const scaledExtent = extent * scale;
  const dist = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const halfViewHeight = dist * Math.tan(vFov / 2);
  const below = BLOB_HERO_BELOW_VIEWPORT_FRACTION * scaledExtent * 2;
  const heroOffsetY = -halfViewHeight + scaledExtent - below;
  return heroOffsetY * (1 - t);
}

export type BlobScrollMotion = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationY: number;
};

export function computeBlobScrollMotion(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
  extent: number,
  scrollProgress: number,
  rotationEnabled: boolean,
): BlobScrollMotion {
  return {
    offsetX: computeBlobOffsetXForScroll(
      camera,
      viewportAspect,
      extent,
      scrollProgress,
    ),
    offsetY: computeBlobOffsetYForScroll(camera, extent, scrollProgress),
    scale: computeBlobScaleForScroll(scrollProgress),
    rotationY: computeBlobRotationYForScroll(scrollProgress, rotationEnabled),
  };
}
