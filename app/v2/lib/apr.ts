export type AprRange = { min: number; max: number };

export function getAprRange(
  rows: { estAprPercent: number }[],
): AprRange {
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const apr = row.estAprPercent;
    if (!Number.isFinite(apr)) continue;
    min = Math.min(min, apr);
    max = Math.max(max, apr);
  }
  if (!Number.isFinite(min)) return { min: 0, max: 1 };
  if (min === max) return { min, max: min + 1 };
  return { min, max };
}

/**
 * Map APR into terrain height with smooth rolling relief.
 * Smoothstep keeps transitions gradual; a touch of linear preserves contrast.
 */
export function aprToHeight(
  apr: number,
  range: AprRange,
  maxHeight: number,
): number {
  const span = range.max - range.min;
  const t = span > 0 ? (apr - range.min) / span : 0;
  const clamped = Math.max(0, Math.min(1, t));
  const smooth = clamped * clamped * (3 - 2 * clamped);
  const blended = clamped * 0.38 + smooth * 0.62;
  return blended * maxHeight;
}

/** Grayscale 0–1 from normalized APR (for B&W shading). */
export function aprToGray(apr: number, range: AprRange): number {
  const span = range.max - range.min;
  const t = span > 0 ? (apr - range.min) / span : 0;
  return Math.max(0, Math.min(1, t));
}
