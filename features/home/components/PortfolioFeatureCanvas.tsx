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

/** Row-units of lit tail behind the sweeping front (big → small). */
const WAVE_TAIL_ROWS = 3.85;
/** Max per-column wave delay (row-units), chosen pseudo-randomly per column. */
const WAVE_COL_STAGGER_MAX_ROWS = 4;
const COL_WAVE_OFFSET_SALT = 29;
const WAVE_SPEED = 2.5;
/** Rest at base grey between sweeps (seconds). */
const WAVE_CYCLE_PAUSE_S = 0.65;
const BASE_DOT_ALPHA = GRID_MUTED_ALPHA * 0.55;
const WAVE_WHITE_ALPHA = 0.92;
/** Peak scale for dots at full wave brightness (base stays 1×). */
const WAVE_WHITE_SCALE_MAX = 1.55;
const ALERTS_DOT_GLOW_OPACITY = 0.92;
const STICK_PEAK_HASH_SALT = 47;
const PICK_COLOR_HASH_SALT = 61;
/** ~70% green / 30% red per alert wave. */
const GREEN_PICK_CHANCE = 0.7;
/** Glow extends past core — skip edge cells so halos are not clipped. */
const DOT_GLOW_OUTER_SCALE = 1.15 * 1.38;
const DRAWABLE_CORE_RADIUS = GRID_DOT_RADIUS;
/** Pure white core for alerts grid (default white glow is muted gray). */
const ALERTS_WHITE_TONE = { r: 255, g: 255, b: 255 };
const MAGNIFY_DOT_DIAMETER_SCALE = 2.6;
const ALERT_ICON_SIZE_SCALE = 1.65;
const MAGNIFY_DOT_MIN_DIAMETER = 14;
const MAGNIFY_DOT_HIGHLIGHT_ALPHA = 1;
const ALERT_ICON_FADE_S = 0.55;
const HIGHLIGHT_STICK_BOOST_MIN = 0.88;
/** Picked dot: hold full white after the wave peak. */
const HIGHLIGHT_WHITE_HOLD_S = 0.45;
/** Then crossfade white → green/red. */
const HIGHLIGHT_COLOR_REVEAL_S = 1.05;
/** Keep alert visible before returning to base grey. */
const HIGHLIGHT_HOLD_AFTER_REVEAL_S = 2.2;
const HIGHLIGHT_LATCH_TOTAL_S =
  HIGHLIGHT_WHITE_HOLD_S +
  HIGHLIGHT_COLOR_REVEAL_S +
  HIGHLIGHT_HOLD_AFTER_REVEAL_S;
const HIGHLIGHT_PULSE_CYCLES = 2;
const HIGHLIGHT_PULSE_HZ = 3.2;
const HIGHLIGHT_PULSE_RADIUS = 0.2;
const HIGHLIGHT_PULSE_ALPHA = 0.14;
const HIGHLIGHT_SPARKLE_SALT = 83;
/** Small opacity twinkle after latch (seconds). */
const HIGHLIGHT_SPARKLE_DURATION_S = 0.9;
const HIGHLIGHT_SPARKLE_AMOUNT = 0.11;
const HIGHLIGHT_SPARKLE_BUCKET_HZ = 52;
const HIGHLIGHT_SPARKLE_FLICKER_HZ_A = 98;
const HIGHLIGHT_SPARKLE_FLICKER_HZ_B = 142;

type HighlightColor = "green" | "red";

type HighlightLatch = {
  color: HighlightColor;
  startS: number;
};

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

function isInHubZone(dotX: number, dotY: number, hubX: number, hubY: number) {
  return isInsideModifierZone(dotX, dotY, hubX, hubY);
}

function columnWaveOffset(col: number) {
  return (
    cellOrganicUnit(0, col + COL_WAVE_OFFSET_SALT) * WAVE_COL_STAGGER_MAX_ROWS
  );
}

function waveColumnStagger() {
  return WAVE_COL_STAGGER_MAX_ROWS;
}

function waveTravelSpan(rows: number) {
  return Math.max(1, rows) + WAVE_TAIL_ROWS + waveColumnStagger();
}

function waveCycleSpan(rows: number) {
  return waveTravelSpan(rows) + WAVE_CYCLE_PAUSE_S * WAVE_SPEED;
}

/** Leading edge row index (sweeps top → bottom); null during inter-cycle pause. */
function waveFrontRow(timeS: number, rows: number): number | null {
  const travelSpan = waveTravelSpan(rows);
  const phase = (timeS * WAVE_SPEED) % waveCycleSpan(rows);
  if (phase >= travelSpan) return null;
  return phase;
}

function globalSweepCycle(timeS: number, rows: number) {
  return Math.floor((timeS * WAVE_SPEED) / waveCycleSpan(rows));
}

/**
 * Comet tail behind the front: brightest/largest at the leading row,
 * monotonically dimmer and smaller toward rows the wave already passed.
 * Each column has a pseudo-random phase offset along the sweep.
 */
function cellWaveProfile(
  row: number,
  col: number,
  waveFront: number | null,
) {
  if (waveFront === null) {
    return { alpha: 0, scale: 0 };
  }

  const front = waveFront - columnWaveOffset(col);
  const behind = front - row;
  if (behind < 0 || behind > WAVE_TAIL_ROWS) {
    return { alpha: 0, scale: 0 };
  }

  const t = 1 - behind / WAVE_TAIL_ROWS;
  return {
    alpha: smoothstep(t),
    scale: t,
  };
}

function glowOuterRadius(coreRadius: number) {
  return coreRadius * DOT_GLOW_OUTER_SCALE;
}

function isDrawableGridCell(
  x: number,
  y: number,
  width: number,
  height: number,
  coreRadius = DRAWABLE_CORE_RADIUS,
) {
  const outer = glowOuterRadius(coreRadius);
  return (
    x - outer >= 0 &&
    x + outer <= width &&
    y - outer >= 0 &&
    y + outer <= height
  );
}

/** Skip top row, bottom two rows, and side columns (glow would clip at edges). */
function isAlertsGridCell(
  row: number,
  col: number,
  rows: number,
  cols: number,
  x: number,
  y: number,
  width: number,
  height: number,
  coreRadius = DRAWABLE_CORE_RADIUS,
) {
  if (
    row === 0 ||
    row >= rows - 3 ||
    col === 0 ||
    col === cols - 1
  ) {
    return false;
  }
  return isDrawableGridCell(x, y, width, height, coreRadius);
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

function buildWaveHighlightPicks(
  rows: number,
  cols: number,
  offsetX: number,
  offsetY: number,
  hubX: number,
  hubY: number,
  width: number,
  height: number,
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
      if (!isInHubZone(x, y, hubX, hubY)) continue;
      if (!isAlertsGridCell(row, col, rows, cols, x, y, width, height)) {
        continue;
      }

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

function highlightRevealMix(elapsed: number) {
  if (elapsed < HIGHLIGHT_WHITE_HOLD_S) {
    return { whiteMix: 1, colorMix: 0 };
  }
  if (elapsed < HIGHLIGHT_WHITE_HOLD_S + HIGHLIGHT_COLOR_REVEAL_S) {
    const t = clamp01(
      (elapsed - HIGHLIGHT_WHITE_HOLD_S) / HIGHLIGHT_COLOR_REVEAL_S,
    );
    const blend = smoothstep(smoothstep(t));
    return { whiteMix: 1 - blend, colorMix: blend };
  }
  return { whiteMix: 0, colorMix: 1 };
}

/** Two pulse loops at latch start, then steady glow. */
function highlightPulse(
  elapsed: number,
  whiteMix: number,
  colorMix: number,
) {
  const intensity = Math.max(whiteMix, colorMix);
  if (intensity < 0.02) {
    return { scale: 1, alpha: 1 };
  }

  const pulseDuration = HIGHLIGHT_PULSE_CYCLES / HIGHLIGHT_PULSE_HZ;
  if (elapsed >= pulseDuration) {
    return { scale: 1, alpha: 1 };
  }

  const wave = 0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2 * HIGHLIGHT_PULSE_HZ);
  const settleT = clamp01((elapsed - pulseDuration * 0.82) / (pulseDuration * 0.18));
  const envelope = (1 - smoothstep(settleT)) * intensity;
  return {
    scale: 1 + HIGHLIGHT_PULSE_RADIUS * wave * envelope,
    alpha: 1 + HIGHLIGHT_PULSE_ALPHA * wave * envelope,
  };
}

function highlightSparkleAlpha(
  elapsed: number,
  row: number,
  col: number,
  intensity: number,
) {
  if (intensity < 0.02 || elapsed >= HIGHLIGHT_SPARKLE_DURATION_S) {
    return 1;
  }

  const envelope = 1 - smoothstep(elapsed / HIGHLIGHT_SPARKLE_DURATION_S);
  const bucket = Math.floor(elapsed * HIGHLIGHT_SPARKLE_BUCKET_HZ);
  const u0 = cellOrganicUnit(row, col + HIGHLIGHT_SPARKLE_SALT + bucket);
  const u1 = cellOrganicUnit(row + 11, col + HIGHLIGHT_SPARKLE_SALT + bucket * 3);
  const flicker =
    0.55 +
    0.3 *
      Math.sin(
        elapsed * Math.PI * 2 * HIGHLIGHT_SPARKLE_FLICKER_HZ_A + u0 * Math.PI * 2,
      ) +
    0.15 *
      Math.sin(
        elapsed * Math.PI * 2 * HIGHLIGHT_SPARKLE_FLICKER_HZ_B + u1 * Math.PI * 2,
      );
  const glint = u0 > 0.78 ? 0.22 * envelope * intensity : 0;
  return 1 + (HIGHLIGHT_SPARKLE_AMOUNT * flicker + glint) * envelope * intensity;
}

function highlightVisualMods(
  elapsed: number,
  row: number,
  col: number,
  whiteMix: number,
  colorMix: number,
) {
  const intensity = Math.max(whiteMix, colorMix);
  const pulse = highlightPulse(elapsed, whiteMix, colorMix);
  const sparkle = highlightSparkleAlpha(elapsed, row, col, intensity);
  return {
    scale: pulse.scale,
    alpha: pulse.alpha * sparkle,
  };
}

function highlightIconRevealDelayS() {
  return HIGHLIGHT_WHITE_HOLD_S + HIGHLIGHT_COLOR_REVEAL_S * 0.5;
}

function drawHighlightGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  row: number,
  col: number,
  color: HighlightColor,
  elapsed: number,
  whiteMix: number,
  colorMix: number,
  peakAlpha: number,
) {
  const mods = highlightVisualMods(elapsed, row, col, whiteMix, colorMix);
  const radius =
    DRAWABLE_CORE_RADIUS *
    (WAVE_WHITE_SCALE_MAX + 0.15 * colorMix) *
    mods.scale;
  const peakA = peakAlpha * mods.alpha;

  if (whiteMix > 0.01) {
    drawWhiteGlowCircle(
      ctx,
      x,
      y,
      radius,
      peakA * whiteMix,
      ALERTS_WHITE_TONE,
    );
  }
  if (colorMix > 0.01) {
    if (color === "green") {
      drawGreenGlowCircle(ctx, x, y, radius, peakA * colorMix);
    } else {
      drawRedGlowCircle(ctx, x, y, radius, peakA * colorMix);
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

function updateHighlightLatch(
  latch: Map<string, HighlightLatch>,
  wavePlan: WaveHighlightPlan,
  rows: number,
  cols: number,
  timeS: number,
) {
  const waveFront = waveFrontRow(timeS, rows);

  for (const [key, entry] of [...latch]) {
    if (timeS - entry.startS >= HIGHLIGHT_LATCH_TOTAL_S) {
      latch.delete(key);
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const key = cellKey(row, col);
      if (latch.has(key)) continue;
      if (!wavePlan.picks.has(key)) continue;

      const { alpha } = cellWaveProfile(row, col, waveFront);
      if (alpha < HIGHLIGHT_STICK_BOOST_MIN) continue;

      const color = wavePlan.colors.get(key) ?? "green";
      latch.set(key, { color, startS: timeS });
    }
  }
}

function latchKeysShowingIcon(
  latch: Map<string, HighlightLatch>,
  timeS: number,
) {
  const keys = new Set<string>();
  const iconDelay = highlightIconRevealDelayS();
  for (const [key, entry] of latch) {
    if (timeS - entry.startS >= iconDelay) {
      keys.add(key);
    }
  }
  return keys;
}

function drawAlertsGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeS: number,
  rows: number,
  highlightLatch: Map<string, HighlightLatch>,
  alertIconStates: Map<string, AlertIconState>,
) {
  const { offsetX, offsetY, cols } = getGridDimensions(width, height);
  const glowAlphaScale = ALERTS_DOT_GLOW_OPACITY / GRID_MUTED_ALPHA;
  const baseAlpha = BASE_DOT_ALPHA * glowAlphaScale;
  const peakAlpha = WAVE_WHITE_ALPHA * glowAlphaScale;
  const waveFront = waveFrontRow(timeS, rows);
  const peakIconDiameter =
    Math.max(
      MAGNIFY_DOT_MIN_DIAMETER,
      DRAWABLE_CORE_RADIUS * 2 * MAGNIFY_DOT_DIAMETER_SCALE,
    ) * ALERT_ICON_SIZE_SCALE;

  for (const [key, state] of alertIconStates) {
    let iconAlpha = alertIconFadeAlpha(state, timeS);
    if (iconAlpha < 0.01) continue;

    const comma = key.indexOf(",");
    const row = Number(key.slice(0, comma));
    const col = Number(key.slice(comma + 1));
    const x = offsetX + col * GRID_SPACING;
    const y = offsetY + row * GRID_SPACING;
    if (!isAlertsGridCell(row, col, rows, cols, x, y, width, height)) {
      continue;
    }

    let iconDiameter = peakIconDiameter;
    const latch = highlightLatch.get(key);
    if (latch) {
      const elapsed = timeS - latch.startS;
      const { whiteMix, colorMix } = highlightRevealMix(elapsed);
      const mods = highlightVisualMods(elapsed, row, col, whiteMix, colorMix);
      iconDiameter *= mods.scale;
      iconAlpha *= mods.alpha;
    }

    drawCommandCenterAlertDot(
      ctx,
      x,
      y,
      iconDiameter,
      iconAlpha,
      state.color,
    );
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { alpha: waveAlpha, scale: waveScale } = cellWaveProfile(
        row,
        col,
        waveFront,
      );
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      const key = cellKey(row, col);
      const iconState = alertIconStates.get(key);
      const latch = highlightLatch.get(key);
      const isHighlightFadingOut = iconState?.phase === "out";

      if (
        !isAlertsGridCell(
          row,
          col,
          rows,
          cols,
          x,
          y,
          width,
          height,
          DRAWABLE_CORE_RADIUS,
        )
      ) {
        continue;
      }

      if (latch) {
        const elapsed = timeS - latch.startS;
        const { whiteMix, colorMix } = highlightRevealMix(elapsed);
        drawHighlightGlow(
          ctx,
          x,
          y,
          row,
          col,
          latch.color,
          elapsed,
          whiteMix,
          colorMix,
          peakAlpha,
        );
        continue;
      }

      if (isHighlightFadingOut) {
        const glowRadius = DRAWABLE_CORE_RADIUS * WAVE_WHITE_SCALE_MAX;
        if (iconState.color === "red") {
          drawRedGlowCircle(
            ctx,
            x,
            y,
            glowRadius,
            peakAlpha * alertIconFadeAlpha(iconState, timeS),
          );
        } else {
          drawGreenGlowCircle(
            ctx,
            x,
            y,
            glowRadius,
            peakAlpha * alertIconFadeAlpha(iconState, timeS),
          );
        }
        continue;
      }

      const glowRadius =
        DRAWABLE_CORE_RADIUS *
        (1 + waveScale * (WAVE_WHITE_SCALE_MAX - 1));
      const glowAlpha =
        baseAlpha + (peakAlpha - baseAlpha) * waveAlpha;

      if (
        glowRadius < GRID_MIN_VISIBLE_RADIUS ||
        glowAlpha < GRID_MIN_VISIBLE_ALPHA
      ) {
        continue;
      }

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

export function PortfolioFeatureCanvas() {
  useEffect(() => {
    loadCommandCenterAlertDotImage();
  }, []);

  const highlightLatchRef = useRef(new Map<string, HighlightLatch>());
  const alertIconStatesRef = useRef(new Map<string, AlertIconState>());
  const waveHighlightPlanRef = useRef<WaveHighlightPlan>({
    picks: new Set(),
    colors: new Map(),
  });
  const globalWaveCycleRef = useRef(-1);
  const layoutKeyRef = useRef("");

  const { containerRef, canvasRef } = useCommandCenterCanvasLoop(
    ({ ctx, width, height, timeS }) => {
      const layoutKey = `${width}x${height}`;
      if (layoutKeyRef.current !== layoutKey) {
        layoutKeyRef.current = layoutKey;
        highlightLatchRef.current = new Map();
        alertIconStatesRef.current = new Map();
        waveHighlightPlanRef.current = { picks: new Set(), colors: new Map() };
        globalWaveCycleRef.current = -1;
      }

      const hub = getHubPosition(width, height);
      const { offsetX, offsetY, rows, cols } = getGridDimensions(width, height);
      const waveCycle = globalSweepCycle(timeS, rows);
      if (globalWaveCycleRef.current !== waveCycle) {
        globalWaveCycleRef.current = waveCycle;
        highlightLatchRef.current.clear();
        waveHighlightPlanRef.current = buildWaveHighlightPicks(
          rows,
          cols,
          offsetX,
          offsetY,
          hub.x,
          hub.y,
          width,
          height,
          waveCycle,
        );
      }

      updateHighlightLatch(
        highlightLatchRef.current,
        waveHighlightPlanRef.current,
        rows,
        cols,
        timeS,
      );
      const iconLatchKeys = latchKeysShowingIcon(
        highlightLatchRef.current,
        timeS,
      );
      const iconColors = new Map<string, HighlightColor>();
      for (const key of iconLatchKeys) {
        const entry = highlightLatchRef.current.get(key);
        if (entry) iconColors.set(key, entry.color);
      }
      syncAlertIconStates(
        alertIconStatesRef.current,
        iconLatchKeys,
        iconColors,
        timeS,
      );

      ctx.clearRect(0, 0, width, height);
      drawAlertsGrid(
        ctx,
        width,
        height,
        timeS,
        rows,
        highlightLatchRef.current,
        alertIconStatesRef.current,
      );
    },
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
