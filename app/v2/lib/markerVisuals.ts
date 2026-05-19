/** Off-white marker tint (not pure white). */
export const COLOR_REST = 0xf9f9f9;

export const COLOR_FEATURED = 0x73f36c;

export const COLOR_STICK = 0x4a9a44;

/** Half of the original 0.07 ratio. */
export const SPHERE_RADIUS_RATIO = 0.035;

export function stickDashSizes(cellPitch: number): {
  dashSize: number;
  gapSize: number;
  lineWidth: number;
} {
  return {
    dashSize: Math.max(0.02, cellPitch * 0.055),
    gapSize: Math.max(0.012, cellPitch * 0.032),
    lineWidth: Math.max(2.25, cellPitch * 2.4),
  };
}
