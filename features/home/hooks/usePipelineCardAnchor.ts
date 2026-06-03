"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

const CARD_FLEX_MS = 520;

/** Tracks horizontal center of the active pipeline card for illustration alignment. */
export function usePipelineCardAnchor(
  cardsRef: RefObject<HTMLElement | null>,
  selectedIndex: number,
) {
  const [anchorX, setAnchorX] = useState<number | null>(null);

  const measure = useCallback(() => {
    const cardsEl = cardsRef.current;
    if (!cardsEl) return;

    const main = cardsEl.closest(".pipeline-stage-main");
    const card = cardsEl.querySelectorAll<HTMLElement>("[data-pipeline-card]")[
      selectedIndex
    ];
    if (!main || !card) return;

    const mainRect = main.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    setAnchorX(cardRect.left + cardRect.width / 2 - mainRect.left);
  }, [cardsRef, selectedIndex]);

  useEffect(() => {
    const cardsEl = cardsRef.current;
    if (!cardsEl) return;

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(cardsEl);

    const cardNodes = cardsEl.querySelectorAll<HTMLElement>("[data-pipeline-card]");
    cardNodes.forEach((node) => {
      node.addEventListener("transitionend", measure);
    });

    window.addEventListener("resize", measure);

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      measure();
      if (now - start < CARD_FLEX_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
      cardNodes.forEach((node) => {
        node.removeEventListener("transitionend", measure);
      });
    };
  }, [cardsRef, measure, selectedIndex]);

  return anchorX;
}
