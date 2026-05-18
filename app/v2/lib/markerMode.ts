/** How opportunity markers follow the scrolling APR field. */
export type MarkerMotionMode = "fixed" | "belt" | "fixed-offsetting";

export const MARKER_MOTION_OPTIONS: {
  mode: MarkerMotionMode;
  label: string;
  description: string;
}[] = [
  {
    mode: "fixed",
    label: "Fixed crossing",
    description:
      "Spheres stay on crossings; home color; height waves from scroll.",
  },
  {
    mode: "fixed-offsetting",
    label: "Fixed offsetting",
    description:
      "Spheres stay on crossings; color + height show whose DNA is at that vertex.",
  },
  {
    mode: "belt",
    label: "Belt drift",
    description: "Spheres move on X/Z with their own opportunity data.",
  },
];

export function markersMoveWithBelt(mode: MarkerMotionMode): boolean {
  return mode === "belt";
}

/** Scrolled opportunity DNA at a fixed crossing (not mesh drift). */
export function usesScrolledDnaAtCrossing(mode: MarkerMotionMode): boolean {
  return mode === "fixed-offsetting";
}
