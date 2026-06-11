/** Outer shell — background is painted by the canvas only. */
export const commandCenterVisualFrameClass = [
  "relative w-full shrink-0",
  "rounded-[clamp(9px,0.77vw,12px)]",
].join(" ");

/**
 * Grid + aspect-ratio sizing — canvas sits in-flow (no absolute) so iOS
 * composites the bitmap reliably.
 */
export const commandCenterVisualFrameInnerClass = [
  "relative grid w-full grid-cols-1 grid-rows-1",
  "aspect-[570/499]",
  // No height cap here: the canvas must scale 1:1 with the fixed-aspect card
  // shell so the waist stays one margin below it (short-viewport protection
  // is the svh term in the card width cap instead).
].join(" ");

/** Canvas layer — same grid cell as the aspect-ratio box. */
export const commandCenterVisualFrameCanvasClass =
  "col-start-1 row-start-1 min-h-0 w-full min-w-0";
