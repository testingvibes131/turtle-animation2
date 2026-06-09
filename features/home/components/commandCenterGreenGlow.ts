/** Radial green light dot — matches Figma Dot-Green-Big (gradient bloom, not blur filter). */

/** Slight bump applied to all green accent dots across compositions. */
const GREEN_DOT_RADIUS_SCALE = 1.15;
/** Boosts gradient stop opacity (lighter composite still caps at 1). */
const GREEN_GLOW_OPACITY_BOOST = 1.1;

/** Figma glow extends ~33% past the dot bounds. */
const GLOW_OUTER_SCALE = 1.35;
/** Below ~default grid dot — tighter halo so small dots do not smear. */
const SMALL_DOT_RADIUS_THRESHOLD = 3.8;

export type GreenGlowTone = "muted" | "vivid";

type GreenStop = { r: number; g: number; b: number };

/** Default — soft greens for alerts cascade / radar. */
const GREEN_MUTED: GreenStop[] = [
  { r: 132, g: 178, b: 128 },
  { r: 108, g: 168, b: 104 },
  { r: 98, g: 188, b: 96 },
  { r: 36, g: 68, b: 40 },
];

/** Deals diamond + portfolio connectors — brand #73f36c. */
const GREEN_VIVID: GreenStop[] = [
  { r: 168, g: 238, b: 158 },
  { r: 115, g: 243, b: 108 },
  { r: 72, g: 210, b: 88 },
  { r: 28, g: 95, b: 42 },
];

const GREEN_TONE_OPACITY_BOOST: Record<GreenGlowTone, number> = {
  muted: GREEN_GLOW_OPACITY_BOOST,
  vivid: 1.16,
};

const GREEN_TONE_HALO_SCALE: Record<GreenGlowTone, number> = {
  muted: 1,
  vivid: 1,
};

const GREEN_TONE_RADIUS_SCALE: Record<GreenGlowTone, number> = {
  muted: GREEN_DOT_RADIUS_SCALE,
  vivid: 1.08,
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

export function drawGreenGlowCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha = 1,
  tone: GreenGlowTone = "muted",
) {
  if (radius <= 0.01 || alpha <= 0.01) return;

  const [core, hot, accent, deep] =
    tone === "vivid" ? GREEN_VIVID : GREEN_MUTED;
  const sizedRadius = radius * GREEN_TONE_RADIUS_SCALE[tone];
  const outer = glowOuterRadius(sizedRadius) * GREEN_TONE_HALO_SCALE[tone];
  const glowAlpha = Math.min(1, alpha * GREEN_TONE_OPACITY_BOOST[tone]);
  const midFalloff = tone === "vivid" ? 0.9 : 0.88;
  const outerFalloff = tone === "vivid" ? 0.72 : 0.68;
  const deepFalloff = tone === "vivid" ? 0.32 : 0.28;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, outer);
  gradient.addColorStop(0, rgba(core.r, core.g, core.b, glowAlpha));
  gradient.addColorStop(0.3, rgba(hot.r, hot.g, hot.b, glowAlpha * midFalloff));
  gradient.addColorStop(
    0.55,
    rgba(accent.r, accent.g, accent.b, glowAlpha * outerFalloff),
  );
  gradient.addColorStop(
    0.8,
    rgba(deep.r, deep.g, deep.b, glowAlpha * deepFalloff),
  );
  gradient.addColorStop(1, rgba(0, 0, 0, 0));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, outer, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
