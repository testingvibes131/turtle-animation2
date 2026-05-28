import { GRID_SPACING } from "@/features/home/components/commandCenterGrid";

export type GridCell = { row: number; col: number };
export type PixelPoint = { x: number; y: number };
export type PixelRect = { minX: number; minY: number; maxX: number; maxY: number };
export type CanvasSize = { width: number; height: number };

export function gridOffsets(width: number, height: number) {
  return {
    offsetX: (width % GRID_SPACING) / 2,
    offsetY: (height % GRID_SPACING) / 2,
  };
}

export function getGridDimensions(width: number, height: number) {
  const { offsetX, offsetY } = gridOffsets(width, height);
  return {
    offsetX,
    offsetY,
    cols: Math.ceil((width - offsetX) / GRID_SPACING) + 1,
    rows: Math.ceil((height - offsetY) / GRID_SPACING) + 1,
  };
}

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  container: HTMLDivElement,
): CanvasSize | null {
  const { width, height } = container.getBoundingClientRect();
  if (width === 0 || height === 0) return null;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

export function cellsEqual(a: GridCell, b: GridCell) {
  return a.row === b.row && a.col === b.col;
}

export function findNearestGridCell(
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
  rows: number,
  cols: number,
): GridCell {
  let nearestRow = 0;
  let nearestCol = 0;
  let minDistSq = Infinity;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = offsetX + col * GRID_SPACING;
      const py = offsetY + row * GRID_SPACING;
      const distSq = (px - x) ** 2 + (py - y) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearestRow = row;
        nearestCol = col;
      }
    }
  }

  return { row: nearestRow, col: nearestCol };
}

export function gridCellToPixel(
  cell: GridCell,
  offsetX: number,
  offsetY: number,
): PixelPoint {
  return {
    x: offsetX + cell.col * GRID_SPACING,
    y: offsetY + cell.row * GRID_SPACING,
  };
}

export function gridColRowToPixel(
  col: number,
  row: number,
  offsetX: number,
  offsetY: number,
): PixelPoint {
  return {
    x: offsetX + col * GRID_SPACING,
    y: offsetY + row * GRID_SPACING,
  };
}
