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

export const ZONE_CENTER_LERP = 8;

const FLY_FRICTION = 0.965;
const FLY_ACCEL = 780;
const FLY_MAX_SPEED = 150;

export type FlyingMainDotOptions = {
  friction?: number;
  accel?: number;
  maxSpeed?: number;
  /** < 1 slows steering noise for smoother drift. */
  noiseTimeScale?: number;
  wallBounce?: number;
  /** Push toward bounds center when near edges (0–1, portfolio corners). */
  edgeCenterBias?: number;
  /** Px from a wall where edgeCenterBias begins. */
  edgeBiasInset?: number;
};

const FLY_DEFAULTS = {
  friction: FLY_FRICTION,
  accel: FLY_ACCEL,
  maxSpeed: FLY_MAX_SPEED,
  noiseTimeScale: 1,
  wallBounce: 0.72,
  edgeCenterBias: 0,
  edgeBiasInset: 48,
} as const;

function wallProximity(
  pos: number,
  min: number,
  max: number,
  inset: number,
) {
  const depth = Math.min(pos - min, max - pos);
  if (depth >= inset) return 0;
  return 1 - depth / inset;
}

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

/** Small wander box around a fixed anchor (keeps body near visual center). */
export function createCenterDriftBounds(
  centerX: number,
  centerY: number,
  driftRadius: number,
  bodyMargin = 0,
): PixelRect {
  const r = driftRadius + bodyMargin;
  return {
    minX: centerX - r,
    minY: centerY - r,
    maxX: centerX + r,
    maxY: centerY + r,
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
  lerp = ZONE_CENTER_LERP,
) {
  if (!initialized) {
    zoneCenter.x = target.x;
    zoneCenter.y = target.y;
    return;
  }
  const k = 1 - Math.exp(-lerp * dt);
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
  hubReleaseDistance = 0,
): GridCell {
  const nearestHub = findNearestGridCell(x, y, offsetX, offsetY, rows, cols);
  const prevHub = zoneHubRef.current;

  if (!prevHub) {
    zoneHubRef.current = nearestHub;
    return nearestHub;
  }

  if (cellsEqual(prevHub, nearestHub)) {
    zoneHubRef.current = prevHub;
    return prevHub;
  }

  if (hubReleaseDistance > 0) {
    const prevPixel = gridCellToPixel(prevHub, offsetX, offsetY);
    const distToPrev = Math.hypot(x - prevPixel.x, y - prevPixel.y);
    const nearestPixel = gridCellToPixel(nearestHub, offsetX, offsetY);
    const distToNearest = Math.hypot(x - nearestPixel.x, y - nearestPixel.y);

    if (
      distToPrev >= hubReleaseDistance ||
      distToNearest + hubReleaseDistance * 0.15 < distToPrev
    ) {
      zoneHubRef.current = nearestHub;
      return nearestHub;
    }

    zoneHubRef.current = prevHub;
    return prevHub;
  }

  zoneHubRef.current = nearestHub;
  return nearestHub;
}

export function stepZoneCenter(
  state: ZoneCenterState,
  hub: GridCell,
  offsetX: number,
  offsetY: number,
  dt: number,
  lerp = ZONE_CENTER_LERP,
) {
  const hubPixel = gridCellToPixel(hub, offsetX, offsetY);
  updateZoneCenter(state.current, hubPixel, dt, state.initialized, lerp);
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
  private readonly fly: typeof FLY_DEFAULTS;

  constructor(bounds: PixelRect, options: FlyingMainDotOptions = {}) {
    this.bounds = bounds;
    this.fly = { ...FLY_DEFAULTS, ...options };
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
    const t = this.time * this.fly.noiseTimeScale;
    const { friction, accel, maxSpeed, wallBounce } = this.fly;

    const envelope = 0.5 + 0.5 * noise1(t * 0.31 + 1.2);
    const drift = noise1(t * 0.52 + 3.4) - 0.5;
    let ax =
      ((noise1(t * 1.62 + 0.5) - 0.5) * 0.5 +
        (noise1(t * 3.15 + 2.1) - 0.5) * 0.3 +
        drift * 0.2) *
      accel *
      envelope;
    let ay =
      ((noise1(t * 1.88 + 2.4) - 0.5) * 0.5 +
        (noise1(t * 3.48 + 4.2) - 0.5) * 0.3 +
        drift * 0.2) *
      accel *
      (0.85 + 0.15 * noise1(t * 0.44 + 5.6));

    const { edgeCenterBias, edgeBiasInset } = this.fly;
    if (edgeCenterBias > 0) {
      const cx = (this.bounds.minX + this.bounds.maxX) / 2;
      const cy = (this.bounds.minY + this.bounds.maxY) / 2;
      const inset = edgeBiasInset;
      const edgeX = wallProximity(this.x, this.bounds.minX, this.bounds.maxX, inset);
      const edgeY = wallProximity(this.y, this.bounds.minY, this.bounds.maxY, inset);
      const edge = Math.max(edgeX, edgeY);
      if (edge > 0) {
        const toCenterX = cx - this.x;
        const toCenterY = cy - this.y;
        const centerLen = Math.hypot(toCenterX, toCenterY) || 1;
        const push = edgeCenterBias * edge * accel * 0.018;
        ax += (toCenterX / centerLen) * push;
        ay += (toCenterY / centerLen) * push;
      }
    }

    this.vx = this.vx * friction + ax * dt;
    this.vy = this.vy * friction + ay * dt;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      this.vx *= scale;
      this.vy *= scale;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const cx = (this.bounds.minX + this.bounds.maxX) / 2;
    const cy = (this.bounds.minY + this.bounds.maxY) / 2;
    const cornerInset = this.fly.edgeBiasInset;
    const nearX =
      wallProximity(this.x, this.bounds.minX, this.bounds.maxX, cornerInset) > 0.35;
    const nearY =
      wallProximity(this.y, this.bounds.minY, this.bounds.maxY, cornerInset) > 0.35;
    const inCorner = nearX && nearY;

    if (this.x < this.bounds.minX) {
      this.x = this.bounds.minX;
      if (inCorner) {
        const len = Math.hypot(cx - this.x, cy - this.y) || 1;
        const escape = maxSpeed * 0.42;
        this.vx = ((cx - this.x) / len) * escape;
        this.vy = ((cy - this.y) / len) * escape;
      } else {
        this.vx = Math.abs(this.vx) * wallBounce;
      }
    } else if (this.x > this.bounds.maxX) {
      this.x = this.bounds.maxX;
      if (inCorner) {
        const len = Math.hypot(cx - this.x, cy - this.y) || 1;
        const escape = maxSpeed * 0.42;
        this.vx = ((cx - this.x) / len) * escape;
        this.vy = ((cy - this.y) / len) * escape;
      } else {
        this.vx = -Math.abs(this.vx) * wallBounce;
      }
    }

    if (this.y < this.bounds.minY) {
      this.y = this.bounds.minY;
      if (inCorner) {
        const len = Math.hypot(cx - this.x, cy - this.y) || 1;
        const escape = maxSpeed * 0.42;
        this.vx = ((cx - this.x) / len) * escape;
        this.vy = ((cy - this.y) / len) * escape;
      } else {
        this.vy = Math.abs(this.vy) * wallBounce;
      }
    } else if (this.y > this.bounds.maxY) {
      this.y = this.bounds.maxY;
      if (inCorner) {
        const len = Math.hypot(cx - this.x, cy - this.y) || 1;
        const escape = maxSpeed * 0.42;
        this.vx = ((cx - this.x) / len) * escape;
        this.vy = ((cy - this.y) / len) * escape;
      } else {
        this.vy = -Math.abs(this.vy) * wallBounce;
      }
    }
  }

  getPosition() {
    return { x: this.x, y: this.y };
  }

  getVelocity() {
    return { vx: this.vx, vy: this.vy };
  }

  /** Keep wander inside a circle without pulling back to the exact center. */
  clampWithinCenterRadius(centerX: number, centerY: number, maxRadius: number) {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist <= maxRadius || dist < 0.001) return;

    const nx = dx / dist;
    const ny = dy / dist;
    this.x = centerX + nx * maxRadius;
    this.y = centerY + ny * maxRadius;

    const outward = this.vx * nx + this.vy * ny;
    if (outward > 0) {
      this.vx -= nx * outward * 1.05;
      this.vy -= ny * outward * 1.05;
    }
  }
}
