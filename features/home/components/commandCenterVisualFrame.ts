/** Figma feature art frame (Card-Deals visual). */
export const COMMAND_CENTER_VISUAL_ASPECT = 570 / 499;

/**
 * Keeps the visual frame aspect on all breakpoints; on md+ caps height for the
 * viewport-fitted section so width shrinks with the ratio instead of squashing.
 */
export const commandCenterVisualFrameClass = [
  "relative isolate w-full shrink-0 overflow-hidden rounded-[clamp(9px,0.77vw,12px)]",
  "aspect-[570/499]",
  "max-md:max-h-none max-md:max-w-full",
  "md:mx-auto md:max-h-[min(330px,38.5vh)] md:max-w-[min(100%,calc(min(330px,38.5vh)*570/499))]",
].join(" ");
