import { GRID_SPACING } from "@/features/home/components/commandCenterGrid";

/** Figma Card-Deals visual — width / height. */
export const COMMAND_CENTER_VISUAL_ASPECT = 570 / 499;

/** Figma Card-Deals / chart visual inset — top-left to bottom-right. */
export const COMMAND_CENTER_CANVAS_BG = "#161716";
export const VISUAL_CANVAS_GRADIENT_START = "#2D2E2D";
export const VISUAL_CANVAS_GRADIENT_END = "#161716";

/** Tailwind classes for non-canvas chart / feature frames. */
export const visualCanvasBgClass =
  "bg-[#161716] [background-image:linear-gradient(to_bottom_right,#2D2E2D_0%,#161716_100%)]";

export function drawVisualCanvasBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, VISUAL_CANVAS_GRADIENT_START);
  gradient.addColorStop(1, VISUAL_CANVAS_GRADIENT_END);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export type GridCell = { row: number; col: number };
export type PixelPoint = { x: number; y: number };
export type PixelRect = { minX: number; minY: number; maxX: number; maxY: number };
export type CanvasSize = { width: number; height: number; dpr: number };

/** Touch viewports — 1× buffer to save GPU memory next to the WebGL blob. */
export const COMMAND_CENTER_MOBILE_QUERY = "(max-width: 1023px)";

/** Desktop cap — iPhone reports 3 but we never exceed 2 on large screens. */
export const COMMAND_CENTER_CANVAS_MAX_DPR = 2;

/** Max CSS-side length before DPR scaling (guards runaway getBoundingClientRect). */
export const COMMAND_CENTER_CANVAS_MAX_CSS_PX = 600;

export function getCommandCenterCanvasDpr() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia(COMMAND_CENTER_MOBILE_QUERY).matches
  ) {
    return 1;
  }
  return Math.min(window.devicePixelRatio || 1, COMMAND_CENTER_CANVAS_MAX_DPR);
}

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

export function clearCommandCenterCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  drawVisualCanvasBackground(ctx, width, height);
}

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  container: HTMLDivElement,
): CanvasSize | null {
  const containerRect = container.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  let width =
    containerRect.width ||
    canvasRect.width ||
    container.clientWidth ||
    container.offsetWidth;
  let height =
    containerRect.height ||
    canvasRect.height ||
    container.clientHeight ||
    container.offsetHeight;

  if (height <= 0 && width > 0) {
    height = width / COMMAND_CENTER_VISUAL_ASPECT;
  }

  if (width <= 0 && container.parentElement) {
    width = container.parentElement.clientWidth;
  }

  if (height <= 0 && container.parentElement) {
    height = container.parentElement.clientHeight;
  }

  if (width <= 0 || height <= 0) return null;

  width = Math.min(width, COMMAND_CENTER_CANVAS_MAX_CSS_PX);
  height = Math.min(height, COMMAND_CENTER_CANVAS_MAX_CSS_PX);

  const dpr = getCommandCenterCanvasDpr();
  const bufferW = Math.max(1, Math.round(width * dpr));
  const bufferH = Math.max(1, Math.round(height * dpr));

  if (canvas.width !== bufferW || canvas.height !== bufferH) {
    canvas.width = bufferW;
    canvas.height = bufferH;
  }

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { width, height, dpr };
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
