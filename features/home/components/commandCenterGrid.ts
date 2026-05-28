/** Shared dot grid styling for Command Center feature canvases. */

export const GRID_DOT_DIAMETER = 7;
export const GRID_DOT_RADIUS = GRID_DOT_DIAMETER / 2;
export const GRID_SPACING = 24;
export const GRID_MUTED_ALPHA = 0.05;

export const GRID_MAIN_DOT_SCALE = 3;
export const GRID_MAIN_DOT_RADIUS = GRID_DOT_RADIUS * GRID_MAIN_DOT_SCALE;
export const GRID_CONNECTOR_DOT_SCALE = 1.5;
export const GRID_CONNECTOR_DOT_RADIUS =
  GRID_DOT_RADIUS * GRID_CONNECTOR_DOT_SCALE;
export const GRID_ACCENT_COLOR = "#73f36c";

export const GRID_MODIFIER_ZONE_GRID_RADIUS = 4.5;
export const GRID_MODIFIER_ZONE_PIXEL_RADIUS =
  GRID_MODIFIER_ZONE_GRID_RADIUS * GRID_SPACING;
export const GRID_MODIFIER_FALLOFF_GRID = 4;
export const GRID_MODIFIER_FALLOFF_PIXEL =
  GRID_MODIFIER_FALLOFF_GRID * GRID_SPACING;
export const GRID_FALLOFF_MAX_DISTANCE =
  GRID_MODIFIER_ZONE_PIXEL_RADIUS + GRID_MODIFIER_FALLOFF_PIXEL;
export const GRID_OUTSIDE_MIN_SCALE = 0.35;
export const GRID_MIN_VISIBLE_RADIUS = 0.15;
export const GRID_MIN_VISIBLE_ALPHA = 0.002;

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function distanceFromHub(
  dotX: number,
  dotY: number,
  hubX: number,
  hubY: number,
) {
  return Math.hypot(dotX - hubX, dotY - hubY);
}

export function isInsideModifierZone(
  dotX: number,
  dotY: number,
  hubX: number,
  hubY: number,
  zoneRadius = GRID_MODIFIER_ZONE_PIXEL_RADIUS,
) {
  return distanceFromHub(dotX, dotY, hubX, hubY) <= zoneRadius;
}

/** True when a grid point is still inside the hub falloff band (not past the edge fade). */
export function isInsideGridFalloff(
  dotX: number,
  dotY: number,
  hubX: number,
  hubY: number,
) {
  const dist = distanceFromHub(dotX, dotY, hubX, hubY);
  const outside = dist - GRID_MODIFIER_ZONE_PIXEL_RADIUS;
  return outside < GRID_MODIFIER_FALLOFF_PIXEL;
}

export function gridDotAppearance(
  dotX: number,
  dotY: number,
  hubX: number,
  hubY: number,
  zoneRadius = GRID_MODIFIER_ZONE_PIXEL_RADIUS,
) {
  const dist = distanceFromHub(dotX, dotY, hubX, hubY);
  if (isInsideModifierZone(dotX, dotY, hubX, hubY, zoneRadius)) {
    return { radius: GRID_DOT_RADIUS, alpha: GRID_MUTED_ALPHA };
  }

  const outside = dist - zoneRadius;
  if (outside >= GRID_MODIFIER_FALLOFF_PIXEL) {
    return {
      radius: GRID_DOT_RADIUS * GRID_OUTSIDE_MIN_SCALE,
      alpha: GRID_MUTED_ALPHA * GRID_OUTSIDE_MIN_SCALE,
    };
  }

  const t = smoothstep(outside / GRID_MODIFIER_FALLOFF_PIXEL);
  const scale = 1 - t * (1 - GRID_OUTSIDE_MIN_SCALE);
  return {
    radius: GRID_DOT_RADIUS * scale,
    alpha: GRID_MUTED_ALPHA * scale,
  };
}

export function drawFalloffDotGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hubX: number,
  hubY: number,
  shouldSkipDot?: (x: number, y: number, row: number, col: number) => boolean,
) {
  const offsetX = (width % GRID_SPACING) / 2;
  const offsetY = (height % GRID_SPACING) / 2;
  const cols = Math.ceil((width - offsetX) / GRID_SPACING) + 1;
  const rows = Math.ceil((height - offsetY) / GRID_SPACING) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * GRID_SPACING;
      const y = offsetY + row * GRID_SPACING;
      if (shouldSkipDot?.(x, y, row, col)) continue;

      const { radius, alpha } = gridDotAppearance(x, y, hubX, hubY);
      if (radius < GRID_MIN_VISIBLE_RADIUS || alpha < GRID_MIN_VISIBLE_ALPHA) {
        continue;
      }

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
