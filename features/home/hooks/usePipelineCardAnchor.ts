"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

const CARD_FLEX_MS = 520;
const DESKTOP_QUERY = "(min-width: 1024px)";

function visibleVisual(main: HTMLElement) {
  const visuals = main.querySelectorAll<HTMLElement>(".pipeline-visual");
  return [...visuals].find((node) => getComputedStyle(node).display !== "none");
}

/** Tracks horizontal center of the active card; clamps so edge brackets stay in frame. */
export function usePipelineCardAnchor(
  cardsRef: RefObject<HTMLElement | null>,
  selectedIndex: number,
) {
  const [anchorX, setAnchorX] = useState<number | null>(null);

  const measure = useCallback(() => {
    const cardsEl = cardsRef.current;
    if (!cardsEl) return;

    const main = cardsEl.closest<HTMLElement>(".pipeline-stage-main");
    const card = cardsEl.querySelectorAll<HTMLElement>("[data-pipeline-card]")[
      selectedIndex
    ];
    if (!main || !card) return;

    const mainRect = main.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2 - mainRect.left;

    // Always centre the visual on the selected card — no clamping. Edge
    // cards may push it slightly past the viewport (its width is capped at
    // 100vw - 48px), which reads better than the monitor detaching from the
    // card it illustrates.
    setAnchorX(cardCenterX);
  }, [cardsRef, selectedIndex]);

  useEffect(() => {
    const cardsEl = cardsRef.current;
    if (!cardsEl) return;

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(cardsEl);
    const main = cardsEl.closest<HTMLElement>(".pipeline-stage-main");
    const visual = main ? visibleVisual(main) : null;
    if (visual) ro.observe(visual);

    const cardNodes = cardsEl.querySelectorAll<HTMLElement>("[data-pipeline-card]");
    cardNodes.forEach((node) => {
      node.addEventListener("transitionend", measure);
    });

    const desktopQuery = window.matchMedia(DESKTOP_QUERY);
    const onScroll = () => {
      if (desktopQuery.matches) measure();
    };

    cardsEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    let raf = 0;
    if (desktopQuery.matches) {
      const start = performance.now();
      const tick = (now: number) => {
        measure();
        if (now - start < CARD_FLEX_MS) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      ro.disconnect();
      cardsEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
      cardNodes.forEach((node) => {
        node.removeEventListener("transitionend", measure);
      });
    };
  }, [cardsRef, measure, selectedIndex]);

  return anchorX;
}
