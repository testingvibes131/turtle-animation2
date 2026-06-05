/** Radial red light dot — same treatment as green, sober muted palette. */

const RED_DOT_RADIUS_SCALE = 1.15;
const RED_GLOW_OPACITY_BOOST = 1.1;

const GLOW_OUTER_SCALE = 1.35;
const SMALL_DOT_RADIUS_THRESHOLD = 3.8;

/** Muted reds — based on #ff4d4d, not electric pink. */
const RED_CORE = { r: 195, g: 118, b: 118 };
const RED_HOT = { r: 175, g: 92, b: 92 };
const RED_ACCENT = { r: 168, g: 78, b: 78 };
const RED_DEEP = { r: 52, g: 30, b: 30 };

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

export function drawRedGlowCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha = 1,
) {
  if (radius <= 0.01 || alpha <= 0.01) return;

  const sizedRadius = radius * RED_DOT_RADIUS_SCALE;
  const outer = glowOuterRadius(sizedRadius);
  const glowAlpha = Math.min(1, alpha * RED_GLOW_OPACITY_BOOST);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, outer);
  gradient.addColorStop(0, rgba(RED_CORE.r, RED_CORE.g, RED_CORE.b, glowAlpha));
  gradient.addColorStop(
    0.3,
    rgba(RED_HOT.r, RED_HOT.g, RED_HOT.b, glowAlpha * 0.88),
  );
  gradient.addColorStop(
    0.55,
    rgba(RED_ACCENT.r, RED_ACCENT.g, RED_ACCENT.b, glowAlpha * 0.68),
  );
  gradient.addColorStop(
    0.8,
    rgba(RED_DEEP.r, RED_DEEP.g, RED_DEEP.b, glowAlpha * 0.28),
  );
  gradient.addColorStop(1, rgba(0, 0, 0, 0));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
