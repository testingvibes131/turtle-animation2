/** Radial white light dot — same treatment as green/red, soft off-white palette. */

const WHITE_DOT_RADIUS_SCALE = 1.15;
const WHITE_GLOW_OPACITY_BOOST = 1.1;

const GLOW_OUTER_SCALE = 1.35;
const SMALL_DOT_RADIUS_THRESHOLD = 3.8;

/** Muted whites — based on #f9f9f9. Stays off-white in both themes: on light it
 *  reads as a faint glow (invisible halo), never a dark/black ring. */
const WHITE_CORE = { r: 248, g: 248, b: 246 };
const WHITE_HOT = { r: 235, g: 235, b: 233 };
const WHITE_ACCENT = { r: 220, g: 220, b: 218 };
const WHITE_DEEP = { r: 72, g: 72, b: 70 };

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

type WhiteGlowTone = { r: number; g: number; b: number };

export function drawWhiteGlowCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha = 1,
  tone?: WhiteGlowTone,
  outerScale = 1,
  opacityBoost = WHITE_GLOW_OPACITY_BOOST,
) {
  if (radius <= 0.01 || alpha <= 0.01) return;

  const sizedRadius = radius * WHITE_DOT_RADIUS_SCALE;
  const outer = glowOuterRadius(sizedRadius) * outerScale;
  const glowAlpha = Math.min(1, alpha * opacityBoost);
  const core = tone ?? WHITE_CORE;
  const hot = tone ? { r: core.r, g: core.g, b: core.b } : WHITE_HOT;
  const accent = tone ? { r: core.r, g: core.g, b: core.b } : WHITE_ACCENT;
  const deep = tone ? { r: core.r, g: core.g, b: core.b } : WHITE_DEEP;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, outer);
  gradient.addColorStop(0, rgba(core.r, core.g, core.b, glowAlpha));
  gradient.addColorStop(0.3, rgba(hot.r, hot.g, hot.b, glowAlpha * 0.88));
  gradient.addColorStop(
    0.55,
    rgba(accent.r, accent.g, accent.b, glowAlpha * 0.68),
  );
  gradient.addColorStop(0.8, rgba(deep.r, deep.g, deep.b, glowAlpha * 0.28));
  gradient.addColorStop(1, rgba(0, 0, 0, 0));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
