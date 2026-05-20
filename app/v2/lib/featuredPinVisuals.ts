import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import { isFeaturedAtCrossing, sourceCellAtCrossing } from "@/app/v2/lib/scrolledCell";
import { FLAG_BLEND_SHOW_THRESHOLD } from "@/app/v2/lib/scrolledDnaBlend";
import type { FeaturedFlagPose } from "@/app/v2/lib/markerPosition";
import * as THREE from "three";

/** Plane diameter is 2× topRadius; multiply for art legibility. */
export const FEATURED_PIN_SIZE_MUL = 12;

/** Vertical nudge so pin art sits on the stick tip. */
export const FEATURED_PIN_Y_OFFSET = 0.075;

const LABEL_GAP_RATIO = 0.06;
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
  if (!dnaLookup) return true;
  if (blends) return isPinVisibleFromBlend(blends[index] ?? 0);
  return isFeaturedAtCrossing(cell, elapsed, dnaLookup);
}

export function featuredFlagDisplayCell(
  cell: TerrainCell,
  elapsed: number,
  dnaLookup?: (TerrainCell | undefined)[][],
): TerrainCell {
  if (!dnaLookup) return cell;
  return sourceCellAtCrossing(cell, elapsed, dnaLookup) ?? cell;
}

/** World position for name/APR label beside the pin (camera-right of tip). */
export function getFeaturedPinLabelPosition(
  flag: FeaturedFlagPose,
  camera: THREE.Camera,
  cellPitch: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  _cameraRight.set(1, 0, 0).transformDirection(camera.matrixWorld);
  const pinHalf = flag.topRadius * FEATURED_PIN_SIZE_MUL * 0.5;
  const gap = cellPitch * LABEL_GAP_RATIO;
  const offset = pinHalf + gap;
  return target.set(
    flag.x + _cameraRight.x * offset,
    flag.yTop + FEATURED_PIN_Y_OFFSET,
    flag.z + _cameraRight.z * offset,
  );
}

export function formatFeaturedApr(apr: number): string {
  if (!Number.isFinite(apr)) return "—";
  const rounded = Math.round(apr * 100) / 100;
  return `${rounded}% APR`;
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
  aprLine: string;
};

export function cellToLabelContent(cell: TerrainCell): LockedLabelContent {
  const name = cell.name.trim() || "—";
  return { id: cell.id, name, aprLine: formatFeaturedApr(cell.apr) };
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
