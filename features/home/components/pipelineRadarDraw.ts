import { drawGreenGlowCircle } from "@/features/home/components/commandCenterGreenGlow";
import {
  clamp01,
  smoothstep,
} from "@/features/home/components/commandCenterGridMath";
import {
  PIPELINE_RADAR_BLIPS,
  PIPELINE_RADAR_BLIP_DECAY_S,
  PIPELINE_RADAR_BLIP_RAMP_UP_S,
  PIPELINE_RADAR_CROSSHAIR_STROKE,
  PIPELINE_RADAR_DESIGN_SIZE,
  PIPELINE_RADAR_DISC_RADIUS,
  PIPELINE_RADAR_GRID_ALPHA,
  PIPELINE_RADAR_GRID_DOT_RADIUS,
  PIPELINE_RADAR_GRID_SPACING,
  PIPELINE_RADAR_GRADIENT_RING_COLOR,
  PIPELINE_RADAR_GRADIENT_RING_FADE_IN,
  PIPELINE_RADAR_GRADIENT_RING_HORIZ_ALPHA_MAX,
  PIPELINE_RADAR_GRADIENT_RING_HORIZ_ALPHA_MIN,
  PIPELINE_RADAR_GRADIENT_RING_PEAK_ALPHA,
  PIPELINE_RADAR_REVOLUTION_S,
  PIPELINE_RADAR_RING_RADII,
  PIPELINE_RADAR_RING_STROKE,
  PIPELINE_RADAR_SWEEP_ANGLE,
  PIPELINE_RADAR_SWEEP_CENTER_ALPHA,
  PIPELINE_RADAR_SWEEP_GREEN,
  PIPELINE_RADAR_SWEEP_INITIAL_LEAD,
  PIPELINE_RADAR_SWEEP_LEAD_ALPHA,
  PIPELINE_RADAR_SWEEP_TRAIL_ALPHA,
  PIPELINE_RADAR_TICK_COUNT,
  PIPELINE_RADAR_TICK_RGB,
  PIPELINE_RADAR_TICK_FADE_END,
  PIPELINE_RADAR_TICK_FADE_START,
  PIPELINE_RADAR_TICK_ALPHA_MAX,
  PIPELINE_RADAR_TICK_ALPHA_MIN,
  PIPELINE_RADAR_TICK_HORIZ_CURVE,
  PIPELINE_RADAR_TICK_LENGTH,
  PIPELINE_RADAR_TICK_OUTER_PAD,
  type PipelineRadarBlipSpec,
} from "@/features/home/data/pipelineRadarLayout";

const TAU = Math.PI * 2;

function normalizeAngle(angle: number) {
  return ((angle % TAU) + TAU) % TAU;
}

function isAngleInSweep(target: number, trail: number, lead: number) {
  const t = normalizeAngle(target);
  const a = normalizeAngle(trail);
  const b = normalizeAngle(lead);
  if (a <= b) return t >= a && t <= b;
  return t >= a || t <= b;
}

export function pipelineRadarScale(width: number, height: number) {
  const size = Math.min(width, height);
  return size / PIPELINE_RADAR_DESIGN_SIZE;
}

export function pipelineRadarCenter(width: number, height: number) {
  return { cx: width / 2, cy: height / 2 };
}

export function pipelineRadarLeadingAngle(timeS: number, reducedMotion: boolean) {
  if (reducedMotion) return PIPELINE_RADAR_SWEEP_INITIAL_LEAD;
  const spin =
    (timeS / PIPELINE_RADAR_REVOLUTION_S) * TAU + PIPELINE_RADAR_SWEEP_INITIAL_LEAD;
  return normalizeAngle(spin);
}

function polarToXY(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function drawDotGrid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  discR: number,
  scale: number,
) {
  const spacing = PIPELINE_RADAR_GRID_SPACING * scale;
  const dotR = PIPELINE_RADAR_GRID_DOT_RADIUS * scale;
  const left = cx - discR;
  const right = cx + discR;
  const top = cy - discR;
  const bottom = cy + discR;
  const discR2 = discR * discR;

  ctx.save();
  ctx.fillStyle = `rgba(171, 174, 170, ${PIPELINE_RADAR_GRID_ALPHA})`;

  const colStart = Math.floor((left - cx) / spacing);
  const colEnd = Math.ceil((right - cx) / spacing);
  const rowStart = Math.floor((top - cy) / spacing);
  const rowEnd = Math.ceil((bottom - cy) / spacing);

  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      const x = cx + col * spacing;
      const y = cy + row * spacing;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > discR2) continue;
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, TAU);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawRangeRings(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  discR: number,
  scale: number,
) {
  ctx.save();
  ctx.strokeStyle = PIPELINE_RADAR_RING_STROKE;
  ctx.lineWidth = 1;

  for (const designR of PIPELINE_RADAR_RING_RADII) {
    const r = designR * scale;
    if (r >= discR) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}

function parseHexRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rimGradientRgba(
  r: number,
  g: number,
  b: number,
  alpha: number,
) {
  return `rgba(${r},${g},${b},${alpha})`;
}

function fillSmoothRadialGradientStops(
  gradient: CanvasGradient,
  r: number,
  g: number,
  b: number,
  peakA: number,
  steps: number,
) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const alpha = peakA * smoothstep(t);
    gradient.addColorStop(t, rimGradientRgba(r, g, b, alpha));
  }
}

function fillSmoothHorizMaskStops(
  gradient: CanvasGradient,
  minA: number,
  maxA: number,
  steps: number,
) {
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const distFromCenter = Math.abs(x - 0.5) * 2;
    const alpha = minA + (maxA - minA) * smoothstep(distFromCenter);
    gradient.addColorStop(x, `rgba(0,0,0,${alpha})`);
  }
}

/** Rim gradient aligned to the outer disc; bright outside → fade inward. */
function drawGradientRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  discR: number,
  scale: number,
) {
  const innerEdge = discR - PIPELINE_RADAR_GRADIENT_RING_FADE_IN * scale;
  const outerEdge = discR;
  const { r: cr, g: cg, b: cb } = parseHexRgb(
    PIPELINE_RADAR_GRADIENT_RING_COLOR,
  );
  const peakA = PIPELINE_RADAR_GRADIENT_RING_PEAK_ALPHA;

  const gradient = ctx.createRadialGradient(
    cx,
    cy,
    innerEdge,
    cx,
    cy,
    outerEdge,
  );
  fillSmoothRadialGradientStops(gradient, cr, cg, cb, peakA, 24);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerEdge, 0, TAU);
  ctx.arc(cx, cy, Math.max(0, innerEdge), 0, TAU, true);
  ctx.fillStyle = gradient;
  ctx.fill("evenodd");

  ctx.globalCompositeOperation = "destination-in";
  const horiz = ctx.createLinearGradient(cx - outerEdge, cy, cx + outerEdge, cy);
  fillSmoothHorizMaskStops(
    horiz,
    PIPELINE_RADAR_GRADIENT_RING_HORIZ_ALPHA_MIN,
    PIPELINE_RADAR_GRADIENT_RING_HORIZ_ALPHA_MAX,
    16,
  );
  ctx.fillStyle = horiz;
  ctx.fillRect(cx - outerEdge, cy - outerEdge, outerEdge * 2, outerEdge * 2);

  ctx.restore();
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  discR: number,
) {
  const arm = discR * Math.SQRT1_2;

  ctx.save();
  ctx.strokeStyle = PIPELINE_RADAR_CROSSHAIR_STROKE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - arm, cy - arm);
  ctx.lineTo(cx + arm, cy + arm);
  ctx.moveTo(cx + arm, cy - arm);
  ctx.lineTo(cx - arm, cy + arm);
  ctx.stroke();
  ctx.restore();
}

function tickHorizAlpha(angle: number) {
  const equator = Math.pow(Math.abs(Math.cos(angle)), PIPELINE_RADAR_TICK_HORIZ_CURVE);
  return (
    PIPELINE_RADAR_TICK_ALPHA_MIN +
    (PIPELINE_RADAR_TICK_ALPHA_MAX - PIPELINE_RADAR_TICK_ALPHA_MIN) * equator
  );
}

function drawTickRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  discR: number,
  scale: number,
) {
  const outer = discR + PIPELINE_RADAR_TICK_OUTER_PAD * scale;
  const inner = outer - PIPELINE_RADAR_TICK_LENGTH * scale;
  const [tr, tg, tb] = PIPELINE_RADAR_TICK_RGB;

  ctx.save();
  ctx.lineWidth = 2;

  for (let i = 0; i < PIPELINE_RADAR_TICK_COUNT; i++) {
    const angle = (i / PIPELINE_RADAR_TICK_COUNT) * TAU;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const alpha = tickHorizAlpha(angle);
    ctx.strokeStyle = `rgba(${tr}, ${tg}, ${tb}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(cx + cos * inner, cy + sin * inner);
    ctx.lineTo(cx + cos * outer, cy + sin * outer);
    ctx.stroke();
  }

  const fadeR = outer + 2 * scale;
  ctx.globalCompositeOperation = "destination-in";
  const mask = ctx.createLinearGradient(cx, cy - fadeR, cx, cy + fadeR);
  mask.addColorStop(0, "rgba(0,0,0,0)");
  mask.addColorStop(PIPELINE_RADAR_TICK_FADE_START, "rgba(0,0,0,1)");
  mask.addColorStop(PIPELINE_RADAR_TICK_FADE_END, "rgba(0,0,0,1)");
  mask.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = mask;
  ctx.fillRect(cx - fadeR, cy - fadeR, fadeR * 2, fadeR * 2);

  ctx.restore();
}

function drawDiscVignette(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  discR: number,
) {
  const gradient = ctx.createRadialGradient(
    cx,
    cy,
    discR * 0.55,
    cx,
    cy,
    discR,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.35)");

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, discR, 0, TAU);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - discR, cy - discR, discR * 2, discR * 2);
  ctx.restore();
}

function sweepGreenRgba(alpha: number) {
  const { r, g, b } = PIPELINE_RADAR_SWEEP_GREEN;
  return `rgba(${r},${g},${b},${alpha})`;
}

function fillSweepConicStops(
  gradient: CanvasGradient,
  sweepFrac: number,
  trailAlpha: number,
  leadAlpha: number,
  steps: number,
) {
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * sweepFrac;
    const alpha =
      trailAlpha + (leadAlpha - trailAlpha) * smoothstep(i / steps);
    gradient.addColorStop(t, sweepGreenRgba(alpha));
  }
}

function drawSweep(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  discR: number,
  leadingAngle: number,
) {
  const trailAngle = leadingAngle - PIPELINE_RADAR_SWEEP_ANGLE;
  const sweepFrac = PIPELINE_RADAR_SWEEP_ANGLE / TAU;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, discR, 0, TAU);
  ctx.clip();

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, discR, trailAngle, leadingAngle);
  ctx.closePath();
  ctx.clip();

  const conic = ctx.createConicGradient(trailAngle, cx, cy);
  fillSweepConicStops(
    conic,
    sweepFrac,
    PIPELINE_RADAR_SWEEP_TRAIL_ALPHA,
    PIPELINE_RADAR_SWEEP_LEAD_ALPHA,
    20,
  );
  ctx.fillStyle = conic;
  ctx.fillRect(cx - discR, cy - discR, discR * 2, discR * 2);

  const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, discR);
  radial.addColorStop(0, sweepGreenRgba(PIPELINE_RADAR_SWEEP_CENTER_ALPHA));
  radial.addColorStop(0.65, sweepGreenRgba(0));
  radial.addColorStop(1, sweepGreenRgba(0));
  ctx.fillStyle = radial;
  ctx.fillRect(cx - discR, cy - discR, discR * 2, discR * 2);

  ctx.restore();
}

function drawBlip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spec: PipelineRadarBlipSpec,
  scale: number,
  intensity: number,
) {
  const fade = smoothstep(clamp01(intensity));
  if (fade <= 0.01) return;
  const r = spec.radius * scale;
  const { x, y } = polarToXY(cx, cy, r, spec.angle);
  const coreR = spec.coreRadius * scale * (0.7 + 0.3 * fade);
  drawGreenGlowCircle(ctx, x, y, coreR, fade);
}

export type BlipIntensityState = number[];

export function createBlipIntensityState() {
  return PIPELINE_RADAR_BLIPS.map(() => 0);
}

export function updateBlipIntensities(
  intensities: BlipIntensityState,
  dt: number,
  leadingAngle: number,
) {
  const trailAngle = leadingAngle - PIPELINE_RADAR_SWEEP_ANGLE;

  for (let i = 0; i < PIPELINE_RADAR_BLIPS.length; i++) {
    const blip = PIPELINE_RADAR_BLIPS[i];
    const inSweep = isAngleInSweep(blip.angle, trailAngle, leadingAngle);
    const current = intensities[i] ?? 0;

    if (inSweep) {
      const ramp = dt / PIPELINE_RADAR_BLIP_RAMP_UP_S;
      intensities[i] = clamp01(current + ramp);
    } else {
      const decay = dt / PIPELINE_RADAR_BLIP_DECAY_S;
      intensities[i] = Math.max(0, current - decay);
    }
  }
}

export function stepPipelineRadarBlips(
  intensities: BlipIntensityState,
  dt: number,
  leadingAngle: number,
  reducedMotion: boolean,
) {
  if (reducedMotion) {
    const trailAngle = leadingAngle - PIPELINE_RADAR_SWEEP_ANGLE;
    for (let i = 0; i < PIPELINE_RADAR_BLIPS.length; i++) {
      const blip = PIPELINE_RADAR_BLIPS[i];
      intensities[i] = isAngleInSweep(blip.angle, trailAngle, leadingAngle)
        ? 1
        : 0;
    }
    return;
  }

  updateBlipIntensities(intensities, dt, leadingAngle);
}

export function drawPipelineRadar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeS: number,
  reducedMotion: boolean,
  blipIntensities: BlipIntensityState,
) {
  const scale = pipelineRadarScale(width, height);
  const { cx, cy } = pipelineRadarCenter(width, height);
  const discR = PIPELINE_RADAR_DISC_RADIUS * scale;
  const leadingAngle = pipelineRadarLeadingAngle(timeS, reducedMotion);

  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, discR, 0, TAU);
  ctx.clip();

  drawDotGrid(ctx, cx, cy, discR, scale);
  drawRangeRings(ctx, cx, cy, discR, scale);
  drawCrosshair(ctx, cx, cy, discR);
  drawSweep(ctx, cx, cy, discR, leadingAngle);
  drawDiscVignette(ctx, cx, cy, discR);

  for (let i = 0; i < PIPELINE_RADAR_BLIPS.length; i++) {
    drawBlip(ctx, cx, cy, PIPELINE_RADAR_BLIPS[i], scale, blipIntensities[i] ?? 0);
  }

  ctx.restore();

  drawGradientRing(ctx, cx, cy, discR, scale);
  drawTickRing(ctx, cx, cy, discR, scale);

  return leadingAngle;
}
