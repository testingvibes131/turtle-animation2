/** Smooth 0–1 ramp; 1 at `near` and below, 0 at `far` and beyond. */
export function depthSizeMix(
  distance: number,
  near: number,
  far: number,
): number {
  if (far <= near) return distance <= near ? 1 : 0;
  const t = (distance - far) / (near - far);
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}

export function depthSizeMultiplier(
  distance: number,
  near: number,
  far: number,
  minMul: number,
  maxMul: number,
): number {
  const mix = depthSizeMix(distance, near, far);
  return minMul + mix * (maxMul - minMul);
}
