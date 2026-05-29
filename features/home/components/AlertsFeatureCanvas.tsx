/** Command Center card: Diligenced Deals (`visual: "deals"`). */
"use client";

import { useEffect, useRef } from "react";
import {
  getGridDimensions,
  type GridCell,
} from "@/features/home/components/commandCenterCanvas";
import {
  cellOrganicUnit,
  GRID_CONNECTOR_DOT_RADIUS,
  GRID_DOT_RADIUS,
  GRID_MIN_VISIBLE_ALPHA,
  GRID_MIN_VISIBLE_RADIUS,
  GRID_MODIFIER_ZONE_PIXEL_RADIUS,
  GRID_SPACING,
  gridDotAppearance,
  isInsideModifierZone,
} from "@/features/home/components/commandCenterGrid";
import {
  createFlyBounds,
  createZoneCenterState,
  FlyingMainDot,
  resolveStickyZoneHub,
  stepZoneCenter,
} from "@/features/home/components/commandCenterZoneDriver";
import {
  drawCommandCenterMagnifyingRing,
  loadCommandCenterMagnifyingImage,
} from "@/features/home/components/commandCenterMagnifyingRing";
import { drawGreenGlowCircle } from "@/features/home/components/commandCenterGreenGlow";
import { useCommandCenterCanvasLoop } from "@/features/home/hooks/useCommandCenterCanvasLoop";

const FLY_BOUNDS_MARGIN = GRID_DOT_RADIUS * 4;

const ALERTS_MODIFIER_ZONE_SCALE = 0.88;
const ALERTS_MODIFIER_ZONE_PIXEL_RADIUS =
  GRID_MODIFIER_ZONE_PIXEL_RADIUS * ALERTS_MODIFIER_ZONE_SCALE;

const DIAMOND_GREEN_RADIUS_CENTER = GRID_CONNECTOR_DOT_RADIUS * 1.5;
const DIAMOND_GREEN_RADIUS_EDGE = GRID_DOT_RADIUS * 0.95;
const DIAMOND_PULSE_SPEED = 1.75;
const DIAMOND_PULSE_STAGGER = 0.48;
const DIAMOND_MIN_VISIBILITY = 0.62;
const ALERTS_GREEN_VISIBILITY_BOOST = 1.2;

function isDiamondGreenDot(col: number, row: number, hubCol: number, hubRow: number) {
  const dr = Math.abs(row - hubRow);
  const dc = Math.abs(col - hubCol);
  return dr + dc <= 2;
}

function diamondGreenRadius(col: number, row: number, hubCol: number, hubRow: number) {
  const dist = Math.abs(row - hubRow) + Math.abs(col - hubCol);
  const t = dist / 2;
  return (
    DIAMOND_GREEN_RADIUS_CENTER +
    (DIAMOND_GREEN_RADIUS_EDGE - DIAMOND_GREEN_RADIUS_CENTER) * t
  );
}

function diamondGreenVisibility(
  col: number,
  row: number,
  hubCol: number,
  hubRow: number,
  timeS: number,
) {
  const dist = Math.abs(row - hubRow) + Math.abs(col - hubCol);
  const wobble = (cellOrganicUnit(row, col) - 0.5) * 0.22;
  const phase = timeS * DIAMOND_PULSE_SPEED - dist * DIAMOND_PULSE_STAGGER + wobble;
  const pulse = 0.5 + 0.5 * Math.sin(phase);
  return DIAMOND_MIN_VISIBILITY + (1 - DIAMOND_MIN_VISIBILITY) * pulse;
}

function drawModifierZoneCircle(
  ctx: CanvasRenderingContext2D,
  zoneX: number,
  zoneY: number,
) {
  const zoneDiameter = ALERTS_MODIFIER_ZONE_PIXEL_RADIUS * 2;

  drawCommandCenterMagnifyingRing(ctx, zoneX, zoneY, zoneDiameter);
}

function drawModifierMutedGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoneX: number,
  zoneY: number,
  hubCol: number,
  hubRow: number,
) {
  const { offsetX, offsetY, rows, cols } = getGridDimensions(width, height);
  const zoneRadius = ALERTS_MODIFIER_ZONE_PIXEL_RADIUS;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (
        isInsideModifierZone(
          offsetX + col * GRID_SPACING,
          offsetY + row * GRID_SPACING,
          zoneX,
          zoneY,
          zoneRadius,
        ) &&
        isDiamondGreenDot(col, row, hubCol, hubRow)
      ) {
        continue;
      }

      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      const { radius, alpha } = gridDotAppearance(
        x,
        y,
        zoneX,
        zoneY,
        zoneRadius,
      );
      if (radius < GRID_MIN_VISIBLE_RADIUS || alpha < GRID_MIN_VISIBLE_ALPHA) {
        continue;
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDiamondGreenDots(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoneX: number,
  zoneY: number,
  hubCol: number,
  hubRow: number,
  timeS: number,
) {
  const { offsetX, offsetY, rows, cols } = getGridDimensions(width, height);
  const zoneRadius = ALERTS_MODIFIER_ZONE_PIXEL_RADIUS;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (
        !isInsideModifierZone(
          offsetX + col * GRID_SPACING,
          offsetY + row * GRID_SPACING,
          zoneX,
          zoneY,
          zoneRadius,
        ) ||
        !isDiamondGreenDot(col, row, hubCol, hubRow)
      ) {
        continue;
      }

      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      const visibility = Math.min(
        1,
        diamondGreenVisibility(col, row, hubCol, hubRow, timeS) *
          ALERTS_GREEN_VISIBILITY_BOOST,
      );
      const baseRadius = diamondGreenRadius(col, row, hubCol, hubRow);
      const radius = baseRadius * (0.92 + 0.14 * visibility);

      drawGreenGlowCircle(ctx, x, y, radius, visibility);
    }
  }
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mainDot: FlyingMainDot,
  dt: number,
  timeS: number,
  zoneHubRef: { current: GridCell | null },
  zoneCenterState: ReturnType<typeof createZoneCenterState>,
) {
  ctx.clearRect(0, 0, width, height);

  mainDot.setBounds(createFlyBounds(width, height, FLY_BOUNDS_MARGIN));
  mainDot.update(dt);
  const { x: mainX, y: mainY } = mainDot.getPosition();

  const { offsetX, offsetY, rows, cols } = getGridDimensions(width, height);
  const hub = resolveStickyZoneHub(
    zoneHubRef,
    mainX,
    mainY,
    offsetX,
    offsetY,
    rows,
    cols,
  );
  const zoneCenter = stepZoneCenter(
    zoneCenterState,
    hub,
    offsetX,
    offsetY,
    dt,
  );

  drawModifierMutedGrid(
    ctx,
    width,
    height,
    zoneCenter.x,
    zoneCenter.y,
    hub.col,
    hub.row,
  );
  drawModifierZoneCircle(ctx, zoneCenter.x, zoneCenter.y);
  drawDiamondGreenDots(
    ctx,
    width,
    height,
    zoneCenter.x,
    zoneCenter.y,
    hub.col,
    hub.row,
    timeS,
  );
}

export function AlertsFeatureCanvas() {
  useEffect(() => {
    loadCommandCenterMagnifyingImage();
  }, []);

  const mainDotRef = useRef(
    new FlyingMainDot({ minX: 0, minY: 0, maxX: 0, maxY: 0 }),
  );
  const zoneHubRef = useRef<GridCell | null>(null);
  const zoneCenterStateRef = useRef(createZoneCenterState());

  const { containerRef, canvasRef } = useCommandCenterCanvasLoop(
    ({ ctx, width, height, dt, timeS }) => {
      drawScene(
        ctx,
        width,
        height,
        mainDotRef.current,
        dt,
        timeS,
        zoneHubRef,
        zoneCenterStateRef.current,
      );
    },
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
