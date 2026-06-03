/** Command Center card: Personalized Alerts (`visual: "alerts"`). */
"use client";

import { useRef } from "react";
import { getGridDimensions } from "@/features/home/components/commandCenterCanvas";
import {
  clamp01,
  GRID_DOT_RADIUS,
  GRID_MIN_VISIBLE_ALPHA,
  GRID_MIN_VISIBLE_RADIUS,
  GRID_MUTED_ALPHA,
  GRID_SPACING,
  smoothstep,
} from "@/features/home/components/commandCenterGrid";
import { drawGreenGlowCircle } from "@/features/home/components/commandCenterGreenGlow";
import { drawCommandCenterAlertDot } from "@/features/home/components/commandCenterMagnifyingRing";
import { drawWhiteGlowCircle } from "@/features/home/components/commandCenterWhiteGlow";
import { useCommandCenterCanvasLoop } from "@/features/home/hooks/useCommandCenterCanvasLoop";

/** Circular vignette from card center (fraction of min canvas side). */
const FALLOFF_OUTER_FRAC = 0.48;
const FALLOFF_INNER_FRAC = 0.28;

/** Column sweep — ported from radar_sweep_grid_v5.html */
const SWEEP_SPEED = 3;
const SWEEP_TRAIL_COLS = 14;
const GREEN_TARGET_COUNT = 3;
const GREEN_REVEAL_ALPHA = 0.9;
/** Tight cluster around grid center (prototype used ~0.18). */
const GAUSSIAN_SPREAD_FRAC = 0.09;
const GREEN_MAX_DIST_FROM_CENTER = 2.5;
const GREEN_REVEAL_S = 0.6;
/** Resting → revealed canvas dot radius. */
const GREEN_RADIUS_SCALE = 1.75;
/** Alert PNG at full reveal — wider than one grid cell. */
const GREEN_ALERT_ICON_DIAMETER = GRID_SPACING * 1.42;
/** Pause at home cell after fade-in, before following the sweep. */
const GREEN_FOLLOW_DELAY_S = 0.55;
/** Lower = drifts more slowly behind the sweep column. */
const GREEN_FOLLOW_LERP_RATE = 6;

type GreenTarget = {
  row: number;
  col: number;
  /** 0 → 1 fade-in after the sweep passes this column */
  reveal: number;
  /** Visual column — lerps toward sweepCol while following */
  displayCol: number;
  /** -1 = not scheduled; >0 = countdown; 0 = follow sweep */
  followDelay: number;
  following: boolean;
};

type SweepRuntime = {
  sweepCol: number;
  stepAccS: number;
  greenTargets: GreenTarget[];
  gridKey: string;
  cols: number;
  rows: number;
};

function compositionFalloff(
  dotX: number,
  dotY: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
) {
  const dist = Math.hypot(dotX - centerX, dotY - centerY);
  const outer = Math.min(width, height) * FALLOFF_OUTER_FRAC;
  const inner = Math.min(width, height) * FALLOFF_INNER_FRAC;
  if (dist <= inner) return 1;
  if (dist >= outer) return 0;
  return 1 - smoothstep((dist - inner) / (outer - inner));
}

function gaussianRand() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function conflictsWithTargets(
  row: number,
  col: number,
  targets: GreenTarget[],
) {
  return targets.some((t) => {
    if (t.col === col || t.row === row) return true;
    return Math.abs(t.row - row) <= 1 && Math.abs(t.col - col) <= 1;
  });
}

function generateGreenTargets(cols: number, rows: number): GreenTarget[] {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const spread = Math.max(cols, rows) * GAUSSIAN_SPREAD_FRAC;
  const targets: GreenTarget[] = [];
  let attempts = 0;

  while (targets.length < GREEN_TARGET_COUNT && attempts < 1000) {
    attempts++;
    const col = Math.round(cx + gaussianRand() * spread);
    const row = Math.round(cy + gaussianRand() * spread);
    if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
    if (Math.hypot(col - cx, row - cy) > GREEN_MAX_DIST_FROM_CENTER) continue;
    if (conflictsWithTargets(row, col, targets)) continue;
    targets.push({
      row,
      col,
      reveal: 0,
      displayCol: col,
      followDelay: -1,
      following: false,
    });
  }

  return targets;
}

function secondsPerSweepColumn(speed = SWEEP_SPEED) {
  return Math.max(1, Math.round(40 / speed)) / 60;
}

function initSweepRuntime(runtime: SweepRuntime, cols: number, rows: number) {
  runtime.cols = cols;
  runtime.rows = rows;
  runtime.sweepCol = 0;
  runtime.stepAccS = 0;
  runtime.greenTargets = generateGreenTargets(cols, rows);
}

function ensureSweepRuntime(
  runtime: SweepRuntime,
  cols: number,
  rows: number,
  gridKey: string,
) {
  if (runtime.gridKey === gridKey) return;
  runtime.gridKey = gridKey;
  initSweepRuntime(runtime, cols, rows);
}

function advanceSweep(runtime: SweepRuntime, dt: number) {
  runtime.stepAccS += dt;
  const threshold = secondsPerSweepColumn();

  if (runtime.stepAccS < threshold) return;
  runtime.stepAccS = 0;
  runtime.sweepCol++;

  if (runtime.sweepCol >= runtime.cols + SWEEP_TRAIL_COLS) {
    runtime.sweepCol = 0;
    runtime.greenTargets = generateGreenTargets(runtime.cols, runtime.rows);
  }
}

function advanceGreenTargets(runtime: SweepRuntime, dt: number) {
  for (const target of runtime.greenTargets) {
    if (runtime.sweepCol <= target.col) continue;

    if (target.reveal < 1) {
      target.reveal = Math.min(1, target.reveal + dt / GREEN_REVEAL_S);
      target.displayCol = target.col;
      continue;
    }

    if (!target.following) {
      if (target.followDelay < 0) target.followDelay = GREEN_FOLLOW_DELAY_S;

      if (target.followDelay > 0) {
        target.followDelay = Math.max(0, target.followDelay - dt);
        target.displayCol = target.col;
        continue;
      }

      target.following = true;
    }

    const followK = 1 - Math.exp(-GREEN_FOLLOW_LERP_RATE * dt);
    target.displayCol += (runtime.sweepCol - target.displayCol) * followK;
  }
}

function trailBrightness(sweepCol: number, col: number) {
  const behind = sweepCol - col;
  if (behind < 0 || behind > SWEEP_TRAIL_COLS) return null;
  if (behind === 0) return 1;
  const t = 1 - behind / SWEEP_TRAIL_COLS;
  return t * t * 0.85;
}

/** Scanner head ≈ 1.45× grid dot; tail eases back to 1×. */
const TRAIL_RADIUS_SCALE_MAX = 1.45;

function applyTrailRadiusScale(radius: number, trail: number | null) {
  if (trail === null) return radius;
  return radius * (1 + trail * (TRAIL_RADIUS_SCALE_MAX - 1));
}

function drawSweepDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vignette: number,
  greenBlend: number,
  trail: number | null,
) {
  if (vignette < 0.01) return;

  const gt = smoothstep(clamp01(greenBlend));
  let radius = GRID_DOT_RADIUS * vignette;

  if (gt > 0.001) {
    radius *= 1 + gt * (GREEN_RADIUS_SCALE - 1);
  }

  radius = applyTrailRadiusScale(radius, trail);

  if (radius < GRID_MIN_VISIBLE_RADIUS) return;

  let whiteAlpha = GRID_MUTED_ALPHA * vignette;
  if (trail !== null) {
    const atHead = trail === 1;
    whiteAlpha = Math.max(
      whiteAlpha,
      (atHead ? 0.92 : GRID_MUTED_ALPHA + trail * 0.42) * vignette,
    );
  }

  let greenAlpha =
    (GRID_MUTED_ALPHA + (GREEN_REVEAL_ALPHA - GRID_MUTED_ALPHA) * gt) * vignette;

  if (trail !== null && gt > 0.001) {
    const atHead = trail === 1;
    greenAlpha = Math.max(greenAlpha, (atHead ? 1 : 0.9) * vignette * gt);
  }

  const whiteLayer = whiteAlpha * (1 - gt);
  if (whiteLayer >= GRID_MIN_VISIBLE_ALPHA) {
    drawWhiteGlowCircle(ctx, x, y, radius, whiteLayer);
  }

  if (greenAlpha >= GRID_MIN_VISIBLE_ALPHA) {
    drawGreenGlowCircle(ctx, x, y, radius, greenAlpha, "muted");
  }
}

function drawAlertsGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  runtime: SweepRuntime,
  dt: number,
) {
  const { offsetX, offsetY, rows, cols } = getGridDimensions(width, height);
  const gridKey = `${width}x${height}:${rows}x${cols}`;
  ensureSweepRuntime(runtime, cols, rows, gridKey);
  advanceSweep(runtime, dt);
  advanceGreenTargets(runtime, dt);

  const centerX = width / 2;
  const centerY = height / 2;

  for (let col = 0; col < cols; col++) {
    const x = offsetX + col * GRID_SPACING;
    const trail = trailBrightness(runtime.sweepCol, col);

    for (let row = 0; row < rows; row++) {
      const y = offsetY + row * GRID_SPACING;
      const vignette = compositionFalloff(
        x,
        y,
        centerX,
        centerY,
        width,
        height,
      );
      if (vignette < 0.01) continue;

      const target = runtime.greenTargets.find(
        (t) => t.row === row && t.col === col && !t.following,
      );
      const greenBlend = target?.reveal ?? 0;

      drawSweepDot(ctx, x, y, vignette, greenBlend, trail);
    }
  }

  for (const target of runtime.greenTargets) {
    if (target.reveal <= 0.001) continue;

    const drawCol = target.following ? target.displayCol : target.col;
    const x = offsetX + drawCol * GRID_SPACING;
    const y = offsetY + target.row * GRID_SPACING;
    const vignette = compositionFalloff(
      x,
      y,
      centerX,
      centerY,
      width,
      height,
    );
    if (vignette < 0.01) continue;

    const trailCol = Math.round(drawCol);
    const trail = trailBrightness(runtime.sweepCol, trailCol);

    if (target.following) {
      drawSweepDot(ctx, x, y, vignette, target.reveal, trail);
    }

    const gt = smoothstep(clamp01(target.reveal));
    const dotDiameter = GRID_DOT_RADIUS * 2;
    const diameter =
      (dotDiameter + (GREEN_ALERT_ICON_DIAMETER - dotDiameter) * gt) *
      vignette;
    const alpha = 0.9 * gt * vignette;

    drawCommandCenterAlertDot(ctx, x, y, diameter, alpha, "green");
  }
}

export function AlertsFeatureCanvas() {
  const runtimeRef = useRef<SweepRuntime>({
    sweepCol: 0,
    stepAccS: 0,
    greenTargets: [],
    gridKey: "",
    cols: 0,
    rows: 0,
  });

  const { containerRef, canvasRef } = useCommandCenterCanvasLoop(
    ({ ctx, width, height, dt }) => {
      ctx.clearRect(0, 0, width, height);
      drawAlertsGrid(ctx, width, height, runtimeRef.current, dt);
    },
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
