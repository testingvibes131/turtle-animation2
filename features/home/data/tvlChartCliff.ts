import { tvlChartDots } from "@/features/home/data/tvlChartDots";

const GRID_STEP = 17;
const VIEWBOX_W = 534;
const VIEWBOX_H = 380;

/** Top-right quadrant of the chart (peak must fall inside). */
export const QUARTER_CX_MIN = VIEWBOX_W / 2;
export const QUARTER_CY_MAX = VIEWBOX_H / 2;

export type CornerSwap = { peak: number; face: number };

function buildCornerSwaps(): CornerSwap[] {
  const byCx = new Map<number, { index: number; cy: number }[]>();
  for (let i = 0; i < tvlChartDots.length; i++) {
    const { cx, cy } = tvlChartDots[i];
    const col = byCx.get(cx) ?? [];
    col.push({ index: i, cy });
    byCx.set(cx, col);
  }

  const swaps: CornerSwap[] = [];

  for (const [cx, col] of byCx) {
    if (cx < QUARTER_CX_MIN) continue;

    const peak = col.reduce((a, b) => (b.cy < a.cy ? b : a));
    if (peak.cy > QUARTER_CY_MAX) continue;

    const face = col.find((d) => d.cy === peak.cy + GRID_STEP);
    if (face && face.index !== peak.index) {
      swaps.push({ peak: peak.index, face: face.index });
    }
  }

  return swaps.sort((a, b) => tvlChartDots[a.peak].cx - tvlChartDots[b.peak].cx);
}

export const cornerSwaps = buildCornerSwaps();

/** Cliff peak — off in grown shape; face below stays on (no vertical gap). */
export const peakOffInGrown = new Set(cornerSwaps.map((s) => s.peak));
