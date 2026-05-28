import type {
  GridCell,
  PixelPoint,
  PixelRect,
} from "@/features/home/components/commandCenterCanvas";
import {
  cellsEqual,
  findNearestGridCell,
  gridCellToPixel,
} from "@/features/home/components/commandCenterCanvas";

export const ZONE_CENTER_LERP = 9;

const FLY_FRICTION = 0.965;
const FLY_ACCEL = 780;
const FLY_MAX_SPEED = 150;

function noise1(t: number) {
  const a = Math.sin(t * 0.91 + 0.2) * 0.45;
  const b = Math.sin(t * 1.73 + 1.1) * 0.35;
  const c = Math.sin(t * 2.41 + 2.4) * 0.2;
  return (a + b + c + 1) * 0.5;
}

export function createFlyBounds(
  width: number,
  height: number,
  margin: number,
): PixelRect {
  return {
    minX: margin,
    minY: margin,
    maxX: width - margin,
    maxY: height - margin,
  };
}

export type ZoneCenterState = {
  current: PixelPoint;
  initialized: boolean;
};

export function createZoneCenterState(): ZoneCenterState {
  return { current: { x: 0, y: 0 }, initialized: false };
}

export function updateZoneCenter(
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

export function resolveStickyZoneHub(
  zoneHubRef: { current: GridCell | null },
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
  rows: number,
  cols: number,
): GridCell {
  const nearestHub = findNearestGridCell(x, y, offsetX, offsetY, rows, cols);
  const prevHub = zoneHubRef.current;
  const hub =
    prevHub && cellsEqual(prevHub, nearestHub) ? prevHub : nearestHub;
  zoneHubRef.current = hub;
  return hub;
}

export function stepZoneCenter(
  state: ZoneCenterState,
  hub: GridCell,
  offsetX: number,
  offsetY: number,
  dt: number,
) {
  const hubPixel = gridCellToPixel(hub, offsetX, offsetY);
  updateZoneCenter(state.current, hubPixel, dt, state.initialized);
  state.initialized = true;
  return state.current;
}

export class FlyingMainDot {
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
