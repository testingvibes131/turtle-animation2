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
  GRID_ACCENT_COLOR,
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
import { useCommandCenterCanvasLoop } from "@/features/home/hooks/useCommandCenterCanvasLoop";

const CONNECTOR_LINE_WIDTH = 1;
const CONNECTOR_OPACITY = 0.75;
const CONNECTOR_MOVE_S = 0.11;
const CONNECTOR_STAGGER_MAX = 0.18;
const CONNECTOR_RING_MIN = 0.72;
const CONNECTOR_RING_SKIP_FRACTION = 0.3;
const FLY_BOUNDS_MARGIN_FACTOR = 0.5;

type InsideCell = GridCell & PixelPoint;

type ConnectorEntry = InsideCell & {
  phase: "in" | "out";
  animStart: number;
  moveDuration: number;
};

function cellOrganicDelay(row: number, col: number) {
  return cellOrganicUnit(row, col) * CONNECTOR_STAGGER_MAX;
}

function cellMoveDuration(row: number, col: number) {
  const u = cellOrganicUnit(col + 17, row + 31);
  return CONNECTOR_MOVE_S * (0.8 + u * 0.45);
}

function connectorLineProgress(entry: ConnectorEntry, timeS: number) {
  const elapsed = timeS - entry.animStart;
  if (elapsed < 0) return entry.phase === "out" ? 1 : 0;
  const t = smoothstep(clamp01(elapsed / entry.moveDuration));
  return entry.phase === "in" ? t : 1 - t;
}

function beginConnectorPhase(
  entry: ConnectorEntry,
  phase: "in" | "out",
  timeS: number,
) {
  entry.phase = phase;
  entry.animStart = timeS + cellOrganicDelay(entry.row, entry.col);
  entry.moveDuration = cellMoveDuration(entry.row, entry.col);
}

function syncConnectorAnimations(
  entries: Map<string, ConnectorEntry>,
  connectorCells: InsideCell[],
  timeS: number,
) {
  const connectorKeys = new Set(
    connectorCells.map((c) => cellKey(c.row, c.col)),
  );

  for (const entry of entries.values()) {
    if (
      entry.phase === "in" &&
      !connectorKeys.has(cellKey(entry.row, entry.col))
    ) {
      beginConnectorPhase(entry, "out", timeS);
    }
  }

  for (const [key, entry] of [...entries.entries()]) {
    if (entry.phase === "out" && connectorLineProgress(entry, timeS) <= 0) {
      entries.delete(key);
    }
  }

  for (const cell of connectorCells) {
    const key = cellKey(cell.row, cell.col);
    const existing = entries.get(key);

    if (!existing) {
      const entry: ConnectorEntry = {
        ...cell,
        phase: "in",
        animStart: 0,
        moveDuration: CONNECTOR_MOVE_S,
      };
      beginConnectorPhase(entry, "in", timeS);
      entries.set(key, entry);
      continue;
    }

    existing.x = cell.x;
    existing.y = cell.y;

    if (existing.phase === "out") {
      const progress = connectorLineProgress(existing, timeS);
      if (progress > 0) {
        existing.phase = "in";
        existing.animStart = timeS - (1 - progress) * existing.moveDuration;
      }
    }
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

function isConnectorRingSelected(row: number, col: number) {
  return (
    cellOrganicUnit(row + 53, col + 97) >= CONNECTOR_RING_SKIP_FRACTION
  );
}

function isConnectorRingDot(
  row: number,
  col: number,
  dotX: number,
  dotY: number,
  zoneX: number,
  zoneY: number,
) {
  return (
    isOnConnectorOuterRing(dotX, dotY, zoneX, zoneY) &&
    isConnectorRingSelected(row, col)
  );
}

function drawZoneConnectors(
  ctx: CanvasRenderingContext2D,
  center: PixelPoint,
  entries: Map<string, ConnectorEntry>,
  timeS: number,
) {
  if (entries.size === 0) return;

  ctx.save();
  ctx.lineWidth = CONNECTOR_LINE_WIDTH;

  for (const entry of entries.values()) {
    const progress = connectorLineProgress(entry, timeS);
    if (progress <= 0) continue;

    const endX = center.x + (entry.x - center.x) * progress;
    const endY = center.y + (entry.y - center.y) * progress;

    ctx.strokeStyle = `rgba(255, 255, 255, ${CONNECTOR_OPACITY})`;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  ctx.restore();
}

function drawConnectorDots(
  ctx: CanvasRenderingContext2D,
  entries: Map<string, ConnectorEntry>,
  timeS: number,
) {
  ctx.fillStyle = GRID_ACCENT_COLOR;

  for (const entry of entries.values()) {
    const progress = connectorLineProgress(entry, timeS);
    if (progress <= 0) continue;

    ctx.beginPath();
    ctx.arc(
      entry.x,
      entry.y,
      GRID_CONNECTOR_DOT_RADIUS * progress,
      0,
      Math.PI * 2,
    );
    ctx.fill();
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
  connectorEntriesRef: { current: Map<string, ConnectorEntry> },
) {
  ctx.clearRect(0, 0, width, height);

  mainDot.setBounds(
    createFlyBounds(
      width,
      height,
      GRID_MAIN_DOT_RADIUS * FLY_BOUNDS_MARGIN_FACTOR,
    ),
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
  const center = { x: mainX, y: mainY };
  const connectorCells: InsideCell[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      if (isConnectorRingDot(row, col, x, y, zoneX, zoneY)) {
        connectorCells.push({ row, col, x, y });
      }
    }
  }

  syncConnectorAnimations(
    connectorEntriesRef.current,
    connectorCells,
    timeS,
  );
  const connectorEntries = connectorEntriesRef.current;

  drawZoneConnectors(ctx, center, connectorEntries, timeS);
  drawConnectorDots(ctx, connectorEntries, timeS);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      const key = cellKey(row, col);
      const entry = connectorEntries.get(key);
      if (entry && connectorLineProgress(entry, timeS) > 0) {
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

  ctx.fillStyle = GRID_ACCENT_COLOR;
  ctx.beginPath();
  ctx.arc(mainX, mainY, GRID_MAIN_DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

export function CommandCenterFeatureCanvas() {
  const mainDotRef = useRef(
    new FlyingMainDot({ minX: 0, minY: 0, maxX: 0, maxY: 0 }),
  );
  const zoneHubRef = useRef<GridCell | null>(null);
  const zoneCenterStateRef = useRef(createZoneCenterState());
  const connectorEntriesRef = useRef(new Map<string, ConnectorEntry>());

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
        connectorEntriesRef,
      );
    },
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
