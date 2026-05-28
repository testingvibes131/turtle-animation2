"use client";

import { useEffect, useRef } from "react";
import {
  GRID_ACCENT_COLOR,
  GRID_CONNECTOR_DOT_RADIUS,
  GRID_DOT_RADIUS,
  GRID_MIN_VISIBLE_ALPHA,
  GRID_MIN_VISIBLE_RADIUS,
  GRID_MODIFIER_ZONE_PIXEL_RADIUS,
  GRID_SPACING,
  gridDotAppearance,
  isInsideModifierZone,
} from "@/features/home/components/commandCenterGrid";

const ALERTS_MODIFIER_ZONE_SCALE = 0.88;
const ALERTS_MODIFIER_ZONE_PIXEL_RADIUS =
  GRID_MODIFIER_ZONE_PIXEL_RADIUS * ALERTS_MODIFIER_ZONE_SCALE;

const ZONE_FILL = "rgba(255, 255, 255, 0.05)";
const ZONE_STROKE = "rgba(255, 255, 255, 1)";
const ZONE_STROKE_WIDTH = 1;
const DIAMOND_GREEN_RADIUS_CENTER = GRID_CONNECTOR_DOT_RADIUS * 1.35;
const DIAMOND_GREEN_RADIUS_EDGE = GRID_DOT_RADIUS * 0.88;
const DIAMOND_PULSE_SPEED = 1.75;
const DIAMOND_PULSE_STAGGER = 0.48;
/** Floor so the 13-dot diamond stays readable while pulsing. */
const DIAMOND_MIN_VISIBILITY = 0.42;

const ZONE_CENTER_LERP = 9;
const FLY_FRICTION = 0.965;
const FLY_ACCEL = 780;
const FLY_MAX_SPEED = 150;
const FLY_BOUNDS_MARGIN = GRID_DOT_RADIUS * 4;

type GridCell = { row: number; col: number };
type PixelPoint = { x: number; y: number };
type PixelRect = { minX: number; minY: number; maxX: number; maxY: number };

function cellOrganicUnit(row: number, col: number) {
  const n = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

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
): PixelPoint {
  return {
    x: offsetX + cell.col * GRID_SPACING,
    y: offsetY + cell.row * GRID_SPACING,
  };
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

/** 13-dot diamond (1–3–5–3–1) centered on the zone hub cell. */
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

/** Center-out pulse — keeps the diamond silhouette, soft ring cascade. */
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
  ctx.save();
  ctx.fillStyle = ZONE_FILL;
  ctx.beginPath();
  ctx.arc(zoneX, zoneY, ALERTS_MODIFIER_ZONE_PIXEL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ZONE_STROKE;
  ctx.lineWidth = ZONE_STROKE_WIDTH;
  ctx.stroke();
  ctx.restore();
}

function canvasFlyBounds(width: number, height: number): PixelRect {
  const margin = FLY_BOUNDS_MARGIN;
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

function drawModifierGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoneX: number,
  zoneY: number,
  hubCol: number,
  hubRow: number,
  timeS: number,
) {
  const offsetX = (width % GRID_SPACING) / 2;
  const offsetY = (height % GRID_SPACING) / 2;
  const cols = Math.ceil((width - offsetX) / GRID_SPACING) + 1;
  const rows = Math.ceil((height - offsetY) / GRID_SPACING) + 1;
  const zoneRadius = ALERTS_MODIFIER_ZONE_PIXEL_RADIUS;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;

      if (
        isInsideModifierZone(x, y, zoneX, zoneY, zoneRadius) &&
        isDiamondGreenDot(col, row, hubCol, hubRow)
      ) {
        const visibility = diamondGreenVisibility(
          col,
          row,
          hubCol,
          hubRow,
          timeS,
        );
        const baseRadius = diamondGreenRadius(col, row, hubCol, hubRow);
        const radius = baseRadius * (0.88 + 0.12 * visibility);

        ctx.fillStyle = GRID_ACCENT_COLOR;
        ctx.globalAlpha = visibility;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        continue;
      }

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

function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mainDot: FlyingMainDot,
  dt: number,
  timeS: number,
  zoneHubRef: { current: GridCell | null },
  zoneCenterRef: { current: PixelPoint; initialized: boolean },
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

  drawModifierZoneCircle(ctx, zoneX, zoneY);
  drawModifierGrid(ctx, width, height, zoneX, zoneY, hub.col, hub.row, timeS);
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

export function AlertsFeatureCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number | null>(null);

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
    let frameId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const timeS = (now - startTimeRef.current) / 1000;

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
