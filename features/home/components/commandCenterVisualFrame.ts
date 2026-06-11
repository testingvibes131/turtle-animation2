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
  "md:mx-auto md:max-h-[min(330px,38.5vh)] md:max-w-[min(100%,calc(min(330px,38.5vh)*570/499))]",
].join(" ");

/** Canvas layer — same grid cell as the aspect-ratio box. */
export const commandCenterVisualFrameCanvasClass =
  "col-start-1 row-start-1 min-h-0 w-full min-w-0";
