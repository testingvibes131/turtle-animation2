"use client";

import { useRef } from "react";
import {
  gridColRowToPixel,
  gridOffsets,
  type PixelPoint,
} from "@/features/home/components/commandCenterCanvas";
import {
  clamp,
  clamp01,
  drawFalloffDotGrid,
  GRID_ACCENT_COLOR,
  GRID_CONNECTOR_DOT_RADIUS,
  GRID_DOT_RADIUS,
  GRID_MAIN_DOT_RADIUS,
  GRID_SPACING,
  isInsideGridFalloff,
  smoothstep,
} from "@/features/home/components/commandCenterGrid";
import { useCommandCenterCanvasLoop } from "@/features/home/hooks/useCommandCenterCanvasLoop";

const PORTFOLIO_HUB_RADIUS = GRID_MAIN_DOT_RADIUS * 2;
const SPINE_RADIUS_MIN = GRID_DOT_RADIUS * 0.65;
const SPINE_RADIUS_MAX = GRID_CONNECTOR_DOT_RADIUS * 1.15;
const TRIANGLE_DOT_COLOR = "#f9f9f9";
const HUB_ROW_OFFSET = 3;
const SIDE_RED_DOT_COLOR = "#ff4d4d";
const SIDE_RED_DOT_COUNT = 2;

const SPINE_CASCADE_SPEED = 2.5;
const SPINE_CASCADE_STAGGER = 0.4;
const SPINE_SCALE_MIN = 0.38;
const SPINE_SCALE_MAX = 1.28;
const TRIANGLE_CASCADE_SPEED = 2.1;
const TRIANGLE_CASCADE_STAGGER = 0.28;
const RED_BLINK_SPEED = 1.35;
const RED_OFF_ALPHA = 0.06;

type SpineDot = PixelPoint & { row: number; baseRadius: number };
type TriangleDot = PixelPoint & { cascadeIndex: number };

type RedDotSlot = {
  side: "left" | "right";
  slot: number;
  blinkPhase: number;
  col: number;
  row: number;
  wasLit: boolean;
};

function spineColumnX(hubX: number, offsetX: number) {
  const col = Math.round((hubX - offsetX) / GRID_SPACING);
  return offsetX + col * GRID_SPACING;
}

function getHubPosition(width: number, height: number): PixelPoint {
  const { offsetX, offsetY } = gridOffsets(width, height);
  const cols = Math.ceil((width - offsetX) / GRID_SPACING) + 1;
  const rows = Math.ceil((height - offsetY) / GRID_SPACING) + 1;
  const centerCol = Math.round((width / 2 - offsetX) / GRID_SPACING);
  const centerRow = Math.round((height / 2 - offsetY) / GRID_SPACING);
  const hubCol = clamp(centerCol, 0, cols - 1);
  const hubRow = clamp(centerRow + HUB_ROW_OFFSET, 0, rows - 1);

  return {
    x: offsetX + hubCol * GRID_SPACING,
    y: offsetY + hubRow * GRID_SPACING,
  };
}

function sideRandom01(index: number, salt: number) {
  let h = (index * 374761393 + salt * 982451653) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967295;
}

function isTriangleGridCell(
  col: number,
  row: number,
  hub: PixelPoint,
  width: number,
  height: number,
) {
  const { offsetX, offsetY } = gridOffsets(width, height);
  const hubCol = Math.round((hub.x - offsetX) / GRID_SPACING);
  const hubRow = Math.round((hub.y - offsetY) / GRID_SPACING);
  const startRow = hubRow + 1;
  if (row < startRow) return false;

  const halfWidth = row - startRow;
  if (col < hubCol - halfWidth || col > hubCol + halfWidth) return false;

  const x = offsetX + col * GRID_SPACING;
  const y = offsetY + row * GRID_SPACING;
  return isInsideGridFalloff(x, y, hub.x, hub.y);
}

function randomGridCellOnSide(
  hub: PixelPoint,
  width: number,
  height: number,
  side: "left" | "right",
  slot: number,
  salt: number,
): { col: number; row: number } | null {
  const { offsetX, offsetY } = gridOffsets(width, height);
  const cols = Math.ceil((width - offsetX) / GRID_SPACING) + 1;
  const rows = Math.ceil((height - offsetY) / GRID_SPACING) + 1;
  const hubCol = Math.round((hub.x - offsetX) / GRID_SPACING);

  for (let attempt = 0; attempt < 60; attempt++) {
    const col =
      side === "left"
        ? Math.floor(
            sideRandom01(attempt, salt + slot * 17) * Math.max(1, hubCol - 1),
          )
        : hubCol +
          1 +
          Math.floor(
            sideRandom01(attempt, salt + slot * 23) *
              Math.max(1, cols - hubCol - 2),
          );
    const row = Math.floor(sideRandom01(attempt, salt + slot * 31) * rows);
    if (isTriangleGridCell(col, row, hub, width, height)) continue;

    const x = offsetX + col * GRID_SPACING;
    const y = offsetY + row * GRID_SPACING;
    if (!isInsideGridFalloff(x, y, hub.x, hub.y)) continue;
    return { col, row };
  }

  return null;
}

function createRedDotSlots(
  hub: PixelPoint,
  width: number,
  height: number,
): RedDotSlot[] {
  const slots: RedDotSlot[] = [];

  for (const side of ["left", "right"] as const) {
    for (let slot = 0; slot < SIDE_RED_DOT_COUNT; slot++) {
      const salt = side === "left" ? 11 : 29;
      const cell = randomGridCellOnSide(hub, width, height, side, slot, salt);
      if (!cell) continue;

      slots.push({
        side,
        slot,
        blinkPhase: sideRandom01(slot, salt + 5) * Math.PI * 2,
        col: cell.col,
        row: cell.row,
        wasLit: true,
      });
    }
  }

  return slots;
}

function retargetRedSlot(
  slot: RedDotSlot,
  hub: PixelPoint,
  width: number,
  height: number,
  saltOffset: number,
) {
  const salt = (slot.side === "left" ? 11 : 29) + saltOffset;
  for (let attempt = 0; attempt < 12; attempt++) {
    const next = randomGridCellOnSide(
      hub,
      width,
      height,
      slot.side,
      slot.slot,
      salt + attempt,
    );
    if (!next) continue;
    if (next.col === slot.col && next.row === slot.row) continue;
    slot.col = next.col;
    slot.row = next.row;
    return;
  }
}

function updateRedDotSlots(
  slots: RedDotSlot[],
  hub: PixelPoint,
  width: number,
  height: number,
  timeS: number,
) {
  for (const slot of slots) {
    const alpha = redDotVisibility(slot, timeS);
    const lit = alpha > RED_OFF_ALPHA;

    if (!lit && slot.wasLit) {
      retargetRedSlot(
        slot,
        hub,
        width,
        height,
        Math.floor(timeS * 10) + slot.slot,
      );
    }

    slot.wasLit = lit;
  }
}

function redDotVisibility(slot: RedDotSlot, timeS: number) {
  const wave = Math.sin(timeS * RED_BLINK_SPEED + slot.blinkPhase);
  return smoothstep(clamp01((wave + 0.15) / 0.55));
}

function drawSideRedDots(
  ctx: CanvasRenderingContext2D,
  slots: RedDotSlot[],
  hub: PixelPoint,
  width: number,
  height: number,
  timeS: number,
) {
  const { offsetX, offsetY } = gridOffsets(width, height);

  for (const slot of slots) {
    const alpha = redDotVisibility(slot, timeS);
    if (alpha <= 0.01) continue;

    if (isTriangleGridCell(slot.col, slot.row, hub, width, height)) continue;

    const { x, y } = gridColRowToPixel(slot.col, slot.row, offsetX, offsetY);
    if (!isInsideGridFalloff(x, y, hub.x, hub.y)) continue;

    ctx.fillStyle = SIDE_RED_DOT_COLOR;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, GRID_CONNECTOR_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function spineDotBaseRadius(row: number, hubRow: number) {
  if (hubRow <= 1) return SPINE_RADIUS_MAX;
  const towardTop = 1 - row / (hubRow - 1);
  return SPINE_RADIUS_MIN + (SPINE_RADIUS_MAX - SPINE_RADIUS_MIN) * towardTop;
}

function spineCascadeScale(row: number, hubRow: number, timeS: number) {
  const indexFromHub = hubRow - 1 - row;
  const phase = timeS * SPINE_CASCADE_SPEED - indexFromHub * SPINE_CASCADE_STAGGER;
  const pulse = 0.5 + 0.5 * Math.sin(phase);
  return SPINE_SCALE_MIN + (SPINE_SCALE_MAX - SPINE_SCALE_MIN) * pulse;
}

function getTopSpineDots(
  hub: PixelPoint,
  width: number,
  height: number,
): SpineDot[] {
  const { offsetX, offsetY } = gridOffsets(width, height);
  const x = spineColumnX(hub.x, offsetX);
  const hubRow = Math.round((hub.y - offsetY) / GRID_SPACING);
  const dots: SpineDot[] = [];

  for (let row = 0; row < hubRow; row++) {
    const y = offsetY + row * GRID_SPACING;
    if (!isInsideGridFalloff(x, y, hub.x, hub.y)) continue;

    dots.push({
      x,
      y,
      row,
      baseRadius: spineDotBaseRadius(row, hubRow),
    });
  }

  return dots;
}

function drawTopSpineDots(
  ctx: CanvasRenderingContext2D,
  dots: SpineDot[],
  hubRow: number,
  timeS: number,
) {
  ctx.fillStyle = GRID_ACCENT_COLOR;

  for (const dot of dots) {
    const scale = spineCascadeScale(dot.row, hubRow, timeS);
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.baseRadius * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getBottomTriangleDots(
  hub: PixelPoint,
  width: number,
  height: number,
): TriangleDot[] {
  const { offsetX, offsetY } = gridOffsets(width, height);
  const cols = Math.ceil((width - offsetX) / GRID_SPACING) + 1;
  const rows = Math.ceil((height - offsetY) / GRID_SPACING) + 1;
  const hubCol = Math.round((hub.x - offsetX) / GRID_SPACING);
  const hubRow = Math.round((hub.y - offsetY) / GRID_SPACING);
  const startRow = hubRow + 1;
  const dots: TriangleDot[] = [];

  for (let row = startRow, i = 0; row < rows; row++, i++) {
    const y = offsetY + row * GRID_SPACING;
    const centerX = offsetX + hubCol * GRID_SPACING;
    if (!isInsideGridFalloff(centerX, y, hub.x, hub.y)) break;

    const halfWidth = i;
    for (let col = hubCol - halfWidth; col <= hubCol + halfWidth; col++) {
      if (col < 0 || col >= cols) continue;
      const x = offsetX + col * GRID_SPACING;
      if (!isInsideGridFalloff(x, y, hub.x, hub.y)) continue;
      dots.push({ x, y, cascadeIndex: i });
    }
  }

  return dots;
}

function triangleCascadeOpacity(
  cascadeIndex: number,
  maxCascadeIndex: number,
  timeS: number,
) {
  const indexFromBottom = maxCascadeIndex - cascadeIndex;
  const phase =
    timeS * TRIANGLE_CASCADE_SPEED - indexFromBottom * TRIANGLE_CASCADE_STAGGER;
  return 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(phase));
}

function drawBottomTriangleDots(
  ctx: CanvasRenderingContext2D,
  dots: TriangleDot[],
  timeS: number,
) {
  const maxCascadeIndex = dots.reduce(
    (max, dot) => Math.max(max, dot.cascadeIndex),
    0,
  );

  for (const dot of dots) {
    const alpha = triangleCascadeOpacity(
      dot.cascadeIndex,
      maxCascadeIndex,
      timeS,
    );
    if (alpha <= 0.01) continue;

    ctx.fillStyle = TRIANGLE_DOT_COLOR;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, GRID_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function isTopSpineGridDot(
  x: number,
  y: number,
  hub: PixelPoint,
  width: number,
  height: number,
) {
  const { offsetX, offsetY } = gridOffsets(width, height);
  const spineX = spineColumnX(hub.x, offsetX);
  const hubRow = Math.round((hub.y - offsetY) / GRID_SPACING);
  const row = Math.round((y - offsetY) / GRID_SPACING);
  return (
    Math.abs(x - spineX) < 0.5 &&
    row >= 0 &&
    row < hubRow &&
    isInsideGridFalloff(x, y, hub.x, hub.y)
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeS: number,
  redSlots: RedDotSlot[],
) {
  ctx.clearRect(0, 0, width, height);

  const hub = getHubPosition(width, height);
  const { offsetY } = gridOffsets(width, height);
  const hubRow = Math.round((hub.y - offsetY) / GRID_SPACING);
  const topSpineDots = getTopSpineDots(hub, width, height);
  const bottomTriangleDots = getBottomTriangleDots(hub, width, height);

  updateRedDotSlots(redSlots, hub, width, height, timeS);

  drawFalloffDotGrid(ctx, width, height, hub.x, hub.y, (x, y) =>
    isTopSpineGridDot(x, y, hub, width, height),
  );

  drawBottomTriangleDots(ctx, bottomTriangleDots, timeS);
  drawTopSpineDots(ctx, topSpineDots, hubRow, timeS);
  drawSideRedDots(ctx, redSlots, hub, width, height, timeS);

  ctx.fillStyle = GRID_ACCENT_COLOR;
  ctx.beginPath();
  ctx.arc(hub.x, hub.y, PORTFOLIO_HUB_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

export function PortfolioFeatureCanvas() {
  const redSlotsRef = useRef<RedDotSlot[]>([]);
  const layoutKeyRef = useRef("");

  const { containerRef, canvasRef } = useCommandCenterCanvasLoop(
    ({ ctx, width, height, timeS }) => {
      const layoutKey = `${width}x${height}`;
      if (layoutKeyRef.current !== layoutKey) {
        layoutKeyRef.current = layoutKey;
        const hub = getHubPosition(width, height);
        redSlotsRef.current = createRedDotSlots(hub, width, height);
      }

      drawScene(ctx, width, height, timeS, redSlotsRef.current);
    },
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
