/** Figma case-study card content frames — width scales, aspect stays fixed. */

export const caseStudyTvlCardContentClass = [
  "grid w-full max-w-full items-stretch aspect-[846/400]",
].join(" ");

/** Figma 415×400; mobile +20% height → 415×480. */
export const caseStudyVerticalCardContentClass = [
  "grid w-full max-w-full items-stretch aspect-[415/480] lg:aspect-[415/400]",
].join(" ");

/** Outer stack for TVL + bottom row — full width on mobile, fixed width on lg (not content-sized). */
export const caseStudyCardsStackClass = [
  "case-cards flex w-full shrink-0 flex-col",
  "max-w-full lg:w-[clamp(400px,52vw,760px)] lg:max-w-[clamp(400px,52vw,760px)]",
].join(" ");
