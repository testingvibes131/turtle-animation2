import {
  aprToStickHeightT,
  featuredStickAprRange,
  type AprRange,
} from "@/app/v2/lib/apr";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import {
  ownsMarkerCrossing,
  sourceCellAtCrossing,
} from "@/app/v2/lib/scrolledCell";
import { FLAG_BLEND_SHOW_THRESHOLD } from "@/app/v2/lib/scrolledDnaBlend";
import type { FeaturedFlagPose } from "@/app/v2/lib/markerPosition";
import * as THREE from "three";

/** Pole height at max APR (× cellPitch); 0% APR → ~0 height. */
export const FEATURED_STICK_MAX_HEIGHT_RATIO = 1.05;

/** Plane diameter is 2× topRadius; multiply for art legibility. */
export const FEATURED_PIN_SIZE_MUL = 9;

/** Vertical nudge so pin art sits on the stick tip (world Y; lower = smaller value). */
export const FEATURED_PIN_Y_OFFSET = 0.02;

/** Gap from pin art edge to label (world units ∝ cellPitch). */
const LABEL_EDGE_GAP_RATIO = 0.035;
/** Pin PNG does not fill the billboard plane; shrink radius used for label offset. */
const LABEL_PIN_ART_RADIUS_MUL = 0.88;
/** Extra push along camera-right beyond pin edge + gap. */
const LABEL_CAMERA_RIGHT_MUL = 1.2;
const _cameraRight = new THREE.Vector3();

/** Hide opportunity name in pin labels; name copy still resolves for held/swap logic. */
export const FEATURED_PIN_SHOW_NAME_LABEL = true;

/** Same visibility gate as featured flag sticks (smoothed DNA blend). */
export function isPinVisibleFromBlend(blend: number): boolean {
  return blend > FLAG_BLEND_SHOW_THRESHOLD;
}

export function isFeaturedFlagVisible(
  cell: TerrainCell,
  index: number,
  elapsed: number,
  dnaLookup?: (TerrainCell | undefined)[][],
  blends?: Float32Array | null,
): boolean {
  if (!cell.featured) return false;
  if (!dnaLookup) return true;
  if (!ownsMarkerCrossing(cell, elapsed, dnaLookup)) return false;
  if (blends) return isPinVisibleFromBlend(blends[index] ?? 0);
  return true;
}

export function featuredFlagDisplayCell(
  cell: TerrainCell,
  elapsed: number,
  dnaLookup?: (TerrainCell | undefined)[][],
): TerrainCell {
  if (!dnaLookup) return cell;
  return sourceCellAtCrossing(cell, elapsed, dnaLookup) ?? cell;
}

/** APR for stick height (matches label copy at scrolled crossings). */
export function featuredStickApr(
  cell: TerrainCell,
  elapsed: number,
  dnaLookup?: (TerrainCell | undefined)[][],
): number {
  return featuredFlagDisplayCell(cell, elapsed, dnaLookup).apr;
}

/** Full stick height at featured blend = 1 (0% ≈ none; max APR = full pole). */
export function featuredStickNominalHeight(
  apr: number,
  aprRange: AprRange,
  cellPitch: number,
): number {
  const t = aprToStickHeightT(apr, featuredStickAprRange(aprRange));
  if (t <= 0) return 0;
  return cellPitch * FEATURED_STICK_MAX_HEIGHT_RATIO * t;
}

/** World position for name/APR label beside the pin (camera-right of tip). */
export function getFeaturedPinLabelPosition(
  flag: FeaturedFlagPose,
  camera: THREE.Camera,
  cellPitch: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  _cameraRight.set(1, 0, 0).transformDirection(camera.matrixWorld);
  const pinRadius = flag.topRadius * FEATURED_PIN_SIZE_MUL * 0.5;
  const artRadius = pinRadius * LABEL_PIN_ART_RADIUS_MUL;
  const gap = cellPitch * LABEL_EDGE_GAP_RATIO;
  const offset = (artRadius + gap) * LABEL_CAMERA_RIGHT_MUL;
  return target.set(
    flag.x + _cameraRight.x * offset,
    flag.yTop + FEATURED_PIN_Y_OFFSET,
    flag.z + _cameraRight.z * offset,
  );
}

export type FeaturedAprParts = {
  value: string;
  suffix: string;
};

export function formatFeaturedAprParts(apr: number): FeaturedAprParts {
  if (!Number.isFinite(apr)) return { value: "—", suffix: "" };
  const rounded = Math.round(apr * 100) / 100;
  return { value: `${rounded}%`, suffix: "APR" };
}

export function formatFeaturedApr(apr: number): string {
  const { value, suffix } = formatFeaturedAprParts(apr);
  return suffix ? `${value} ${suffix}` : value;
}

/** Featured strength 0–1 above the pin show threshold (stick height proxy). */
export function featuredLabelBlendT(blend: number): number {
  const span = 1 - FLAG_BLEND_SHOW_THRESHOLD;
  if (span <= 0) return blend > FLAG_BLEND_SHOW_THRESHOLD ? 1 : 0;
  return Math.max(0, Math.min(1, (blend - FLAG_BLEND_SHOW_THRESHOLD) / span));
}

/** Ramp opacity near the bottom of stick height (birth and death). */
export const LABEL_BOTTOM_FADE_PORTION = 0.16;

export function featuredLabelBottomBandOpacityFromT(t: number): number {
  if (t <= 0) return 0;
  if (t >= LABEL_BOTTOM_FADE_PORTION) return 1;
  const u = t / LABEL_BOTTOM_FADE_PORTION;
  return u * u * (3 - 2 * u);
}

/** Opacity 0–1 in the bottom band of stick height; full above that band. */
export function featuredLabelBottomBandOpacity(blend: number): number {
  return featuredLabelBottomBandOpacityFromT(featuredLabelBlendT(blend));
}

/** Fade in and out near the bottom of stick height; full opacity in between. */
export function featuredLabelOpacity(blend: number): number {
  if (blend <= FLAG_BLEND_SHOW_THRESHOLD) return 0;
  return featuredLabelBottomBandOpacity(blend);
}

export type LockedLabelContent = {
  id: string;
  name: string;
  aprValue: string;
  aprSuffix: string;
};

export function cellToLabelContent(cell: TerrainCell): LockedLabelContent {
  const name = cell.name.trim() || "—";
  const { value, suffix } = formatFeaturedAprParts(cell.apr);
  return { id: cell.id, name, aprValue: value, aprSuffix: suffix };
}

/**
 * Stable label copy: snapped featured wins; otherwise hold current text during
 * stick ramp (avoids dominant-corner id flipping); dominant only for first pick.
 */
export function resolveFeaturedLabelContent(
  atCrossing: TerrainCell | undefined,
  dominant: TerrainCell | undefined,
  held: LockedLabelContent | null,
  pinVisible: boolean,
): LockedLabelContent | null {
  if (!pinVisible) return null;
  if (atCrossing?.featured) return cellToLabelContent(atCrossing);
  if (held) return held;
  if (dominant) return cellToLabelContent(dominant);
  return null;
}
