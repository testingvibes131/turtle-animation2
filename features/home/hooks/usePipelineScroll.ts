"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

const MANUAL_LOCK_MS = 500;

function indexFromHorizontalScroll(scroller: HTMLElement) {
  const cards = scroller.querySelectorAll<HTMLElement>("[data-pipeline-card]");
  if (!cards.length) return 0;

  const rootRect = scroller.getBoundingClientRect();
  const rootCenter = rootRect.left + rootRect.width / 2;

  let bestIdx = 0;
  let bestDist = Infinity;

  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const dist = Math.abs(center - rootCenter);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = index;
    }
  });

  return bestIdx;
}

export function usePipelineScroll(
  cardCount: number,
  cardsRef?: RefObject<HTMLElement | null>,
) {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const manualClickAt = useRef(0);
  const ticking = useRef(false);

  const activate = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(cardCount - 1, idx));
    setSelectedIndex((current) => (current === clamped ? current : clamped));
  }, [cardCount]);

  const progressToIndex = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return 0;

    const vh = window.innerHeight;
    const sectionH = section.offsetHeight;
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const start = sectionTop;
    const end = sectionTop + sectionH - vh;
    const range = Math.max(1, end - start);
    const raw = (window.scrollY - start) / range;
    const clamped = Math.max(0, Math.min(0.9999, raw));
    return Math.floor(clamped * cardCount);
  }, [cardCount]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    const onWindowScroll = () => {
      if (!desktopQuery.matches) return;
      if (Date.now() - manualClickAt.current < 2500) return;
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        activate(progressToIndex());
        ticking.current = false;
      });
    };

    onWindowScroll();
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    desktopQuery.addEventListener("change", onWindowScroll);
    return () => {
      window.removeEventListener("scroll", onWindowScroll);
      desktopQuery.removeEventListener("change", onWindowScroll);
    };
  }, [activate, progressToIndex]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const scroller = cardsRef?.current;
    if (!scroller) return;

    const syncFromCarousel = () => {
      if (desktopQuery.matches) return;
      if (Date.now() - manualClickAt.current < MANUAL_LOCK_MS) return;
      activate(indexFromHorizontalScroll(scroller));
    };

    const onScroll = () => {
      requestAnimationFrame(syncFromCarousel);
    };

    syncFromCarousel();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    desktopQuery.addEventListener("change", syncFromCarousel);

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      desktopQuery.removeEventListener("change", syncFromCarousel);
    };
  }, [activate, cardsRef]);

  const selectCard = useCallback(
    (idx: number) => {
      manualClickAt.current = Date.now();
      activate(idx);

      const scroller = cardsRef?.current;
      if (!scroller || window.matchMedia("(min-width: 1024px)").matches) {
        return;
      }

      const card = scroller.querySelectorAll<HTMLElement>("[data-pipeline-card]")[idx];
      card?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    },
    [activate, cardsRef],
  );

  return { sectionRef, selectedIndex, selectCard };
}
