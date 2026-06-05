import * as THREE from "three";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import type { BlobSection1Tuning } from "@/features/blob-scene/lib/blobSection1Tuning";
import { DEFAULT_SECTION_1_TUNING } from "@/features/blob-scene/lib/blobSection1Tuning";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";
import { blobTransitionDistortStrength } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";
import { BLOB_INTERACTION_SECTION1_START_FRAC } from "@/features/blob-scene/lib/scroll/blobScrollInteraction";

export type HeroViewportTuning = Pick<
  BlobSection1Tuning,
  "heroScale" | "heroLeftCrop" | "heroBelowViewport"
>;

/** Fraction of blob diameter past the right viewport edge (lower = further left). */
export const BLOB_RIGHT_CROP_FRACTION = 0.05;

/** Extra left crop for the hero (mirrors right-edge logic; higher = more off-screen). */
export const BLOB_HERO_LEFT_CROP_FRACTION = 0.2;

/** Fraction of blob diameter that sits below the viewport bottom in the hero. */
export const BLOB_HERO_BELOW_VIEWPORT_FRACTION = 0.7;

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
export const BLOB_HERO_SCALE = 1.18;

/** Full Y-axis turn while scrolling hero → section 2. */
export const BLOB_SCROLL_ROTATION_Y = Math.PI * 2;

function clampScrollProgress(scrollProgress: number): number {
  return Math.min(1, Math.max(0, scrollProgress));
}

export function computeBlobScaleForScroll(
  scrollProgress: number,
  heroScale = BLOB_HERO_SCALE,
): number {
  const t = clampScrollProgress(scrollProgress);
  return heroScale + (1 - heroScale) * t;
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
 * Hero bottom-left placement (scroll progress 0).
 * Uses layout `extent` only — hero scale is applied on the group, not here.
 */
export function computeBlobHeroBottomLeftOffset(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
  extent: number,
  hero: HeroViewportTuning = DEFAULT_SECTION_1_TUNING,
): { x: number; y: number } {
  const { halfViewHeight } = viewHalfExtents(camera, viewportAspect);
  const x = -computeBlobOffsetX(
    camera,
    viewportAspect,
    extent,
    hero.heroLeftCrop,
  );
  const visualRadius = extent * hero.heroScale;
  const below = hero.heroBelowViewport * visualRadius * 2;
  const y = -halfViewHeight + visualRadius - below;
  return { x, y };
}

/** Vertical scroll offset; hero (t=0) uses bottom-left corner pinning. */
export function computeBlobOffsetYForScroll(
  camera: THREE.PerspectiveCamera,
  viewportAspect: number,
  extent: number,
  scrollProgress: number,
  heroViewport: HeroViewportTuning = DEFAULT_SECTION_1_TUNING,
): number {
  const t = clampScrollProgress(scrollProgress);
  const hero = computeBlobHeroBottomLeftOffset(
    camera,
    viewportAspect,
    extent,
    heroViewport,
  );
  return hero.y * (1 - t);
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
  coloredToGrayMix = 1,
  heroViewport: HeroViewportTuning = DEFAULT_SECTION_1_TUNING,
): BlobScrollMotion {
  const scrollX = computeBlobOffsetXForScroll(
    camera,
    viewportAspect,
    extent,
    scrollProgress,
  );
  const scrollY = computeBlobOffsetYForScroll(
    camera,
    viewportAspect,
    extent,
    scrollProgress,
    heroViewport,
  );
  const scrollScale = computeBlobScaleForScroll(
    scrollProgress,
    heroViewport.heroScale,
  );

  const heroAnchor = blobTransitionDistortStrength(coloredToGrayMix);
  if (heroAnchor <= 0.001) {
    return {
      offsetX: scrollX,
      offsetY: scrollY,
      scale: scrollScale,
      rotationY: computeBlobRotationYForScroll(scrollProgress, rotationEnabled),
    };
  }

  const hero = computeBlobHeroBottomLeftOffset(
    camera,
    viewportAspect,
    extent,
    heroViewport,
  );
  const inv = 1 - heroAnchor;

  return {
    offsetX: hero.x * heroAnchor + scrollX * inv,
    offsetY: hero.y * heroAnchor + scrollY * inv,
    scale: heroViewport.heroScale * heroAnchor + scrollScale * inv,
    rotationY: computeBlobRotationYForScroll(scrollProgress, rotationEnabled),
  };
}
