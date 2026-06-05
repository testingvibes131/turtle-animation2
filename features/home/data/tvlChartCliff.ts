import {
  TVL_CHART_VB_H,
  TVL_CHART_VB_W,
  tvlChartLitPath,
} from "@/features/home/data/tvlChartGridPath";

/** Top-right quadrant of the chart (peak must fall inside). */
export const QUARTER_CX_MIN = TVL_CHART_VB_W / 2;
export const QUARTER_CY_MAX = TVL_CHART_VB_H / 2;

export type CornerSwap = { peak: number; face: number };

function buildCornerSwaps(): CornerSwap[] {
  const byCol = new Map<number, { index: number; row: number; y: number }[]>();

  for (let i = 0; i < tvlChartLitPath.length; i++) {
    const { col, row, y } = tvlChartLitPath[i];
    const column = byCol.get(col) ?? [];
    column.push({ index: i, row, y });
    byCol.set(col, column);
  }

  const swaps: CornerSwap[] = [];

  for (const [, column] of byCol) {
    const gridX = tvlChartLitPath[column[0].index].x;
    if (gridX < QUARTER_CX_MIN) continue;

    const peak = column.reduce((a, b) => (b.row < a.row ? b : a));
    if (peak.y > QUARTER_CY_MAX) continue;

    const face = column.find((d) => d.row === peak.row + 1);
    if (face && face.index !== peak.index) {
      swaps.push({ peak: peak.index, face: face.index });
    }
  }

  return swaps.sort(
    (a, b) => tvlChartLitPath[a.peak].x - tvlChartLitPath[b.peak].x,
  );
}

export const cornerSwaps = buildCornerSwaps();

/** Cliff peak — off in grown shape; face below stays on (no vertical gap). */
export const peakOffInGrown = new Set(cornerSwaps.map((s) => s.peak));
