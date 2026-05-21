export type AprRange = { min: number; max: number };

export function getAprRangeFromAprValues(aprValues: number[]): AprRange {
  return getAprRange(aprValues.map((estAprPercent) => ({ estAprPercent })));
}

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
  const clamped = aprToLinearT(apr, range);
  const smooth = clamped * clamped * (3 - 2 * clamped);
  const blended = clamped * 0.38 + smooth * 0.62;
  return blended * maxHeight;
}

/** Linear 0–1 from APR across the dataset range. */
export function aprToLinearT(apr: number, range: AprRange): number {
  const span = range.max - range.min;
  const t = span > 0 ? (apr - range.min) / span : 0;
  return Math.max(0, Math.min(1, t));
}

/** Log-space 0–1 (wide APR spreads like 2%→60% read more evenly). */
export function aprToLogLinearT(apr: number, range: AprRange): number {
  if (!(apr > 0)) return 0;
  const lo = Math.max(range.min, 1e-6);
  const hi = Math.max(range.max, lo * 1.001);
  const v = Math.max(apr, lo);
  const span = Math.log(hi) - Math.log(lo);
  const t = span > 0 ? (Math.log(v) - Math.log(lo)) / span : 0;
  return Math.max(0, Math.min(1, t));
}

/** APR range for featured sticks: anchor at 0% so height scales vs dataset max only. */
export function featuredStickAprRange(range: AprRange): AprRange {
  return { min: 0, max: Math.max(range.max, 1e-6) };
}

/** Log-scale floor (%) for stick height; 0% stays at zero. Values below floor map like the floor. */
export const STICK_HEIGHT_LOG_FLOOR_APR = 1;

/**
 * 0–1 stick factor: 0% → 0; otherwise log-normalized from 1% → dataset max.
 * Spreads mid APRs (e.g. 2% vs 12% vs 60%) without crushing everything but the top.
 */
export function aprToStickHeightT(
  apr: number,
  range: AprRange,
  logFloorApr = STICK_HEIGHT_LOG_FLOOR_APR,
): number {
  if (!(apr > 0)) return 0;
  const { max } = featuredStickAprRange(range);
  const lo = Math.max(logFloorApr, 1e-6);
  const hi = Math.max(max, lo * 1.001);
  const v = Math.max(apr, lo);
  const span = Math.log(hi) - Math.log(lo);
  if (span <= 0) return apr >= hi ? 1 : 0;
  const t = (Math.log(v) - Math.log(lo)) / span;
  return Math.max(0, Math.min(1, t));
}

/**
 * Exponential 0–1: low APR compressed, high APR stretched.
 * `rate` controls curvature (higher = steeper toward max).
 */
export function aprToExponentialT(
  apr: number,
  range: AprRange,
  rate = 3,
  linearT: (apr: number, range: AprRange) => number = aprToLinearT,
): number {
  const t = linearT(apr, range);
  if (rate <= 0) return t;
  const k = rate;
  return (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
}

/** Grayscale 0–1 from normalized APR (for B&W shading). */
export function aprToGray(apr: number, range: AprRange): number {
  return aprToLinearT(apr, range);
}
