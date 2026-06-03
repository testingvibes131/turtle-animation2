/** Figma pipeline radar frame — 530×530 design space. */

export const PIPELINE_RADAR_DESIGN_SIZE = 530;

export const PIPELINE_RADAR_CENTER = PIPELINE_RADAR_DESIGN_SIZE / 2;

/** Active radar disc (~90% of half-frame, −20% from 238). */
export const PIPELINE_RADAR_DISC_RADIUS = 190;

/** Range rings (inner → outer), excluding disc edge — see drawRangeRings. */
export const PIPELINE_RADAR_RING_RADII = [29, 95] as const;

/** Outer rim at disc radius — white (outer) → transparent (inward). */
export const PIPELINE_RADAR_GRADIENT_RING_COLOR = "#f9f9f9";
export const PIPELINE_RADAR_GRADIENT_RING_PEAK_ALPHA = 0.25;
/** Inward fade depth (design px); larger = longer gradient into the disc. */
export const PIPELINE_RADAR_GRADIENT_RING_FADE_IN = 34;
export const PIPELINE_RADAR_GRADIENT_RING_HORIZ_ALPHA_MIN = 0.55;
export const PIPELINE_RADAR_GRADIENT_RING_HORIZ_ALPHA_MAX = 1;

export const PIPELINE_RADAR_GRID_SPACING = 24;
export const PIPELINE_RADAR_GRID_DOT_RADIUS = 1.4;
export const PIPELINE_RADAR_GRID_ALPHA = 0.14;

export const PIPELINE_RADAR_RING_STROKE = "rgba(171, 174, 170, 0.22)";
export const PIPELINE_RADAR_CROSSHAIR_STROKE = "rgba(171, 174, 170, 0.18)";
export const PIPELINE_RADAR_TICK_RGB = [171, 174, 170] as const;
export const PIPELINE_RADAR_TICK_BASE_ALPHA = 0.35;
export const PIPELINE_RADAR_TICK_COLOR = "rgba(171, 174, 170, 0.35)";
export const PIPELINE_RADAR_TICK_COUNT = 180;
export const PIPELINE_RADAR_TICK_OUTER_PAD = 24;
export const PIPELINE_RADAR_TICK_LENGTH = 12;

/** Vertical fade on tick ring (0–1 along disc height). */
export const PIPELINE_RADAR_TICK_FADE_START = 0.14;
export const PIPELINE_RADAR_TICK_FADE_END = 0.86;

/** Tick opacity at top/bottom vs left/right (before vertical fade). */
export const PIPELINE_RADAR_TICK_ALPHA_MIN = 0.05;
export const PIPELINE_RADAR_TICK_ALPHA_MAX = 0.62;
/** <1 = sharper peak on the horizontal band. */
export const PIPELINE_RADAR_TICK_HORIZ_CURVE = 0.55;

/** 90° sweep; clockwise rotation. */
export const PIPELINE_RADAR_SWEEP_ANGLE = Math.PI / 1.5;

/** Seconds per full revolution. */
export const PIPELINE_RADAR_REVOLUTION_S = 6;

/** Leading edge at t=0 — bottom-right quadrant (3→6 o'clock). */
export const PIPELINE_RADAR_SWEEP_INITIAL_LEAD = Math.PI / 1.5;

/** Sweep wedge — angular fade between the two straight edges (trail → lead). */
export const PIPELINE_RADAR_SWEEP_GREEN = { r: 115, g: 243, b: 108 };
export const PIPELINE_RADAR_SWEEP_TRAIL_ALPHA = 0.05;
export const PIPELINE_RADAR_SWEEP_LEAD_ALPHA = 0.52;
/** Soft radial depth from center (optional overlay). */
export const PIPELINE_RADAR_SWEEP_CENTER_ALPHA = 0.09;

/** Fade-in duration when the sweep reveals a blip. */
export const PIPELINE_RADAR_BLIP_RAMP_UP_S = 0.45;
export const PIPELINE_RADAR_BLIP_DECAY_S = 0.55;
/** Intensity at or above this counts as “scanned” for deal-card highlight. */
export const PIPELINE_RADAR_BLIP_SCAN_THRESHOLD = 0.22;

/** Clockwise from 3 o'clock (canvas +x). */
export type PipelineRadarBlipSpec = {
  angle: number;
  radius: number;
  coreRadius: number;
};

export const PIPELINE_RADAR_BLIPS: PipelineRadarBlipSpec[] = [
  { angle: Math.PI / 6, radius: 44, coreRadius: 2.8 },
  { angle: Math.PI / 2.4, radius: 134, coreRadius: 4.4 },
  { angle: Math.PI / 1.15, radius: 74, coreRadius: 3.2 },
  { angle: Math.PI * 1.12, radius: 158, coreRadius: 4 },
  { angle: Math.PI * 1.42, radius: 51, coreRadius: 3.2 },
  { angle: Math.PI * 1.78, radius: 106, coreRadius: 3.6 },
];
