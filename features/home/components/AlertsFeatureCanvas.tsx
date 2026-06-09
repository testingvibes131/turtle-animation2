/** Command Center card: Personalized Alerts (`visual: "alerts"`). */
"use client";

import { useRef } from "react";
import {
  clearCommandCenterCanvas,
  getGridDimensions,
} from "@/features/home/components/commandCenterCanvas";
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
import {
  drawCommandCenterAlertDot,
  type CommandCenterAlertHighlightColor,
} from "@/features/home/components/commandCenterMagnifyingRing";
import { drawRedGlowCircle } from "@/features/home/components/commandCenterRedGlow";
import { drawWhiteGlowCircle } from "@/features/home/components/commandCenterWhiteGlow";
import { CommandCenterCanvasFrame } from "@/features/home/components/CommandCenterCanvasFrame";

/** Circular vignette from card center (fraction of min canvas side). */
const FALLOFF_OUTER_FRAC = 0.52;
const FALLOFF_INNER_FRAC = 0.36;

/** Column sweep — ported from radar_sweep_grid_v5.html */
const SWEEP_SPEED = 3;
const SWEEP_TRAIL_COLS = 14;
const GREEN_REVEAL_ALPHA = 0.9;
const GAUSSIAN_SPREAD_FRAC = 0.14;
const GREEN_MAX_DIST_FROM_CENTER = 3.75;
const GREEN_REVEAL_S = 0.6;
/** Resting → revealed canvas dot radius. */
const GREEN_RADIUS_SCALE = 1.75;
/** Alert PNG at full reveal — wider than one grid cell. */
const GREEN_ALERT_ICON_DIAMETER = GRID_SPACING * 1.42;
const GREEN_FADE_OUT_S = 0.6;

type AlertTarget = {
  row: number;
  col: number;
  color: CommandCenterAlertHighlightColor;
  /** 0 → 1 fade-in after the sweep passes this column */
  reveal: number;
};

type SweepRuntime = {
  sweepCol: number;
  stepAccS: number;
  greenTargets: AlertTarget[];
  fadingGreenTargets: AlertTarget[];
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
  targets: AlertTarget[],
) {
  return targets.some((t) => {
    if (t.col === col || t.row === row) return true;
    return Math.abs(t.row - row) <= 1 && Math.abs(t.col - col) <= 1;
  });
}

function randomGreenTargetCount() {
  return 1 + Math.floor(Math.random() * 3);
}

function randomAlertColor(): CommandCenterAlertHighlightColor {
  return Math.random() < 0.5 ? "green" : "red";
}

/** Per-target colors; 2+ alerts always include both green and red. */
function assignAlertColors(count: number): CommandCenterAlertHighlightColor[] {
  if (count <= 1) return [randomAlertColor()];

  const colors: CommandCenterAlertHighlightColor[] = ["green", "red"];
  while (colors.length < count) colors.push(randomAlertColor());

  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }
  return colors;
}

function generateGreenTargets(cols: number, rows: number): AlertTarget[] {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const spread = Math.max(cols, rows) * GAUSSIAN_SPREAD_FRAC;
  const targetCount = randomGreenTargetCount();
  const colors = assignAlertColors(targetCount);
  const targets: AlertTarget[] = [];
  let attempts = 0;

  while (targets.length < targetCount && attempts < 1000) {
    attempts++;
    const col = Math.round(cx + gaussianRand() * spread);
    const row = Math.round(cy + gaussianRand() * spread);
    if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
    if (Math.hypot(col - cx, row - cy) > GREEN_MAX_DIST_FROM_CENTER) continue;
    if (conflictsWithTargets(row, col, targets)) continue;
    targets.push({
      row,
      col,
      color: colors[targets.length],
      reveal: 0,
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
  runtime.fadingGreenTargets = [];
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

  if (runtime.sweepCol >= runtime.cols) {
    for (const target of runtime.greenTargets) {
      if (target.reveal > 0.001) runtime.fadingGreenTargets.push(target);
    }
    runtime.sweepCol = 0;
    runtime.greenTargets = generateGreenTargets(runtime.cols, runtime.rows);
  }
}

function advanceGreenTargets(runtime: SweepRuntime, dt: number) {
  for (let i = runtime.fadingGreenTargets.length - 1; i >= 0; i--) {
    const target = runtime.fadingGreenTargets[i];
    target.reveal = Math.max(0, target.reveal - dt / GREEN_FADE_OUT_S);
    if (target.reveal <= 0.001) runtime.fadingGreenTargets.splice(i, 1);
  }

  for (const target of runtime.greenTargets) {
    if (runtime.sweepCol <= target.col) continue;
    if (target.reveal < 1) {
      target.reveal = Math.min(1, target.reveal + dt / GREEN_REVEAL_S);
    }
  }
}

function alertRevealAt(
  row: number,
  col: number,
  targets: AlertTarget[],
  fadingTargets: AlertTarget[],
): { reveal: number; color: CommandCenterAlertHighlightColor } | null {
  let best: AlertTarget | null = null;
  for (const t of [...targets, ...fadingTargets]) {
    if (t.row !== row || t.col !== col) continue;
    if (!best || t.reveal > best.reveal) best = t;
  }
  if (!best || best.reveal <= 0.001) return null;
  return { reveal: best.reveal, color: best.color };
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
  alert: { reveal: number; color: CommandCenterAlertHighlightColor } | null,
  trail: number | null,
) {
  if (vignette < 0.01) return;

  const gt = smoothstep(clamp01(alert?.reveal ?? 0));
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

  let accentAlpha =
    (GRID_MUTED_ALPHA + (GREEN_REVEAL_ALPHA - GRID_MUTED_ALPHA) * gt) * vignette;

  if (trail !== null && gt > 0.001) {
    const atHead = trail === 1;
    accentAlpha = Math.max(accentAlpha, (atHead ? 1 : 0.9) * vignette * gt);
  }

  const whiteLayer = whiteAlpha * (1 - gt);
  if (whiteLayer >= GRID_MIN_VISIBLE_ALPHA) {
    drawWhiteGlowCircle(ctx, x, y, radius, whiteLayer);
  }

  if (accentAlpha >= GRID_MIN_VISIBLE_ALPHA && alert) {
    if (alert.color === "red") {
      drawRedGlowCircle(ctx, x, y, radius, accentAlpha);
    } else {
      drawGreenGlowCircle(ctx, x, y, radius, accentAlpha, "muted");
    }
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

      const alert = alertRevealAt(
        row,
        col,
        runtime.greenTargets,
        runtime.fadingGreenTargets,
      );

      drawSweepDot(ctx, x, y, vignette, alert, trail);
    }
  }

  const allGreenTargets = [
    ...runtime.fadingGreenTargets,
    ...runtime.greenTargets,
  ];
  for (const target of allGreenTargets) {
    if (target.reveal <= 0.001) continue;

    const x = offsetX + target.col * GRID_SPACING;
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

    const gt = smoothstep(clamp01(target.reveal));
    const dotDiameter = GRID_DOT_RADIUS * 2;
    const diameter =
      (dotDiameter + (GREEN_ALERT_ICON_DIAMETER - dotDiameter) * gt) *
      vignette;
    const alpha = 0.9 * gt * vignette;

    drawCommandCenterAlertDot(ctx, x, y, diameter, alpha, target.color);
  }
}

type AlertsFeatureCanvasProps = {
  frameClassName: string;
};

export function AlertsFeatureCanvas({ frameClassName }: AlertsFeatureCanvasProps) {
  const runtimeRef = useRef<SweepRuntime>({
    sweepCol: 0,
    stepAccS: 0,
    greenTargets: [],
    fadingGreenTargets: [],
    gridKey: "",
    cols: 0,
    rows: 0,
  });

  return (
    <CommandCenterCanvasFrame
      frameClassName={frameClassName}
      onFrame={({ ctx, width, height, dt }) => {
        clearCommandCenterCanvas(ctx, width, height);
        drawAlertsGrid(ctx, width, height, runtimeRef.current, dt);
      }}
    />
  );
}
