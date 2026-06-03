/** Command Center card: Aggregated Portfolio (`visual: "portfolio"`). */
"use client";

import { useRef } from "react";
import {
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
const CONNECTOR_STAGGER_MAX = 0.19;
/** Only retarget a spoke when the new cell is clearly better for that sector. */
const CONNECTOR_SECTOR_SWITCH_RAD = 0.34;
/** Damped follow for spoke tips and line origin (higher = snappier). */
const CONNECTOR_FOLLOW_RATE = 7;
const CONNECTOR_ORIGIN_FOLLOW_RATE = 14;
const CONNECTOR_RING_MIN = 0.72;
const CONNECTOR_COUNT = 5;
const TAU = Math.PI * 2;

type InsideCell = GridCell & PixelPoint;

type ConnectorSlot = {
  row: number;
  col: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  presenceStart: number;
};

type SmoothedPoint = PixelPoint & { initialized: boolean };

function slotStaggerDelay(slotIndex: number, row: number, col: number) {
  return (
    (slotIndex / CONNECTOR_COUNT) * CONNECTOR_STAGGER_MAX +
    cellOrganicUnit(row, col) * CONNECTOR_STAGGER_MAX * 0.45
  );
}

function dampedFollow(current: number, target: number, dt: number, rate: number) {
  const k = 1 - Math.exp(-rate * dt);
  return current + (target - current) * k;
}

function stepSmoothedPoint(point: SmoothedPoint, target: PixelPoint, dt: number, rate: number) {
  if (!point.initialized) {
    point.x = target.x;
    point.y = target.y;
    point.initialized = true;
    return;
  }
  point.x = dampedFollow(point.x, target.x, dt, rate);
  point.y = dampedFollow(point.y, target.y, dt, rate);
}

function createConnectorSlot(cell: InsideCell, timeS: number): ConnectorSlot {
  return {
    row: cell.row,
    col: cell.col,
    x: cell.x,
    y: cell.y,
    targetX: cell.x,
    targetY: cell.y,
    presenceStart: timeS,
  };
}

function sectorTargetAngle(slotIndex: number) {
  return (slotIndex / CONNECTOR_COUNT) * TAU - Math.PI / 2;
}

function cellSectorDelta(
  cell: InsideCell,
  hubX: number,
  hubY: number,
  slotIndex: number,
) {
  const angle = Math.atan2(cell.y - hubY, cell.x - hubX);
  return connectorAngleDelta(angle, sectorTargetAngle(slotIndex));
}

function shouldRetargetSlot(
  slot: ConnectorSlot,
  cell: InsideCell,
  hubX: number,
  hubY: number,
  slotIndex: number,
) {
  const currentDelta = cellSectorDelta(
    { row: slot.row, col: slot.col, x: slot.x, y: slot.y },
    hubX,
    hubY,
    slotIndex,
  );
  const nextDelta = cellSectorDelta(cell, hubX, hubY, slotIndex);
  return nextDelta < currentDelta - CONNECTOR_SECTOR_SWITCH_RAD;
}

function retargetConnectorSlot(slot: ConnectorSlot, cell: InsideCell) {
  slot.row = cell.row;
  slot.col = cell.col;
  slot.targetX = cell.x;
  slot.targetY = cell.y;
}

function slotPresence(slot: ConnectorSlot, timeS: number, slotIndex: number) {
  const delay = slotStaggerDelay(slotIndex, slot.row, slot.col);
  const elapsed = timeS - slot.presenceStart - delay;
  if (elapsed <= 0) return 0;
  return smoothstep(clamp01(elapsed / CONNECTOR_PRESENCE_IN_S));
}

function advanceSlotMotion(slots: (ConnectorSlot | null)[], dt: number) {
  for (const slot of slots) {
    if (!slot) continue;
    slot.x = dampedFollow(slot.x, slot.targetX, dt, CONNECTOR_FOLLOW_RATE);
    slot.y = dampedFollow(slot.y, slot.targetY, dt, CONNECTOR_FOLLOW_RATE);
  }
}

function syncConnectorSlots(
  slots: (ConnectorSlot | null)[],
  connectorCells: InsideCell[],
  hubX: number,
  hubY: number,
  timeS: number,
) {
  for (let i = 0; i < CONNECTOR_COUNT; i++) {
    const cell = connectorCells[i];
    if (!cell) continue;

    const slot = slots[i];
    if (!slot) {
      slots[i] = createConnectorSlot(cell, timeS);
      continue;
    }

    if (slot.row === cell.row && slot.col === cell.col) {
      slot.targetX = cell.x;
      slot.targetY = cell.y;
      continue;
    }

    if (!shouldRetargetSlot(slot, cell, hubX, hubY, i)) {
      continue;
    }

    retargetConnectorSlot(slot, cell);
  }
}

function isOnConnectorOuterRing(
  dotX: number,
  dotY: number,
  zoneX: number,
  zoneY: number,
) {
  if (!isInsideModifierZone(dotX, dotY, zoneX, zoneY)) return false;
  return (
    distanceFromZoneCenter(dotX, dotY, zoneX, zoneY) >=
    GRID_MODIFIER_ZONE_PIXEL_RADIUS * CONNECTOR_RING_MIN
  );
}

function isConnectorRingDot(
  dotX: number,
  dotY: number,
  zoneX: number,
  zoneY: number,
) {
  return isOnConnectorOuterRing(dotX, dotY, zoneX, zoneY);
}

function connectorAngleDelta(a: number, b: number) {
  let delta = a - b;
  while (delta > Math.PI) delta -= TAU;
  while (delta < -Math.PI) delta += TAU;
  return Math.abs(delta);
}

/** Pick ~CONNECTOR_COUNT spokes evenly around the hub ring. */
function pickConnectorCells(
  candidates: InsideCell[],
  hubX: number,
  hubY: number,
): InsideCell[] {
  if (candidates.length <= CONNECTOR_COUNT) return candidates;

  const picked: InsideCell[] = [];
  const used = new Set<string>();

  for (let i = 0; i < CONNECTOR_COUNT; i++) {
    const targetAngle = (i / CONNECTOR_COUNT) * TAU - Math.PI / 2;
    let best: InsideCell | null = null;
    let bestDelta = Infinity;
    let bestTie = Infinity;

    for (const cell of candidates) {
      const key = cellKey(cell.row, cell.col);
      if (used.has(key)) continue;

      const angle = Math.atan2(cell.y - hubY, cell.x - hubX);
      const delta = connectorAngleDelta(angle, targetAngle);
      const tie = cellOrganicUnit(cell.row, cell.col);
      if (delta < bestDelta || (delta === bestDelta && tie < bestTie)) {
        bestDelta = delta;
        bestTie = tie;
        best = cell;
      }
    }

    if (best) {
      used.add(cellKey(best.row, best.col));
      picked.push(best);
    }
  }

  return picked;
}

function drawZoneConnectors(
  ctx: CanvasRenderingContext2D,
  center: PixelPoint,
  slots: (ConnectorSlot | null)[],
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

    const endX = center.x + (slot.x - center.x) * presence;
    const endY = center.y + (slot.y - center.y) * presence;

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
  slots: (ConnectorSlot | null)[],
  timeS: number,
) {
  slots.forEach((slot, slotIndex) => {
    if (!slot) return;

    const presence = slotPresence(slot, timeS, slotIndex);
    if (presence <= 0.001) return;

    drawGreenGlowCircle(
      ctx,
      slot.x,
      slot.y,
      GRID_CONNECTOR_DOT_RADIUS * presence,
    );
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
  connectorSlotsRef: { current: (ConnectorSlot | null)[] },
  connectorOriginRef: { current: SmoothedPoint },
) {
  ctx.clearRect(0, 0, width, height);

  mainDot.setBounds(
    createFlyBounds(width, height, COMMAND_CENTER_TURTLE_HALF_EXTENT),
  );
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
  const zoneX = zoneCenter.x;
  const zoneY = zoneCenter.y;
  const ringHubX = zoneX;
  const ringHubY = zoneY;
  const ringCandidates: InsideCell[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      if (isConnectorRingDot(x, y, ringHubX, ringHubY)) {
        ringCandidates.push({ row, col, x, y });
      }
    }
  }

  const connectorCells = pickConnectorCells(
    ringCandidates,
    ringHubX,
    ringHubY,
  );

  const connectorSlots = connectorSlotsRef.current;
  syncConnectorSlots(connectorSlots, connectorCells, ringHubX, ringHubY, timeS);
  advanceSlotMotion(connectorSlots, dt);

  const connectorOrigin = connectorOriginRef.current;
  stepSmoothedPoint(
    connectorOrigin,
    { x: mainX, y: mainY },
    dt,
    CONNECTOR_ORIGIN_FOLLOW_RATE,
  );

  drawZoneConnectors(
    ctx,
    { x: connectorOrigin.x, y: connectorOrigin.y },
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
      if (isActiveConnector) {
        continue;
      }

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
    drawGreenGlowCircle(ctx, mainX, mainY, GRID_MAIN_DOT_RADIUS);
  }
}

const PORTFOLIO_TURTLE_MOTION = {
  friction: 0.978,
  accel: 420,
  maxSpeed: 92,
  noiseTimeScale: 0.52,
  wallBounce: 0.84,
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
  const connectorSlotsRef = useRef<(ConnectorSlot | null)[]>(
    Array.from({ length: CONNECTOR_COUNT }, () => null),
  );
  const connectorOriginRef = useRef<SmoothedPoint>({
    x: 0,
    y: 0,
    initialized: false,
  });

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
        connectorOriginRef,
      );
    },
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
