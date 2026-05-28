/** Radial green light dot — matches Figma Dot-Green-Big (gradient bloom, not blur filter). */

/** Slight bump applied to all green accent dots across compositions. */
const GREEN_DOT_RADIUS_SCALE = 1.15;
/** Boosts gradient stop opacity (lighter composite still caps at 1). */
const GREEN_GLOW_OPACITY_BOOST = 1.1;

/** Figma glow extends ~33% past the dot bounds. */
const GLOW_OUTER_SCALE = 1.35;
/** Below ~default grid dot — tighter halo so small dots do not smear. */
const SMALL_DOT_RADIUS_THRESHOLD = 3.8;

/** Muted greens — closer to brand #73f36c, less electric mint. */
const GREEN_CORE = { r: 132, g: 178, b: 128 };
const GREEN_HOT = { r: 108, g: 168, b: 104 };
const GREEN_ACCENT = { r: 98, g: 188, b: 96 };
const GREEN_DEEP = { r: 36, g: 68, b: 40 };

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

export function drawGreenGlowCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha = 1,
) {
  if (radius <= 0.01 || alpha <= 0.01) return;

  const sizedRadius = radius * GREEN_DOT_RADIUS_SCALE;
  const outer = glowOuterRadius(sizedRadius);
  const glowAlpha = Math.min(1, alpha * GREEN_GLOW_OPACITY_BOOST);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, outer);
  gradient.addColorStop(
    0,
    rgba(GREEN_CORE.r, GREEN_CORE.g, GREEN_CORE.b, glowAlpha),
  );
  gradient.addColorStop(
    0.3,
    rgba(GREEN_HOT.r, GREEN_HOT.g, GREEN_HOT.b, glowAlpha * 0.88),
  );
  gradient.addColorStop(
    0.55,
    rgba(GREEN_ACCENT.r, GREEN_ACCENT.g, GREEN_ACCENT.b, glowAlpha * 0.68),
  );
  gradient.addColorStop(
    0.8,
    rgba(GREEN_DEEP.r, GREEN_DEEP.g, GREEN_DEEP.b, glowAlpha * 0.28),
  );
  gradient.addColorStop(1, rgba(0, 0, 0, 0));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
