export function computeBlobScrollProgress(
  scrolled: number,
  heroScroll: number,
  section2: HTMLElement | null,
  isMobile: boolean,
): number {
  if (!isMobile || !section2) {
    return Math.min(1, Math.max(0, scrolled / Math.max(heroScroll, 1)));
  }

  const textBlock = section2.querySelector<HTMLElement>("[data-blob-mobile-text]");
  const visualBlock = section2.querySelector<HTMLElement>(
    "[data-blob-mobile-visual]",
  );
  const textHeight = textBlock?.offsetHeight ?? 0;
  const visualHeight = visualBlock?.offsetHeight ?? window.innerHeight;
  const visualStart = heroScroll + textHeight;

  if (scrolled <= visualStart) {
    return 0;
  }

  return Math.min(1, (scrolled - visualStart) / Math.max(visualHeight, 1));
}
