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
/** Wave + highlight animation only on this many center columns. */
const WAVE_ACTIVE_COL_COUNT = 10;

/** Lit trail length — max dots behind the comet front. */
const WAVE_TAIL_MAX_ROWS = 7;
/** >1 pushes more opacity to the comet front vs the tail. */
const WAVE_TAIL_ALPHA_POWER = 1.35;
/** Peak white glow for the traveling wave (kept ≤1 so trail alpha can vary). */
const WAVE_TRAIL_PEAK_ALPHA = 1;
/** Scale at tail end; front row ramps to 1 (then × WAVE_WHITE_SCALE_MAX). */
const WAVE_TAIL_SCALE_MIN = 0.1;
/** Soft fade (row-units) at comet leading edge and tail — avoids hard cell pops. */
const WAVE_EDGE_SOFT_ROWS = 0.9;
/** Match draw loop — trail end / highlight timing follows rendered alpha. */
const WAVE_TRAIL_LIT_ALPHA = 0.01;
/** Max per-column wave delay (row-units), chosen pseudo-randomly per column. */
const WAVE_COL_STAGGER_MAX_ROWS = 4;
const COL_WAVE_OFFSET_SALT = 29;
const WAVE_SPEED = 2.5;
/** Rest at base grey between sweeps (seconds). */
const WAVE_CYCLE_PAUSE_S = 0.65;
const WAVE_WHITE_ALPHA = 0.92;
/** Peak scale for dots at full wave brightness (base stays 1×). */
const WAVE_WHITE_SCALE_MAX = 1.68;
const ALERTS_DOT_GLOW_OPACITY = 0.92;
const STICK_PEAK_HASH_SALT = 47;
const PICK_COLOR_HASH_SALT = 61;
/** ~70% green / 30% red per alert wave. */
const GREEN_PICK_CHANCE = 0.7;
/** Glow extends past core — skip edge cells so halos are not clipped. */
const DOT_GLOW_OUTER_SCALE = 1.15 * 1.38;
const DRAWABLE_CORE_RADIUS = GRID_DOT_RADIUS;
/** Softer wave dots — muted cool white, not pure #fff. */
const ALERTS_WHITE_TONE = { r: 180, g: 180, b: 188 };
/** Brighter core for the comet front (trail keeps ALERTS_WHITE_TONE via lower alpha). */
const WAVE_TRAIL_WHITE_TONE = { r: 252, g: 252, b: 255 };
/** Extra halo spread for comet trail dots. */
const ALERTS_WAVE_GLOW_OUTER_SCALE = 1.28;
const ALERTS_WAVE_GLOW_ALPHA_SCALE = 1;
const WAVE_TRAIL_PEAK_OPACITY_BOOST = 1.12;
const MAGNIFY_DOT_DIAMETER_SCALE = 2.6;
const ALERT_ICON_SIZE_SCALE = 3.3;
const MAGNIFY_DOT_MIN_DIAMETER = 14;
const MAGNIFY_DOT_HIGHLIGHT_ALPHA = 1;
const ALERT_ICON_FADE_S = 0.26;
/** Picked dot: brief white hold at wave peak. */
const HIGHLIGHT_WHITE_HOLD_S = 0.08;
/** Then crossfade white → green/red. */
const HIGHLIGHT_COLOR_REVEAL_S = 0.36;
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
/** Circular vignette from card center (fraction of min canvas side). */
const ALERTS_FALLOFF_OUTER_FRAC = 0.48;
const ALERTS_FALLOFF_INNER_FRAC = 0.28;
/** Delay after comet first hits the pick before highlight / icon turn on. */
const HIGHLIGHT_AFTER_VISIT_DELAY_S = 1;

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

function getCompositionCenter(width: number, height: number): PixelPoint {
  return { x: width / 2, y: height / 2 };
}

function waveActiveColumnRange(cols: number) {
  const count = Math.min(WAVE_ACTIVE_COL_COUNT, cols);
  const startCol = Math.max(0, Math.floor((cols - count) / 2));
  return { startCol, endCol: startCol + count - 1 };
}

function isWaveActiveColumn(col: number, cols: number) {
  const { startCol, endCol } = waveActiveColumnRange(cols);
  return col >= startCol && col <= endCol;
}

/** 1 at card center, smooth fade to 0 toward edges (composition vignette). */
function alertsCompositionFalloff(
  dotX: number,
  dotY: number,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
) {
  const dist = Math.hypot(dotX - centerX, dotY - centerY);
  const outer = Math.min(width, height) * ALERTS_FALLOFF_OUTER_FRAC;
  const inner = Math.min(width, height) * ALERTS_FALLOFF_INNER_FRAC;
  if (dist <= inner) return 1;
  if (dist >= outer) return 0;
  return 1 - smoothstep((dist - inner) / (outer - inner));
}

function columnWaveOffset(col: number) {
  return (
    cellOrganicUnit(0, col + COL_WAVE_OFFSET_SALT) * WAVE_COL_STAGGER_MAX_ROWS
  );
}

function waveColumnStagger() {
  return WAVE_COL_STAGGER_MAX_ROWS;
}

/** Lit tail length in row-units (capped at WAVE_TAIL_MAX_ROWS). */
function waveTailRows(_rows: number) {
  return WAVE_TAIL_MAX_ROWS;
}

function waveTravelSpan(rows: number) {
  return Math.max(1, rows) + waveTailRows(rows) + waveColumnStagger();
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

function columnWaveFront(waveFront: number, col: number) {
  return waveFront - columnWaveOffset(col);
}

/** Soft envelope at leading edge (behind≈0) and tail end (behind≈tailSpan). */
function waveCometEdgeFade(behind: number, tailSpan: number) {
  const leading = smoothstep(
    clamp01((behind + WAVE_EDGE_SOFT_ROWS) / WAVE_EDGE_SOFT_ROWS),
  );
  const trailing = 1 -
    smoothstep(
      clamp01((behind - (tailSpan - WAVE_EDGE_SOFT_ROWS)) / WAVE_EDGE_SOFT_ROWS),
    );
  return leading * trailing;
}

/**
 * Comet tail behind the front: brightest/largest at the leading edge,
 * monotonically dimmer toward rows above. Uses continuous `behind` (no
 * floor) so brightness blends smoothly between grid rows.
 */
function cellWaveProfile(
  row: number,
  col: number,
  waveFront: number | null,
  rows: number,
) {
  if (waveFront === null) {
    return { alpha: 0, scale: 0 };
  }

  const tailSpan = waveTailRows(rows);
  const behind = columnWaveFront(waveFront, col) - row;
  if (behind < -WAVE_EDGE_SOFT_ROWS || behind > tailSpan + WAVE_EDGE_SOFT_ROWS) {
    return { alpha: 0, scale: 0 };
  }

  const edge = waveCometEdgeFade(behind, tailSpan);
  const t = clamp01(1 - behind / tailSpan);
  const tShaped = smoothstep(Math.pow(t, WAVE_TAIL_ALPHA_POWER));
  const alpha = tShaped * tShaped * edge;
  const scale =
    WAVE_TAIL_SCALE_MIN + (1 - WAVE_TAIL_SCALE_MIN) * smoothstep(t);
  return { alpha, scale };
}

function isWaveLitAtCell(
  row: number,
  col: number,
  waveFront: number,
  rows: number,
) {
  return (
    cellWaveProfile(row, col, waveFront, rows).alpha >= WAVE_TRAIL_LIT_ALPHA
  );
}

function recordPickVisitStart(
  visitStartRef: { current: number | null },
  wavePlan: WaveHighlightPlan,
  waveFront: number | null,
  rows: number,
  cols: number,
  timeS: number,
) {
  if (visitStartRef.current !== null || waveFront === null) return;

  for (const key of wavePlan.picks) {
    const { row, col } = parseCellKey(key);
    if (!isWaveActiveColumn(col, cols)) continue;
    if (isWaveLitAtCell(row, col, waveFront, rows)) {
      visitStartRef.current = timeS;
      return;
    }
  }
}

/** Turn on highlight HIGHLIGHT_AFTER_VISIT_DELAY_S after the comet first hits the pick. */
function isPickedCellHighlightReady(
  visitStartS: number | null,
  timeS: number,
) {
  if (visitStartS === null) return false;
  return timeS - visitStartS >= HIGHLIGHT_AFTER_VISIT_DELAY_S;
}

/** Maps wave scale 0.1→1 to glow radius from 10% to full peak size. */
function waveGlowRadiusMultiplier(waveScale: number) {
  const minMul = WAVE_TAIL_SCALE_MIN * WAVE_WHITE_SCALE_MAX;
  const maxMul = WAVE_WHITE_SCALE_MAX;
  return minMul + waveScale * (maxMul - minMul);
}

/** Resting grid — normal dot size, same muted fill as other Command Center cards. */
function drawMutedGridDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha: number,
) {
  const radius = GRID_DOT_RADIUS;
  if (radius < GRID_MIN_VISIBLE_RADIUS || alpha < GRID_MIN_VISIBLE_ALPHA) {
    return;
  }

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
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
  let bestDist = Infinity;
  let bestTie = Infinity;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      if (!isInHubZone(x, y, hubX, hubY)) continue;
      if (!isWaveActiveColumn(col, cols)) continue;
      if (!isAlertsGridCell(row, col, rows, cols, x, y, width, height)) {
        continue;
      }

      const dist = Math.hypot(x - hubX, y - hubY);
      const tie = cellOrganicUnit(row, col + STICK_PEAK_HASH_SALT + waveCycle * 911);
      if (dist < bestDist || (dist === bestDist && tie < bestTie)) {
        bestDist = dist;
        bestTie = tie;
        chosen = { row, col };
      }
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
    const blend = smoothstep(t);
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

function parseCellKey(key: string) {
  const comma = key.indexOf(",");
  return {
    row: Number(key.slice(0, comma)),
    col: Number(key.slice(comma + 1)),
  };
}

function updateIconRevealReady(
  iconReady: Set<string>,
  wavePlan: WaveHighlightPlan,
  visitStartS: number | null,
  timeS: number,
) {
  if (!isPickedCellHighlightReady(visitStartS, timeS)) return;

  for (const key of wavePlan.picks) {
    iconReady.add(key);
  }
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
  composition = 1,
) {
  const mods = highlightVisualMods(elapsed, row, col, whiteMix, colorMix);
  const radius =
    DRAWABLE_CORE_RADIUS *
    (WAVE_WHITE_SCALE_MAX + 0.15 * colorMix) *
    mods.scale;
  const peakA = peakAlpha * mods.alpha * composition;

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
  cols: number,
  visitStartS: number | null,
  timeS: number,
) {
  for (const [key, entry] of [...latch]) {
    if (timeS - entry.startS >= HIGHLIGHT_LATCH_TOTAL_S) {
      latch.delete(key);
    }
  }

  if (!isPickedCellHighlightReady(visitStartS, timeS)) return;

  for (const key of wavePlan.picks) {
    if (latch.has(key)) continue;
    if (!isWaveActiveColumn(parseCellKey(key).col, cols)) continue;

    const color = wavePlan.colors.get(key) ?? "green";
    latch.set(key, { color, startS: timeS });
  }
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
  const { x: centerX, y: centerY } = getCompositionCenter(width, height);
  const glowAlphaScale = ALERTS_DOT_GLOW_OPACITY / GRID_MUTED_ALPHA;
  const highlightPeakAlpha = WAVE_WHITE_ALPHA * glowAlphaScale;
  const waveFront = waveFrontRow(timeS, rows);
  const peakIconDiameter =
    Math.max(
      MAGNIFY_DOT_MIN_DIAMETER,
      DRAWABLE_CORE_RADIUS * 2 * MAGNIFY_DOT_DIAMETER_SCALE,
    ) * ALERT_ICON_SIZE_SCALE;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const inWaveBand = isWaveActiveColumn(col, cols);
      const waveProfile = inWaveBand
        ? cellWaveProfile(row, col, waveFront, rows)
        : { alpha: 0, scale: 0 };
      const waveAlpha = waveProfile.alpha;
      const waveScale = waveProfile.scale;
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

      const composition = alertsCompositionFalloff(
        x,
        y,
        centerX,
        centerY,
        width,
        height,
      );
      if (composition < 0.01) continue;

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
          highlightPeakAlpha,
          composition,
        );
        continue;
      }

      if (isHighlightFadingOut) {
        const glowRadius = DRAWABLE_CORE_RADIUS * WAVE_WHITE_SCALE_MAX;
        const fadeAlpha =
          highlightPeakAlpha * alertIconFadeAlpha(iconState, timeS) * composition;
        if (iconState.color === "red") {
          drawRedGlowCircle(ctx, x, y, glowRadius, fadeAlpha);
        } else {
          drawGreenGlowCircle(ctx, x, y, glowRadius, fadeAlpha);
        }
        continue;
      }

      if (waveAlpha < WAVE_TRAIL_LIT_ALPHA) {
        drawMutedGridDot(ctx, x, y, GRID_MUTED_ALPHA * composition);
        continue;
      }

      const glowRadius =
        DRAWABLE_CORE_RADIUS * waveGlowRadiusMultiplier(waveScale);
      const trailAlpha =
        WAVE_TRAIL_PEAK_ALPHA * waveAlpha * composition * ALERTS_WAVE_GLOW_ALPHA_SCALE;

      if (
        glowRadius < GRID_MIN_VISIBLE_RADIUS ||
        trailAlpha < GRID_MIN_VISIBLE_ALPHA
      ) {
        continue;
      }

      drawWhiteGlowCircle(
        ctx,
        x,
        y,
        glowRadius,
        trailAlpha,
        WAVE_TRAIL_WHITE_TONE,
        ALERTS_WAVE_GLOW_OUTER_SCALE,
        WAVE_TRAIL_PEAK_OPACITY_BOOST,
      );
    }
  }

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

    const composition = alertsCompositionFalloff(
      x,
      y,
      centerX,
      centerY,
      width,
      height,
    );
    if (composition < 0.01) continue;

    const iconDiameter = peakIconDiameter;
    iconAlpha *= composition;

    drawCommandCenterAlertDot(
      ctx,
      x,
      y,
      iconDiameter,
      iconAlpha,
      state.color,
    );
  }
}

export function PortfolioFeatureCanvas() {
  useEffect(() => {
    loadCommandCenterAlertDotImage();
  }, []);

  const highlightLatchRef = useRef(new Map<string, HighlightLatch>());
  const iconRevealReadyRef = useRef(new Set<string>());
  const alertIconStatesRef = useRef(new Map<string, AlertIconState>());
  const waveHighlightPlanRef = useRef<WaveHighlightPlan>({
    picks: new Set(),
    colors: new Map(),
  });
  const globalWaveCycleRef = useRef(-1);
  const pickVisitStartRef = useRef<number | null>(null);
  const layoutKeyRef = useRef("");

  const { containerRef, canvasRef } = useCommandCenterCanvasLoop(
    ({ ctx, width, height, timeS }) => {
      const layoutKey = `${width}x${height}`;
      if (layoutKeyRef.current !== layoutKey) {
        layoutKeyRef.current = layoutKey;
        highlightLatchRef.current = new Map();
        iconRevealReadyRef.current = new Set();
        alertIconStatesRef.current = new Map();
        waveHighlightPlanRef.current = { picks: new Set(), colors: new Map() };
        globalWaveCycleRef.current = -1;
        pickVisitStartRef.current = null;
      }

      const hub = getHubPosition(width, height);
      const { offsetX, offsetY, rows, cols } = getGridDimensions(width, height);
      const waveCycle = globalSweepCycle(timeS, rows);
      if (globalWaveCycleRef.current !== waveCycle) {
        globalWaveCycleRef.current = waveCycle;
        highlightLatchRef.current.clear();
        iconRevealReadyRef.current.clear();
        pickVisitStartRef.current = null;
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

      const waveFront = waveFrontRow(timeS, rows);
      recordPickVisitStart(
        pickVisitStartRef,
        waveHighlightPlanRef.current,
        waveFront,
        rows,
        cols,
        timeS,
      );

      updateHighlightLatch(
        highlightLatchRef.current,
        waveHighlightPlanRef.current,
        cols,
        pickVisitStartRef.current,
        timeS,
      );
      updateIconRevealReady(
        iconRevealReadyRef.current,
        waveHighlightPlanRef.current,
        pickVisitStartRef.current,
        timeS,
      );
      const iconColors = new Map<string, HighlightColor>();
      for (const key of iconRevealReadyRef.current) {
        const color = waveHighlightPlanRef.current.colors.get(key);
        if (color) iconColors.set(key, color);
      }
      syncAlertIconStates(
        alertIconStatesRef.current,
        iconRevealReadyRef.current,
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
