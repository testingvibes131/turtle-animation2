/** Default sphere tint. */
export const COLOR_REST = 0x8B8C8B;

export const COLOR_FEATURED = 0x73f36c;

export const COLOR_STICK = 0x4a9a44;

/** Base sphere radius vs cell pitch (30% smaller than prior 0.035). */
export const SPHERE_RADIUS_RATIO = 0.0245;

export function stickDashSizes(cellPitch: number): {
  dashSize: number;
  gapSize: number;
  lineWidth: number;
} {
  return {
    dashSize: Math.max(0.02, cellPitch * 0.055),
    gapSize: Math.max(0.012, cellPitch * 0.032),
    lineWidth: 1,
  };
}
