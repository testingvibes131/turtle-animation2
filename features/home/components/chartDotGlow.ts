/** Case-study lit dots — Command Center vivid radial glow. */

import { drawGreenGlowCircle } from "@/features/home/components/commandCenterGreenGlow";

type Rgb = { r: number; g: number; b: number };
type GlowPalette = [Rgb, Rgb, Rgb, Rgb];

const DOT_RADIUS_SCALE = 1.08;
const GLOW_OPACITY_BOOST = 1.16;
const GLOW_OUTER_SCALE = 1.35;
const SMALL_DOT_RADIUS_THRESHOLD = 3.8;

const CHART_BAR_PALETTES: Record<string, GlowPalette> = {
  "#f59e0b": [
    { r: 255, g: 214, b: 138 },
    { r: 245, g: 158, b: 11 },
    { r: 210, g: 118, b: 12 },
    { r: 58, g: 36, b: 8 },
  ],
  "#ef4444": [
    { r: 255, g: 188, b: 188 },
    { r: 239, g: 68, b: 68 },
    { r: 200, g: 52, b: 52 },
    { r: 58, g: 22, b: 22 },
  ],
  "#1d4ed8": [
    { r: 148, g: 188, b: 255 },
    { r: 29, g: 78, b: 216 },
    { r: 36, g: 98, b: 190 },
    { r: 14, g: 28, b: 58 },
  ],
};

function glowOuterRadius(radius: number) {
  const scale =
    radius < SMALL_DOT_RADIUS_THRESHOLD
      ? 1.22
      : radius > 12
        ? 1.38
        : GLOW_OUTER_SCALE;
  return radius * scale;
}

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a})`;
}

function drawVividPaletteGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  palette: GlowPalette,
) {
  if (radius <= 0.01 || alpha <= 0.01) return;

  const [core, hot, accent, deep] = palette;
  const sizedRadius = radius * DOT_RADIUS_SCALE;
  const outer = glowOuterRadius(sizedRadius);
  const glowAlpha = Math.min(1, alpha * GLOW_OPACITY_BOOST);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, outer);
  gradient.addColorStop(0, rgba(core.r, core.g, core.b, glowAlpha));
  gradient.addColorStop(0.3, rgba(hot.r, hot.g, hot.b, glowAlpha * 0.9));
  gradient.addColorStop(
    0.55,
    rgba(accent.r, accent.g, accent.b, glowAlpha * 0.72),
  );
  gradient.addColorStop(
    0.8,
    rgba(deep.r, deep.g, deep.b, glowAlpha * 0.32),
  );
  gradient.addColorStop(1, rgba(0, 0, 0, 0));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawChartGreenGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha = 1,
) {
  drawGreenGlowCircle(ctx, x, y, radius, alpha, "vivid");
}

export function drawChartBarGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  color: string,
) {
  const palette = CHART_BAR_PALETTES[color.toLowerCase()];
  if (!palette) return;

  drawVividPaletteGlow(ctx, x, y, radius, alpha, palette);
}
