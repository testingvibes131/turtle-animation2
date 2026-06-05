/** Case-study chart grids — Command Center dot size and spacing. */

import {
  GRID_DOT_RADIUS,
  GRID_SPACING,
} from "@/features/home/components/commandCenterGrid";

export { GRID_DOT_RADIUS, GRID_SPACING };

/** Case-study charts — half the Command Center pitch, same dot size. */
export const CHART_GRID_SPACING = GRID_SPACING / 2;

/** One empty cell between the canvas edge and the dot field on every side. */
export const CHART_GRID_MARGIN_CELLS = 1;

/** Muted grid dots — visible but subdued (not as bright as lit cells). */
export const CHART_MUTED_DOT_COLOR = "rgba(200, 200, 200, 0.1)";

export function getChartGridLayout(width: number, height: number) {
  const offsetX = (width % CHART_GRID_SPACING) / 2;
  const offsetY = (height % CHART_GRID_SPACING) / 2;
  const cols = Math.ceil((width - offsetX) / CHART_GRID_SPACING) + 1;
  const rows = Math.ceil((height - offsetY) / CHART_GRID_SPACING) + 1;
  return { offsetX, offsetY, cols, rows };
}

export function chartGridMarginPx(marginCells = CHART_GRID_MARGIN_CELLS) {
  return marginCells * CHART_GRID_SPACING;
}

/** Dot centers at least one cell inset from every canvas edge (pixel-accurate). */
export function isInsideChartMargin(
  x: number,
  y: number,
  width: number,
  height: number,
  marginCells = CHART_GRID_MARGIN_CELLS,
) {
  const pad = chartGridMarginPx(marginCells);
  return x >= pad && y >= pad && x <= width - pad && y <= height - pad;
}

/**
 * Index range of grid cells whose centers sit inside the margin on all four sides.
 */
export function chartGridInsetForCanvas(
  width: number,
  height: number,
  marginCells = CHART_GRID_MARGIN_CELLS,
) {
  const { offsetX, offsetY, cols, rows } = getChartGridLayout(width, height);
  const pitch = CHART_GRID_SPACING;

  let colStart = -1;
  let colEnd = -1;
  let rowStart = -1;
  let rowEnd = -1;

  for (let col = 0; col < cols; col++) {
    const x = offsetX + col * pitch;
    if (!isInsideChartMargin(x, offsetY, width, height, marginCells)) continue;
    if (colStart < 0) colStart = col;
    colEnd = col + 1;
  }

  for (let row = 0; row < rows; row++) {
    const y = offsetY + row * pitch;
    if (!isInsideChartMargin(offsetX, y, width, height, marginCells)) continue;
    if (rowStart < 0) rowStart = row;
    rowEnd = row + 1;
  }

  if (colStart < 0) colStart = marginCells;
  if (colEnd < 0) colEnd = cols - marginCells;
  if (rowStart < 0) rowStart = marginCells;
  if (rowEnd < 0) rowEnd = rows - marginCells;

  return {
    offsetX,
    offsetY,
    cols,
    rows,
    colStart,
    colEnd,
    rowStart,
    rowEnd,
    innerCols: Math.max(0, colEnd - colStart),
    innerRows: Math.max(0, rowEnd - rowStart),
  };
}

export function chartGridCellCenter(
  offsetX: number,
  offsetY: number,
  col: number,
  row: number,
) {
  return {
    x: offsetX + col * CHART_GRID_SPACING,
    y: offsetY + row * CHART_GRID_SPACING,
  };
}

/** Lit / muted dot center in screen space — same grid the background uses. */
export function chartLitCellCenter(
  width: number,
  height: number,
  col: number,
  row: number,
) {
  const { offsetX, offsetY } = getChartGridLayout(width, height);
  return chartGridCellCenter(offsetX, offsetY, col, row);
}

/**
 * Bottom-align a bar strip on the inset canvas grid, centered by column index.
 */
export function alignBarChartLayoutToCanvas(
  width: number,
  height: number,
  layoutColCount: number,
  layoutRowCount: number,
  marginCells = CHART_GRID_MARGIN_CELLS,
) {
  const grid = getChartGridLayout(width, height);
  const inset = chartGridInsetForCanvas(width, height, marginCells);

  const targetBottomRow = inset.rowEnd - 1;
  const gridRow0 = Math.max(
    inset.rowStart,
    targetBottomRow - (layoutRowCount - 1),
  );

  const gridCol0 =
    inset.colStart +
    Math.max(0, Math.floor((inset.innerCols - layoutColCount) / 2));

  return { grid, gridCol0, gridRow0, inset };
}

export function chartAlignedBarCellCenter(
  grid: ReturnType<typeof getChartGridLayout>,
  gridCol0: number,
  gridRow0: number,
  col: number,
  row: number,
) {
  return chartGridCellCenter(
    grid.offsetX,
    grid.offsetY,
    gridCol0 + col,
    gridRow0 + row,
  );
}

export function drawChartMutedGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dotRadius = GRID_DOT_RADIUS,
  skip?: (col: number, row: number, x: number, y: number) => boolean,
) {
  const { offsetX, offsetY, cols, rows } = getChartGridLayout(width, height);
  const { colStart, colEnd, rowStart, rowEnd } = chartGridInsetForCanvas(
    width,
    height,
  );

  ctx.save();
  ctx.fillStyle = CHART_MUTED_DOT_COLOR;

  for (let row = rowStart; row < rowEnd; row++) {
    for (let col = colStart; col < colEnd; col++) {
      const { x, y } = chartGridCellCenter(offsetX, offsetY, col, row);
      if (skip?.(col, row, x, y)) continue;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
