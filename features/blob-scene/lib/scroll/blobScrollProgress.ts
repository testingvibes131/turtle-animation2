const HANDOFF_EPS_PX = 1;

export function computeBlobScrollProgress(
  scrolled: number,
  heroScroll: number,
  section2: HTMLElement | null,
  isMobile: boolean,
): number {
  const heroT = Math.min(1, Math.max(0, scrolled / Math.max(heroScroll, 1)));

  if (!isMobile || !section2) {
    return heroT;
  }

  // Mobile section 2 (sticky copy + carousel): use final layout as soon as hero ends.
  // The old visual-runway remap kept progress at 0 here, so offset/scale never applied.
  if (scrolled >= heroScroll - HANDOFF_EPS_PX) {
    return 1;
  }

  return heroT;
}
