import { CHART_GRID_SPACING } from "@/features/home/components/chartCanvasGrid";
import { tvlChartDots } from "@/features/home/data/tvlChartDots";

export const TVL_CHART_VB_W = 534;
export const TVL_CHART_VB_H = 380;

export type TvlChartLitCell = {
  col: number;
  row: number;
  x: number;
  y: number;
};

export function tvlChartGridOffset(
  width = TVL_CHART_VB_W,
  height = TVL_CHART_VB_H,
) {
  return {
    offsetX: (width % CHART_GRID_SPACING) / 2,
    offsetY: (height % CHART_GRID_SPACING) / 2,
  };
}

export function snapTvlPointToGrid(
  cx: number,
  cy: number,
  width = TVL_CHART_VB_W,
  height = TVL_CHART_VB_H,
): TvlChartLitCell {
  const { offsetX, offsetY } = tvlChartGridOffset(width, height);
  const col = Math.round((cx - offsetX) / CHART_GRID_SPACING);
  const row = Math.round((cy - offsetY) / CHART_GRID_SPACING);
  return {
    col,
    row,
    x: offsetX + col * CHART_GRID_SPACING,
    y: offsetY + row * CHART_GRID_SPACING,
  };
}

function buildTvlLitPath(): TvlChartLitCell[] {
  const seen = new Set<string>();
  const path: TvlChartLitCell[] = [];

  for (const { cx, cy } of tvlChartDots) {
    const cell = snapTvlPointToGrid(cx, cy);
    const key = `${cell.col},${cell.row}`;
    if (seen.has(key)) continue;
    seen.add(key);
    path.push(cell);
  }

  return path;
}

/** TVL curve on the Command Center grid, deduped in path order. */
export const tvlChartLitPath = buildTvlLitPath();
