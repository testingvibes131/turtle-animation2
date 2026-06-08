/** Command Center card: Aggregated Portfolio (`visual: "portfolio"`). */
"use client";

import { useRef } from "react";
import {
  clearCommandCenterCanvas,
  getGridDimensions,
  type GridCell,
  type PixelPoint,
} from "@/features/home/components/commandCenterCanvas";
import {
  cellKey,
  cellOrganicUnit,
  clamp01,
  distanceFromZoneCenter,
  GRID_CONNECTOR_DOT_RADIUS,
  GRID_MIN_VISIBLE_ALPHA,
  GRID_MIN_VISIBLE_RADIUS,
  GRID_MAIN_DOT_RADIUS,
  GRID_MODIFIER_ZONE_PIXEL_RADIUS,
  GRID_SPACING,
  gridDotAppearance,
  isInsideModifierZone,
  smoothstep,
} from "@/features/home/components/commandCenterGrid";
import {
  advanceSpiderGait,
  initSpiderLegs,
  legDisplayPosition,
  SPIDER_LEG_COUNT,
  type RingCell,
  type SpiderLegSlot,
} from "@/features/home/components/commandCenterSpiderGait";
import {
  createFlyBounds,
  createZoneCenterState,
  FlyingMainDot,
  resolveStickyZoneHub,
  stepZoneCenter,
} from "@/features/home/components/commandCenterZoneDriver";
import { drawGreenGlowCircle } from "@/features/home/components/commandCenterGreenGlow";
import {
  COMMAND_CENTER_TURTLE_HALF_EXTENT,
  drawCommandCenterTurtleMark,
} from "@/features/home/components/commandCenterTurtleMark";
import { useCommandCenterCanvasLoop } from "@/features/home/hooks/useCommandCenterCanvasLoop";

const CONNECTOR_LINE_WIDTH = 1;
const CONNECTOR_LINE_COLOR = "rgba(171, 174, 170, 1)";
const CONNECTOR_LINE_DASH: [number, number] = [2, 3];
const CONNECTOR_PRESENCE_IN_S = 0.5;
const CONNECTOR_STAGGER_MAX = 0.22;
/** Connector band as fraction of modifier-zone radius (inner → outer). */
const CONNECTOR_RING_MIN = 0.58;
const CONNECTOR_RING_MAX = 0.76;
const CONNECTOR_RING_IDEAL =
  (CONNECTOR_RING_MIN + CONNECTOR_RING_MAX) * 0.5;
const CONNECTOR_COUNT = SPIDER_LEG_COUNT;
const PORTFOLIO_FLY_MARGIN =
  COMMAND_CENTER_TURTLE_HALF_EXTENT * 1.35 + GRID_SPACING * 1.5;
const PORTFOLIO_ZONE_CENTER_LERP = 11;
/** Low-pass body velocity so foot targets align with drift direction. */
const PORTFOLIO_TRAVEL_SMOOTH_RATE = 2.4;

const PORTFOLIO_CONNECTOR_RADIUS_MIN = 0.88;
const PORTFOLIO_CONNECTOR_RADIUS_PULSE = 0.1;
const PORTFOLIO_GREEN_VISIBILITY_BOOST = 1.15;

function slotStaggerDelay(slotIndex: number, row: number, col: number) {
  return (
    (slotIndex / CONNECTOR_COUNT) * CONNECTOR_STAGGER_MAX +
    cellOrganicUnit(row, col) * CONNECTOR_STAGGER_MAX * 0.45
  );
}

function slotPresence(slot: SpiderLegSlot, timeS: number, slotIndex: number) {
  const delay = slotStaggerDelay(slotIndex, slot.row, slot.col);
  const elapsed = timeS - slot.presenceStart - delay;
  if (elapsed <= 0) return 0;
  return smoothstep(clamp01(elapsed / CONNECTOR_PRESENCE_IN_S));
}

function isOnConnectorRing(
  dotX: number,
  dotY: number,
  bodyX: number,
  bodyY: number,
) {
  if (!isInsideModifierZone(dotX, dotY, bodyX, bodyY)) return false;
  const dist = distanceFromZoneCenter(dotX, dotY, bodyX, bodyY);
  const zoneRadius = GRID_MODIFIER_ZONE_PIXEL_RADIUS;
  return (
    dist >= zoneRadius * CONNECTOR_RING_MIN &&
    dist <= zoneRadius * CONNECTOR_RING_MAX
  );
}

function drawZoneConnectors(
  ctx: CanvasRenderingContext2D,
  center: PixelPoint,
  slots: (SpiderLegSlot | null)[],
  timeS: number,
) {
  ctx.save();
  ctx.lineWidth = CONNECTOR_LINE_WIDTH;
  ctx.strokeStyle = CONNECTOR_LINE_COLOR;
  ctx.setLineDash(CONNECTOR_LINE_DASH);

  slots.forEach((slot, slotIndex) => {
    if (!slot) return;

    const presence = slotPresence(slot, timeS, slotIndex);
    if (presence <= 0.001) return;

    const foot = legDisplayPosition(slot);
    const endX = center.x + (foot.x - center.x) * presence;
    const endY = center.y + (foot.y - center.y) * presence;

    ctx.globalAlpha = 0.55 + presence * 0.45;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  });

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawConnectorDots(
  ctx: CanvasRenderingContext2D,
  slots: (SpiderLegSlot | null)[],
  timeS: number,
) {
  slots.forEach((slot, slotIndex) => {
    if (!slot) return;

    const presence = slotPresence(slot, timeS, slotIndex);
    if (presence <= 0.001) return;

    const visibility = Math.min(1, presence * PORTFOLIO_GREEN_VISIBILITY_BOOST);
    const foot = legDisplayPosition(slot);
    const radius =
      GRID_CONNECTOR_DOT_RADIUS *
      (PORTFOLIO_CONNECTOR_RADIUS_MIN + PORTFOLIO_CONNECTOR_RADIUS_PULSE * presence);

    drawGreenGlowCircle(ctx, foot.x, foot.y, radius, visibility, "vivid");
  });
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
  connectorSlotsRef: { current: (SpiderLegSlot | null)[] },
  travelSmoothRef: { current: { vx: number; vy: number } },
) {
  clearCommandCenterCanvas(ctx, width, height);

  mainDot.setBounds(createFlyBounds(width, height, PORTFOLIO_FLY_MARGIN));
  mainDot.update(dt);
  const { x: mainX, y: mainY } = mainDot.getPosition();
  const { vx: bodyVx, vy: bodyVy } = mainDot.getVelocity();
  const travel = travelSmoothRef.current;
  const travelK = 1 - Math.exp(-PORTFOLIO_TRAVEL_SMOOTH_RATE * dt);
  travel.vx += (bodyVx - travel.vx) * travelK;
  travel.vy += (bodyVy - travel.vy) * travelK;

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
    PORTFOLIO_ZONE_CENTER_LERP,
  );
  const zoneX = zoneCenter.x;
  const zoneY = zoneCenter.y;

  const ringIdealDist = GRID_MODIFIER_ZONE_PIXEL_RADIUS * CONNECTOR_RING_IDEAL;
  const ringCandidates: RingCell[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      if (isOnConnectorRing(x, y, mainX, mainY)) {
        ringCandidates.push({ row, col, x, y });
      }
    }
  }

  const connectorSlots = connectorSlotsRef.current;
  initSpiderLegs(
    connectorSlots,
    ringCandidates,
    mainX,
    mainY,
    rows,
    cols,
    timeS,
    ringIdealDist,
    travel.vx,
    travel.vy,
  );
  advanceSpiderGait(
    connectorSlots,
    ringCandidates,
    mainX,
    mainY,
    rows,
    cols,
    timeS,
    ringIdealDist,
    dt,
    travel.vx,
    travel.vy,
  );

  drawZoneConnectors(
    ctx,
    { x: mainX, y: mainY },
    connectorSlots,
    timeS,
  );
  drawConnectorDots(ctx, connectorSlots, timeS);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      const key = cellKey(row, col);
      const isActiveConnector = connectorSlots.some((slot, slotIndex) => {
        if (!slot || cellKey(slot.row, slot.col) !== key) return false;
        return slotPresence(slot, timeS, slotIndex) > 0.04;
      });
      if (isActiveConnector) continue;

      const { radius, alpha } = gridDotAppearance(x, y, zoneX, zoneY);
      if (radius < GRID_MIN_VISIBLE_RADIUS || alpha < GRID_MIN_VISIBLE_ALPHA) {
        continue;
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (!drawCommandCenterTurtleMark(ctx, mainX, mainY)) {
    drawGreenGlowCircle(ctx, mainX, mainY, GRID_MAIN_DOT_RADIUS, 1, "vivid");
  }
}

/** Drift across the card; legs follow the body hub on the grid ring. */
const PORTFOLIO_TURTLE_MOTION = {
  friction: 0.983,
  accel: 240,
  maxSpeed: 46,
  noiseTimeScale: 0.38,
  wallBounce: 0.5,
  edgeCenterBias: 0.45,
  edgeBiasInset: GRID_SPACING * 2.2,
} as const;

export function CommandCenterFeatureCanvas() {
  const mainDotRef = useRef(
    new FlyingMainDot(
      { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      PORTFOLIO_TURTLE_MOTION,
    ),
  );
  const zoneHubRef = useRef<GridCell | null>(null);
  const zoneCenterStateRef = useRef(createZoneCenterState());
  const connectorSlotsRef = useRef<(SpiderLegSlot | null)[]>(
    Array.from({ length: CONNECTOR_COUNT }, () => null),
  );
  const travelSmoothRef = useRef({ vx: 0, vy: 0 });
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
        connectorSlotsRef,
        travelSmoothRef,
      );
    },
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
