import type { CaseStudy } from "@/features/home/data/caseStudies";

export type CaseStudyTvlChartVariant = CaseStudy["id"];

type Point = { x: number; y: number };

/** Catmull-Rom → cubic Bézier for softer peaks while keeping volatility. */
function pointsToSmoothLinePath(points: Point[], tension = 4.2): string {
  if (points.length < 2) return "";
  const first = points[0];
  let path = `M${first.x},${first.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / tension;
    const cp1y = p1.y + (p2.y - p0.y) / tension;
    const cp2x = p2.x - (p3.x - p1.x) / tension;
    const cp2y = p2.y - (p3.y - p1.y) / tension;

    path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return path;
}

function buildVolatileTvlPoints(seed: number): Point[] {
  const segments = 64;
  const points: Point[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = Math.round(t * 320);
    const trend = 148 - Math.pow(t, 0.88) * 116;
    const major = Math.sin(t * 4 * Math.PI + seed) * (20 + 6 * Math.cos(t * Math.PI));
    const mid = Math.sin(t * 10.5 * Math.PI + seed * 1.25) * 16;
    const fine = Math.sin(t * 24 * Math.PI + seed * 2.05) * 11;
    const teeth = Math.sin(t * 38 * Math.PI + seed * 3.1) * 7;
    const teeth2 = Math.sin(t * 55 * Math.PI + seed * 4.2) * 4;

    let y = trend + major + mid + fine + teeth + teeth2;
    if (i <= 2) {
      y = 150 + Math.sin(i * 2.5 + seed) * 5;
    }

    y = Math.round(Math.max(27, Math.min(154, y)));
    points.push({ x, y });
  }

  return points;
}

/** Dense volatile ascending line (sparkline-style) for viewBox 320×168. */
export function buildVolatileTvlLinePath(seed: number): string {
  return pointsToSmoothLinePath(buildVolatileTvlPoints(seed));
}

export const TVL_LINE_PATHS: Record<CaseStudyTvlChartVariant, string> = {
  avalanche: buildVolatileTvlLinePath(0),
  katana: buildVolatileTvlLinePath(2.17),
  decibel: buildVolatileTvlLinePath(4.83),
};

export function tvlAreaPath(line: string): string {
  return `${line} L320,168 L0,168 Z`;
}
