/** Command Center card: Personalized Alerts (`visual: "alerts"`). */
"use client";

import { useEffect, useRef } from "react";
import {
  getGridDimensions,
  gridOffsets,
  type PixelPoint,
} from "@/features/home/components/commandCenterCanvas";
import {
  cellKey,
  cellOrganicUnit,
  clamp,
  clamp01,
  GRID_DOT_RADIUS,
  GRID_MIN_VISIBLE_ALPHA,
  GRID_MIN_VISIBLE_RADIUS,
  GRID_MUTED_ALPHA,
  GRID_MODIFIER_ZONE_PIXEL_RADIUS,
  GRID_SPACING,
  isInsideModifierZone,
  smoothstep,
} from "@/features/home/components/commandCenterGrid";
import {
  drawCommandCenterAlertDot,
  loadCommandCenterAlertDotImage,
} from "@/features/home/components/commandCenterMagnifyingRing";
import { drawGreenGlowCircle } from "@/features/home/components/commandCenterGreenGlow";
import { drawRedGlowCircle } from "@/features/home/components/commandCenterRedGlow";
import { drawWhiteGlowCircle } from "@/features/home/components/commandCenterWhiteGlow";
import { useCommandCenterCanvasLoop } from "@/features/home/hooks/useCommandCenterCanvasLoop";

/** Hub row vs canvas center (0 = vertically centered on card). */
const HUB_ROW_OFFSET = 0;

/** Top→bottom sweep; all columns in sync (row phase only). */
const CASCADE_SPEED = 0.95;
const CASCADE_STAGGER = 0.17;
const ROW_CASCADE_ALPHA_MIN = 0.38;
const ROW_CASCADE_SCALE_MIN = 0.48;
const ROW_CASCADE_SCALE_MAX = 1.85;
const ALERTS_DOT_GLOW_OPACITY = 0.92;
const STICK_PEAK_HASH_SALT = 47;
const PICK_COLOR_HASH_SALT = 61;
/** ~70% green / 30% red per alert wave. */
const GREEN_PICK_CHANCE = 0.7;
const TWO_PI = Math.PI * 2;
/** Row pulse must be at crest (avoids sticking while wave is still rising/falling). */
const STICK_PULSE_MIN = 0.97;
/** Wider fade band than shared grid (default 4 cells → 7 cells). */
const ALERTS_MODIFIER_FALLOFF_PIXEL = 7 * GRID_SPACING;
/** Pure white core for alerts grid (default white glow is muted gray). */
const ALERTS_WHITE_TONE = { r: 255, g: 255, b: 255 };
/** Icon size vs glow core — grid diameter alone is too small to read. */
const MAGNIFY_DOT_DIAMETER_SCALE = 2.6;
const ALERT_ICON_SIZE_SCALE = 1.65;
const MAGNIFY_DOT_MIN_DIAMETER = 14;
const MAGNIFY_DOT_HIGHLIGHT_ALPHA = 1;
const ALERT_ICON_FADE_S = 0.34;
/** White/green/red glow extends past dot center — keep centers inside clip bounds. */
const DOT_GLOW_OUTER_SCALE = 1.15 * 1.38;
const MAX_DOT_GLOW_OUTER_RADIUS =
  GRID_DOT_RADIUS * ROW_CASCADE_SCALE_MAX * DOT_GLOW_OUTER_SCALE;
const CANVAS_EDGE_INSET = Math.ceil(
  Math.max(MAX_DOT_GLOW_OUTER_RADIUS, (MAGNIFY_DOT_MIN_DIAMETER * ALERT_ICON_SIZE_SCALE) / 2),
);

type HighlightColor = "green" | "red";

type WaveHighlightPlan = {
  picks: Set<string>;
  colors: Map<string, HighlightColor>;
};

type AlertIconPhase = "in" | "held" | "out";

type AlertIconState = {
  phase: AlertIconPhase;
  phaseStartS: number;
  color: HighlightColor;
};

function getHubPosition(width: number, height: number): PixelPoint {
  const { offsetX, offsetY } = gridOffsets(width, height);
  const cols = Math.ceil((width - offsetX) / GRID_SPACING) + 1;
  const rows = Math.ceil((height - offsetY) / GRID_SPACING) + 1;
  const centerCol = Math.round((width / 2 - offsetX) / GRID_SPACING);
  const centerRow = Math.round((height / 2 - offsetY) / GRID_SPACING);
  const hubCol = clamp(centerCol, 0, cols - 1);
  const hubRow = clamp(centerRow + HUB_ROW_OFFSET, 0, rows - 1);

  return {
    x: offsetX + hubCol * GRID_SPACING,
    y: offsetY + hubRow * GRID_SPACING,
  };
}

function cellCascadePhase(row: number, timeS: number) {
  return timeS * CASCADE_SPEED - row * CASCADE_STAGGER;
}

function rowCascadePhase(row: number, timeS: number) {
  return cellCascadePhase(row, timeS);
}

/** One full top→bottom sweep (all rows share this cycle). */
function globalSweepCycle(timeS: number) {
  return Math.floor((timeS * CASCADE_SPEED) / TWO_PI);
}

function rowSweepCycle(row: number, timeS: number) {
  return Math.floor(rowCascadePhase(row, timeS) / TWO_PI);
}

function clearRowStuck(
  stuck: Set<string>,
  stuckColors: Map<string, HighlightColor>,
  row: number,
) {
  const prefix = `${row},`;
  for (const key of [...stuck]) {
    if (!key.startsWith(prefix)) continue;
    stuck.delete(key);
    stuckColors.delete(key);
  }
}

function rowPulse(row: number, timeS: number) {
  return 0.5 + 0.5 * Math.sin(cellCascadePhase(row, timeS));
}

function isRowAtWaveCrest(row: number, timeS: number) {
  return rowPulse(row, timeS) >= STICK_PULSE_MIN;
}

function rowCascadeFactors(row: number, timeS: number) {
  const pulse = rowPulse(row, timeS);
  return {
    alpha: ROW_CASCADE_ALPHA_MIN + (1 - ROW_CASCADE_ALPHA_MIN) * pulse,
    scale:
      ROW_CASCADE_SCALE_MIN +
      (ROW_CASCADE_SCALE_MAX - ROW_CASCADE_SCALE_MIN) * pulse,
  };
}

function peakCascadeFactors() {
  return { alpha: 1, scale: ROW_CASCADE_SCALE_MAX };
}

/** Hub falloff: 1 inside modifier zone, smooth fade to 0 at falloff edge. */
function alertsDotFalloffScale(
  dotX: number,
  dotY: number,
  hubX: number,
  hubY: number,
) {
  if (isInsideModifierZone(dotX, dotY, hubX, hubY)) {
    return 1;
  }

  const dist = Math.hypot(dotX - hubX, dotY - hubY);
  const outside = dist - GRID_MODIFIER_ZONE_PIXEL_RADIUS;
  if (outside >= ALERTS_MODIFIER_FALLOFF_PIXEL) {
    return 0;
  }

  const t = smoothstep(outside / ALERTS_MODIFIER_FALLOFF_PIXEL);
  return 1 - t;
}

/** Narrow pulse excursion as hub falloff fades (keeps edge dots small/dim). */
function pulseModulatedByFalloff(value: number, falloffScale: number) {
  return 1 + (value - 1) * falloffScale;
}

/** Falloff disc + glow halo so edge dots are not clipped at the circle boundary. */
function isDotInsideFalloffVisibleArea(
  dotX: number,
  dotY: number,
  hubX: number,
  hubY: number,
  glowOuterRadius: number,
) {
  const dist = Math.hypot(dotX - hubX, dotY - hubY);
  return (
    dist <=
    GRID_MODIFIER_ZONE_PIXEL_RADIUS +
      ALERTS_MODIFIER_FALLOFF_PIXEL +
      glowOuterRadius
  );
}

function isInsideCanvasGlowMargin(
  x: number,
  y: number,
  width: number,
  height: number,
  outerRadius: number,
) {
  return (
    x >= outerRadius &&
    x <= width - outerRadius &&
    y >= outerRadius &&
    y <= height - outerRadius
  );
}

function pickedHighlightColor(
  row: number,
  col: number,
  waveCycle: number,
): HighlightColor {
  return cellOrganicUnit(row, col + PICK_COLOR_HASH_SALT + waveCycle * 313) <
    GREEN_PICK_CHANCE
    ? "green"
    : "red";
}

function waveHighlightScore(row: number, col: number, waveCycle: number) {
  return cellOrganicUnit(
    row,
    col + STICK_PEAK_HASH_SALT + waveCycle * 911,
  );
}

/** Exactly one highlight per global wave (deterministic hub cell per cycle). */
function buildWaveHighlightPicks(
  rows: number,
  cols: number,
  offsetX: number,
  offsetY: number,
  hubX: number,
  hubY: number,
  waveCycle: number,
) {
  const picks = new Set<string>();
  const colors = new Map<string, HighlightColor>();

  let chosen: { row: number; col: number } | null = null;
  let bestScore = Infinity;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      if (!isInFullStrengthHub(x, y, hubX, hubY)) continue;

      const score = waveHighlightScore(row, col, waveCycle);
      if (score >= bestScore) continue;

      bestScore = score;
      chosen = { row, col };
    }
  }

  if (chosen) {
    const key = cellKey(chosen.row, chosen.col);
    picks.add(key);
    colors.set(key, pickedHighlightColor(chosen.row, chosen.col, waveCycle));
  }

  return { picks, colors };
}

/** Full-strength hub only — fade band never reaches max size/opacity. */
function isInFullStrengthHub(
  dotX: number,
  dotY: number,
  hubX: number,
  hubY: number,
) {
  return isInsideModifierZone(dotX, dotY, hubX, hubY);
}

function pruneInvalidStuckCells(
  stuck: Set<string>,
  stuckColors: Map<string, HighlightColor>,
  offsetX: number,
  offsetY: number,
  hubX: number,
  hubY: number,
) {
  for (const key of [...stuck]) {
    const comma = key.indexOf(",");
    const row = Number(key.slice(0, comma));
    const col = Number(key.slice(comma + 1));
    const x = offsetX + col * GRID_SPACING;
    const y = offsetY + row * GRID_SPACING;
    if (!isInFullStrengthHub(x, y, hubX, hubY)) {
      stuck.delete(key);
      stuckColors.delete(key);
    }
  }
}

function alertIconFadeAlpha(state: AlertIconState, timeS: number) {
  const t = clamp01((timeS - state.phaseStartS) / ALERT_ICON_FADE_S);
  switch (state.phase) {
    case "in":
      return smoothstep(t) * MAGNIFY_DOT_HIGHLIGHT_ALPHA;
    case "held":
      return MAGNIFY_DOT_HIGHLIGHT_ALPHA;
    case "out":
      return (1 - smoothstep(t)) * MAGNIFY_DOT_HIGHLIGHT_ALPHA;
  }
}

function syncAlertIconStates(
  iconStates: Map<string, AlertIconState>,
  stuck: Set<string>,
  stuckColors: Map<string, HighlightColor>,
  timeS: number,
) {
  for (const key of stuck) {
    const color = stuckColors.get(key) ?? "green";
    const existing = iconStates.get(key);
    if (!existing) {
      iconStates.set(key, { phase: "in", phaseStartS: timeS, color });
      continue;
    }
    if (existing.phase === "out") {
      iconStates.set(key, { phase: "in", phaseStartS: timeS, color });
    } else if (existing.phase === "in") {
      const t = timeS - existing.phaseStartS;
      if (t >= ALERT_ICON_FADE_S) {
        iconStates.set(key, {
          phase: "held",
          phaseStartS: timeS,
          color: existing.color,
        });
      }
    }
  }

  for (const [key, state] of [...iconStates]) {
    if (stuck.has(key)) continue;

    if (state.phase === "out") {
      if (timeS - state.phaseStartS >= ALERT_ICON_FADE_S) {
        iconStates.delete(key);
      }
      continue;
    }

    iconStates.set(key, {
      phase: "out",
      phaseStartS: timeS,
      color: state.color,
    });
  }
}

function updatePeakStuckCells(
  stuck: Set<string>,
  stuckColors: Map<string, HighlightColor>,
  rowCycles: Map<number, number>,
  wavePlan: WaveHighlightPlan,
  rows: number,
  cols: number,
  timeS: number,
  offsetX: number,
  offsetY: number,
  hubX: number,
  hubY: number,
) {
  pruneInvalidStuckCells(stuck, stuckColors, offsetX, offsetY, hubX, hubY);

  for (let row = 0; row < rows; row++) {
    const cycle = rowSweepCycle(row, timeS);
    if (rowCycles.get(row) !== cycle) {
      rowCycles.set(row, cycle);
      clearRowStuck(stuck, stuckColors, row);
    }

    if (!isRowAtWaveCrest(row, timeS)) continue;

    for (let col = 0; col < cols; col++) {
      const key = cellKey(row, col);
      if (!wavePlan.picks.has(key)) continue;

      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      if (!isInFullStrengthHub(x, y, hubX, hubY)) continue;

      if (!stuck.has(key)) {
        const color = wavePlan.colors.get(key);
        if (color) stuckColors.set(key, color);
      }
      stuck.add(key);
    }
  }
}

function drawCascadingFalloffGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hubX: number,
  hubY: number,
  timeS: number,
  stuckAtPeak: Set<string>,
  stuckColors: Map<string, HighlightColor>,
  alertIconStates: Map<string, AlertIconState>,
) {
  const { offsetX, offsetY, rows, cols } = getGridDimensions(width, height);
  const glowAlphaScale = ALERTS_DOT_GLOW_OPACITY / GRID_MUTED_ALPHA;
  const peakGlowRadius = GRID_DOT_RADIUS * ROW_CASCADE_SCALE_MAX;
  const peakIconDiameter =
    Math.max(
      MAGNIFY_DOT_MIN_DIAMETER,
      peakGlowRadius * 2 * MAGNIFY_DOT_DIAMETER_SCALE,
    ) * ALERT_ICON_SIZE_SCALE;

  for (const [key, state] of alertIconStates) {
    const iconAlpha = alertIconFadeAlpha(state, timeS);
    if (iconAlpha < 0.01) continue;

    const comma = key.indexOf(",");
    const row = Number(key.slice(0, comma));
    const col = Number(key.slice(comma + 1));
    const x = offsetX + col * GRID_SPACING;
    const y = offsetY + row * GRID_SPACING;
    const iconOuterRadius = peakIconDiameter / 2;
    if (!isInsideCanvasGlowMargin(x, y, width, height, iconOuterRadius)) {
      continue;
    }

    drawCommandCenterAlertDot(
      ctx,
      x,
      y,
      peakIconDiameter,
      iconAlpha,
      state.color,
    );
  }

  for (let row = 0; row < rows; row++) {
    const rowCascade = rowCascadeFactors(row, timeS);

    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      const key = cellKey(row, col);
      const iconState = alertIconStates.get(key);
      const isStuckPeak =
        stuckAtPeak.has(key) && isInFullStrengthHub(x, y, hubX, hubY);
      const isHighlightFadingOut = iconState?.phase === "out";
      const cascade =
        isStuckPeak || isHighlightFadingOut
          ? peakCascadeFactors()
          : rowCascade;
      const highlightColor = isStuckPeak
        ? stuckColors.get(key)
        : isHighlightFadingOut
          ? iconState.color
          : null;

      const falloffScale = alertsDotFalloffScale(x, y, hubX, hubY);
      if (falloffScale <= 0) continue;

      const pulseScale = pulseModulatedByFalloff(cascade.scale, falloffScale);
      const pulseAlpha = pulseModulatedByFalloff(cascade.alpha, falloffScale);
      const glowRadius = GRID_DOT_RADIUS * falloffScale * pulseScale;
      const glowOuterRadius = glowRadius * DOT_GLOW_OUTER_SCALE;
      const glowAlpha =
        GRID_MUTED_ALPHA * falloffScale * pulseAlpha * glowAlphaScale;

      if (
        glowRadius < GRID_MIN_VISIBLE_RADIUS ||
        glowAlpha < GRID_MIN_VISIBLE_ALPHA
      ) {
        continue;
      }

      if (
        !isDotInsideFalloffVisibleArea(x, y, hubX, hubY, glowOuterRadius) ||
        !isInsideCanvasGlowMargin(x, y, width, height, glowOuterRadius)
      ) {
        continue;
      }

      if (highlightColor === "red") {
        drawRedGlowCircle(ctx, x, y, glowRadius, glowAlpha);
      } else if (highlightColor === "green") {
        drawGreenGlowCircle(ctx, x, y, glowRadius, glowAlpha);
      } else {
        drawWhiteGlowCircle(
          ctx,
          x,
          y,
          glowRadius,
          glowAlpha,
          ALERTS_WHITE_TONE,
        );
      }

    }
  }
}

export function PortfolioFeatureCanvas() {
  useEffect(() => {
    loadCommandCenterAlertDotImage();
  }, []);

  const stuckAtPeakRef = useRef(new Set<string>());
  const stuckColorsRef = useRef(new Map<string, HighlightColor>());
  const alertIconStatesRef = useRef(new Map<string, AlertIconState>());
  const waveHighlightPlanRef = useRef<WaveHighlightPlan>({
    picks: new Set(),
    colors: new Map(),
  });
  const rowCyclesRef = useRef(new Map<number, number>());
  const globalWaveCycleRef = useRef(-1);
  const layoutKeyRef = useRef("");

  const { containerRef, canvasRef } = useCommandCenterCanvasLoop(
    ({ ctx, width, height, timeS }) => {
      const layoutKey = `${width}x${height}`;
      if (layoutKeyRef.current !== layoutKey) {
        layoutKeyRef.current = layoutKey;
        stuckAtPeakRef.current = new Set();
        stuckColorsRef.current = new Map();
        alertIconStatesRef.current = new Map();
        waveHighlightPlanRef.current = { picks: new Set(), colors: new Map() };
        rowCyclesRef.current = new Map();
        globalWaveCycleRef.current = -1;
      }

      const hub = getHubPosition(width, height);
      const { offsetX, offsetY, rows, cols } = getGridDimensions(width, height);
      const waveCycle = globalSweepCycle(timeS);
      if (globalWaveCycleRef.current !== waveCycle) {
        globalWaveCycleRef.current = waveCycle;
        waveHighlightPlanRef.current = buildWaveHighlightPicks(
          rows,
          cols,
          offsetX,
          offsetY,
          hub.x,
          hub.y,
          waveCycle,
        );
      }

      updatePeakStuckCells(
        stuckAtPeakRef.current,
        stuckColorsRef.current,
        rowCyclesRef.current,
        waveHighlightPlanRef.current,
        rows,
        cols,
        timeS,
        offsetX,
        offsetY,
        hub.x,
        hub.y,
      );
      syncAlertIconStates(
        alertIconStatesRef.current,
        stuckAtPeakRef.current,
        stuckColorsRef.current,
        timeS,
      );

      ctx.clearRect(0, 0, width, height);
      drawCascadingFalloffGrid(
        ctx,
        width,
        height,
        hub.x,
        hub.y,
        timeS,
        stuckAtPeakRef.current,
        stuckColorsRef.current,
        alertIconStatesRef.current,
      );
    },
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ padding: CANVAS_EDGE_INSET }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
