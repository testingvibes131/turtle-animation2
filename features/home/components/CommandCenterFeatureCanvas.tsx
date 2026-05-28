"use client";

import { useEffect, useRef } from "react";

const DOT_DIAMETER = 7;
const DOT_RADIUS = DOT_DIAMETER / 2;
const MAIN_DOT_SCALE = 3;
const MAIN_DOT_RADIUS = DOT_RADIUS * MAIN_DOT_SCALE;
/** Connected ring dots — same green, smaller than the center. */
const CONNECTOR_DOT_SCALE = 1.5;
const CONNECTOR_DOT_RADIUS = DOT_RADIUS * CONNECTOR_DOT_SCALE;
const GRID_SPACING = 24;
const MUTED_ALPHA = 0.05;
const MAIN_DOT_COLOR = "#73f36c";

/** Modifier zone extent from the snapped hub cell (grid units). */
const MODIFIER_ZONE_GRID_RADIUS = 4.5;
const MODIFIER_ZONE_PIXEL_RADIUS =
  MODIFIER_ZONE_GRID_RADIUS * GRID_SPACING;

/** Fade band just outside the blue zone (grid units). */
const MODIFIER_FALLOFF_GRID = 4;
const MODIFIER_FALLOFF_PIXEL = MODIFIER_FALLOFF_GRID * GRID_SPACING;

/** Floor for dots past the falloff — visible but dimmed, not zero. */
const OUTSIDE_MIN_SCALE = 0.35;

const MIN_VISIBLE_RADIUS = 0.15;
const MIN_VISIBLE_ALPHA = 0.002;

const CONNECTOR_LINE_WIDTH = 1;
const CONNECTOR_OPACITY = 0.75;
/** Base leg extend/retract duration (each cell varies slightly). */
const CONNECTOR_MOVE_S = 0.11;
/** Max random delay before a leg starts moving — not sequential. */
const CONNECTOR_STAGGER_MAX = 0.18;
/** How quickly the modifier zone glides when the hub shifts (less blocky). */
const ZONE_CENTER_LERP = 9;
/**
 * Connectors on the outer band of the zone (fraction of radius from center).
 * 0.72 ≈ outer 28% — legs on the ring, not the interior.
 */
const CONNECTOR_RING_MIN = 0.72;
/** Stable subset: skip this fraction of outer-ring dots (~30% fewer legs). */
const CONNECTOR_RING_SKIP_FRACTION = 0.3;

const DEBUG_MODIFIER_ZONE = false;
const DEBUG_ZONE_FILL = "rgba(0, 100, 255, 0.12)";
const DEBUG_ZONE_STROKE = "rgba(0, 120, 255, 0.5)";

const FLY_FRICTION = 0.965;
const FLY_ACCEL = 780;
const FLY_MAX_SPEED = 150;
/** How far the dot center stays from the canvas edge (lower = closer to edges). */
const FLY_BOUNDS_MARGIN_FACTOR = 0.5;

type GridCell = { row: number; col: number };
type PixelPoint = { x: number; y: number };
type PixelRect = { minX: number; minY: number; maxX: number; maxY: number };

function cellsEqual(a: GridCell, b: GridCell) {
  return a.row === b.row && a.col === b.col;
}

function findNearestGridCell(
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

function gridCellToPixel(
  cell: GridCell,
  offsetX: number,
  offsetY: number,
) {
  return {
    x: offsetX + cell.col * GRID_SPACING,
    y: offsetY + cell.row * GRID_SPACING,
  };
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function cellKey(row: number, col: number) {
  return `${row},${col}`;
}

type InsideCell = GridCell & PixelPoint;

type ConnectorEntry = InsideCell & {
  phase: "in" | "out";
  /** Seconds (performance time) when this leg's anim begins. */
  animStart: number;
  moveDuration: number;
};

/** Stable 0–1 hash per grid cell — scattered, not angular order. */
function cellOrganicUnit(row: number, col: number) {
  const n = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

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

function updateZoneCenter(
  zoneCenter: PixelPoint,
  target: PixelPoint,
  dt: number,
  initialized: boolean,
) {
  if (!initialized) {
    zoneCenter.x = target.x;
    zoneCenter.y = target.y;
    return;
  }
  const k = 1 - Math.exp(-ZONE_CENTER_LERP * dt);
  zoneCenter.x += (target.x - zoneCenter.x) * k;
  zoneCenter.y += (target.y - zoneCenter.y) * k;
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

function distanceFromZoneCenter(
  dotX: number,
  dotY: number,
  zoneX: number,
  zoneY: number,
) {
  return Math.hypot(dotX - zoneX, dotY - zoneY);
}

function isInsideModifierZone(
  dotX: number,
  dotY: number,
  zoneX: number,
  zoneY: number,
) {
  return (
    distanceFromZoneCenter(dotX, dotY, zoneX, zoneY) <=
    MODIFIER_ZONE_PIXEL_RADIUS
  );
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
    MODIFIER_ZONE_PIXEL_RADIUS * CONNECTOR_RING_MIN
  );
}

function isConnectorRingSelected(row: number, col: number) {
  return (
    cellOrganicUnit(row + 53, col + 97) >= CONNECTOR_RING_SKIP_FRACTION
  );
}

/** Outer-ring dots that pass the stable ~70% subset (connector targets). */
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

function gridDotAppearance(
  dotX: number,
  dotY: number,
  hubX: number,
  hubY: number,
) {
  const dist = Math.hypot(dotX - hubX, dotY - hubY);
  if (isInsideModifierZone(dotX, dotY, hubX, hubY)) {
    return { radius: DOT_RADIUS, alpha: MUTED_ALPHA };
  }

  const outside = dist - MODIFIER_ZONE_PIXEL_RADIUS;
  if (outside >= MODIFIER_FALLOFF_PIXEL) {
    return {
      radius: DOT_RADIUS * OUTSIDE_MIN_SCALE,
      alpha: MUTED_ALPHA * OUTSIDE_MIN_SCALE,
    };
  }

  const t = smoothstep(outside / MODIFIER_FALLOFF_PIXEL);
  const scale = 1 - t * (1 - OUTSIDE_MIN_SCALE);
  return {
    radius: DOT_RADIUS * scale,
    alpha: MUTED_ALPHA * scale,
  };
}

function canvasFlyBounds(width: number, height: number): PixelRect {
  const margin = MAIN_DOT_RADIUS * FLY_BOUNDS_MARGIN_FACTOR;
  return {
    minX: margin,
    minY: margin,
    maxX: width - margin,
    maxY: height - margin,
  };
}

function noise1(t: number) {
  const a = Math.sin(t * 0.91 + 0.2) * 0.45;
  const b = Math.sin(t * 1.73 + 1.1) * 0.35;
  const c = Math.sin(t * 2.41 + 2.4) * 0.2;
  return (a + b + c + 1) * 0.5;
}

class FlyingMainDot {
  x: number;
  y: number;
  private vx = 0;
  private vy = 0;
  private time = 0;
  private bounds: PixelRect;
  private boundsKey = "";

  constructor(bounds: PixelRect) {
    this.bounds = bounds;
    this.x = (bounds.minX + bounds.maxX) / 2;
    this.y = (bounds.minY + bounds.maxY) / 2;
  }

  setBounds(bounds: PixelRect) {
    const key = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;
    if (key !== this.boundsKey) {
      this.boundsKey = key;
      this.bounds = bounds;
      this.x = (bounds.minX + bounds.maxX) / 2;
      this.y = (bounds.minY + bounds.maxY) / 2;
      this.vx = 0;
      this.vy = 0;
    } else {
      this.bounds = bounds;
    }
  }

  update(dt: number) {
    this.time += dt;
    const t = this.time;

    const envelope = 0.5 + 0.5 * noise1(t * 0.31 + 1.2);
    const drift = noise1(t * 0.52 + 3.4) - 0.5;
    const ax =
      ((noise1(t * 1.62 + 0.5) - 0.5) * 0.5 +
        (noise1(t * 3.15 + 2.1) - 0.5) * 0.3 +
        drift * 0.2) *
      FLY_ACCEL *
      envelope;
    const ay =
      ((noise1(t * 1.88 + 2.4) - 0.5) * 0.5 +
        (noise1(t * 3.48 + 4.2) - 0.5) * 0.3 +
        drift * 0.2) *
      FLY_ACCEL *
      (0.85 + 0.15 * noise1(t * 0.44 + 5.6));

    this.vx = this.vx * FLY_FRICTION + ax * dt;
    this.vy = this.vy * FLY_FRICTION + ay * dt;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > FLY_MAX_SPEED) {
      const scale = FLY_MAX_SPEED / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < this.bounds.minX) {
      this.x = this.bounds.minX;
      this.vx = Math.abs(this.vx) * 0.72;
    } else if (this.x > this.bounds.maxX) {
      this.x = this.bounds.maxX;
      this.vx = -Math.abs(this.vx) * 0.72;
    }

    if (this.y < this.bounds.minY) {
      this.y = this.bounds.minY;
      this.vy = Math.abs(this.vy) * 0.72;
    } else if (this.y > this.bounds.maxY) {
      this.y = this.bounds.maxY;
      this.vy = -Math.abs(this.vy) * 0.72;
    }
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }
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
  ctx.fillStyle = MAIN_DOT_COLOR;

  for (const entry of entries.values()) {
    const progress = connectorLineProgress(entry, timeS);
    if (progress <= 0) continue;

    ctx.beginPath();
    ctx.arc(
      entry.x,
      entry.y,
      CONNECTOR_DOT_RADIUS * progress,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function drawDebugModifierZone(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  zoneRadius: number,
) {
  ctx.save();
  ctx.fillStyle = DEBUG_ZONE_FILL;
  ctx.beginPath();
  ctx.arc(centerX, centerY, zoneRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = DEBUG_ZONE_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mainDot: FlyingMainDot,
  dt: number,
  timeS: number,
  zoneHubRef: { current: GridCell | null },
  zoneCenterRef: { current: PixelPoint; initialized: boolean },
  connectorEntriesRef: { current: Map<string, ConnectorEntry> },
) {
  ctx.clearRect(0, 0, width, height);

  mainDot.setBounds(canvasFlyBounds(width, height));
  mainDot.update(dt);
  const { x: mainX, y: mainY } = mainDot.getPosition();

  const offsetX = (width % GRID_SPACING) / 2;
  const offsetY = (height % GRID_SPACING) / 2;
  const cols = Math.ceil((width - offsetX) / GRID_SPACING) + 1;
  const rows = Math.ceil((height - offsetY) / GRID_SPACING) + 1;

  const nearestHub = findNearestGridCell(
    mainX,
    mainY,
    offsetX,
    offsetY,
    rows,
    cols,
  );
  const prevHub = zoneHubRef.current;
  const hub =
    prevHub && cellsEqual(prevHub, nearestHub) ? prevHub : nearestHub;
  zoneHubRef.current = hub;

  const hubPixel = gridCellToPixel(hub, offsetX, offsetY);
  updateZoneCenter(
    zoneCenterRef.current,
    hubPixel,
    dt,
    zoneCenterRef.initialized,
  );
  zoneCenterRef.initialized = true;

  const zoneX = zoneCenterRef.current.x;
  const zoneY = zoneCenterRef.current.y;
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
      if (
        entry &&
        connectorLineProgress(entry, timeS) > 0
      ) {
        continue;
      }

      const { radius, alpha } = gridDotAppearance(x, y, zoneX, zoneY);
      if (radius < MIN_VISIBLE_RADIUS || alpha < MIN_VISIBLE_ALPHA) continue;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (DEBUG_MODIFIER_ZONE) {
    drawDebugModifierZone(
      ctx,
      zoneX,
      zoneY,
      MODIFIER_ZONE_PIXEL_RADIUS,
    );
  }

  ctx.fillStyle = MAIN_DOT_COLOR;
  ctx.beginPath();
  ctx.arc(mainX, mainY, MAIN_DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  container: HTMLDivElement,
) {
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

export function CommandCenterFeatureCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mainDot = new FlyingMainDot({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
    const zoneHubRef: { current: GridCell | null } = { current: null };
    const zoneCenterRef = {
      current: { x: 0, y: 0 },
      initialized: false,
    };
    const connectorEntriesRef: {
      current: Map<string, ConnectorEntry>;
    } = { current: new Map() };
    let frameId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const timeS = now / 1000;

      const size = resizeCanvas(canvas, ctx, container);
      if (size) {
        drawScene(
          ctx,
          size.width,
          size.height,
          mainDot,
          dt,
          timeS,
          zoneHubRef,
          zoneCenterRef,
          connectorEntriesRef,
        );
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    const observer = new ResizeObserver(() => {
      resizeCanvas(canvas, ctx, container);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
