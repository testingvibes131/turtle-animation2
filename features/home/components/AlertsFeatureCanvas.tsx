/** Command Center card: Personalized Alerts (`visual: "alerts"`). */
"use client";

import { getGridDimensions } from "@/features/home/components/commandCenterCanvas";
import {
  cellOrganicUnit,
  clamp01,
  GRID_DOT_RADIUS,
  GRID_MIN_VISIBLE_ALPHA,
  GRID_MIN_VISIBLE_RADIUS,
  GRID_MUTED_ALPHA,
  GRID_SPACING,
  smoothstep,
} from "@/features/home/components/commandCenterGrid";
import { useCommandCenterCanvasLoop } from "@/features/home/hooks/useCommandCenterCanvasLoop";

/** Circular vignette from card center (fraction of min canvas side). */
const FALLOFF_OUTER_FRAC = 0.48;
const FALLOFF_INNER_FRAC = 0.28;

/** Phase speed — continuous, no sweep reset or pause. */
const WAVE_SPEED = 0.58;
/** Grid cells per full sine cycle along each axis (longer = fewer ripples). */
const ROW_WAVE_WAVELENGTH = 32;
const COL_WAVE_WAVELENGTH = 38;
/** Peak dot scale at wave crest (× base radius). */
const WAVE_SCALE_MAX = 1.65;
/** Softens crests so motion reads as a ripple, not a marching band. */
const WAVE_INTENSITY_POWER = 1.85;
/** Resting grid fill — rgba(255,255,255) at GRID_MUTED_ALPHA. */
const REST_RGB = { r: 255, g: 255, b: 255 };
/** Wave peak — full #f9f9f9. */
const PEAK_RGB = { r: 249, g: 249, b: 249 };
const WAVE_PEAK_ALPHA = 1;
/** Subtle per-line phase offset (grid units) — keeps motion organic, not striped. */
const ROW_WAVE_COL_STAGGER_MAX = 1.8;
const COL_WAVE_ROW_STAGGER_MAX = 1.8;
const ROW_WAVE_STAGGER_SALT = 29;
const COL_WAVE_STAGGER_SALT = 41;
const COL_WAVE_SPEED_MUL = 0.93;

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

function rowWaveColumnStagger(col: number) {
  return cellOrganicUnit(0, col + ROW_WAVE_STAGGER_SALT) * ROW_WAVE_COL_STAGGER_MAX;
}

function colWaveRowStagger(row: number) {
  return cellOrganicUnit(row + COL_WAVE_STAGGER_SALT, 0) * COL_WAVE_ROW_STAGGER_MAX;
}

type WaveProfile = { scale: number; intensity: number };

/** Smooth 0–1 traveling ridge along one grid axis (never resets). */
function axisWaveIntensity(
  index: number,
  stagger: number,
  timeS: number,
  speed: number,
  wavelength: number,
) {
  const phase =
    timeS * speed + (index + stagger) * ((Math.PI * 2) / wavelength);
  const sin = Math.sin(phase);
  return sin * sin;
}

function waveProfileFromIntensity(intensity: number): WaveProfile {
  const t = Math.pow(clamp01(intensity), WAVE_INTENSITY_POWER);
  return {
    intensity: t,
    scale: 1 + t * (WAVE_SCALE_MAX - 1),
  };
}

/** Row + column ripples screen-blended so crossings stay smooth. */
function cellWaveProfile(row: number, col: number, timeS: number): WaveProfile {
  const rowBump = axisWaveIntensity(
    row,
    rowWaveColumnStagger(col),
    timeS,
    WAVE_SPEED,
    ROW_WAVE_WAVELENGTH,
  );
  const colBump = axisWaveIntensity(
    col,
    colWaveRowStagger(row),
    timeS,
    WAVE_SPEED * COL_WAVE_SPEED_MUL,
    COL_WAVE_WAVELENGTH,
  );
  const blended = 1 - (1 - rowBump) * (1 - colBump);
  return waveProfileFromIntensity(blended);
}

function waveDotColor(intensity: number) {
  const t = clamp01(intensity);
  const r = Math.round(REST_RGB.r + (PEAK_RGB.r - REST_RGB.r) * t);
  const g = Math.round(REST_RGB.g + (PEAK_RGB.g - REST_RGB.g) * t);
  const b = Math.round(REST_RGB.b + (PEAK_RGB.b - REST_RGB.b) * t);
  const alpha = GRID_MUTED_ALPHA + (WAVE_PEAK_ALPHA - GRID_MUTED_ALPHA) * t;
  return { r, g, b, alpha };
}

function drawAlertsGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeS: number,
) {
  const { offsetX, offsetY, rows, cols } = getGridDimensions(width, height);
  const centerX = width / 2;
  const centerY = height / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
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

      const { scale, intensity } = cellWaveProfile(row, col, timeS);
      const { r, g, b, alpha: waveAlpha } = waveDotColor(intensity);
      const radius = GRID_DOT_RADIUS * scale * vignette;
      const alpha = waveAlpha * vignette;

      if (radius < GRID_MIN_VISIBLE_RADIUS || alpha < GRID_MIN_VISIBLE_ALPHA) {
        continue;
      }

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function AlertsFeatureCanvas() {
  const { containerRef, canvasRef } = useCommandCenterCanvasLoop(
    ({ ctx, width, height, timeS }) => {
      ctx.clearRect(0, 0, width, height);
      drawAlertsGrid(ctx, width, height, timeS);
    },
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
