"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const MANUAL_LOCK_MS = 500;
const DESKTOP_QUERY = "(min-width: 1024px)";

/** True when the pipeline cards row is a horizontal scroller (mobile layout). */
function isCarouselScroller(scroller: HTMLElement) {
  return scroller.scrollWidth > scroller.clientWidth + 1;
}

/** Nearest snapped card using layout offsets (padding lives on the track, not the scroller). */
function indexFromScroller(scroller: HTMLElement) {
  const cards = scroller.querySelectorAll<HTMLElement>("[data-pipeline-card]");
  if (!cards.length) return 0;

  const style = getComputedStyle(scroller);
  const paddingStart =
    parseFloat(style.scrollPaddingInlineStart || style.scrollPaddingLeft) || 0;
  const snapTarget = scroller.scrollLeft + paddingStart;

  let bestIdx = 0;
  let bestDist = Infinity;

  cards.forEach((card, index) => {
    const dist = Math.abs(card.offsetLeft - snapTarget);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = index;
    }
  });

  return bestIdx;
}

/** Fallback using viewport snap line — works when scrollLeft reads 0 on iOS mid-gesture. */
function indexFromSnapLine(scroller: HTMLElement) {
  const cards = scroller.querySelectorAll<HTMLElement>("[data-pipeline-card]");
  if (!cards.length) return 0;

  const scrollerRect = scroller.getBoundingClientRect();
  const style = getComputedStyle(scroller);
  const paddingStart =
    parseFloat(style.scrollPaddingInlineStart || style.scrollPaddingLeft) || 0;
  const snapLine = scrollerRect.left + paddingStart;

  let bestIdx = 0;
  let bestDist = Infinity;

  cards.forEach((card, index) => {
    const dist = Math.abs(card.getBoundingClientRect().left - snapLine);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = index;
    }
  });

  return bestIdx;
}

function activeCarouselIndex(scroller: HTMLElement) {
  const fromScroll = indexFromScroller(scroller);
  const fromSnap = indexFromSnapLine(scroller);
  return scroller.scrollLeft > 2 ? fromScroll : fromSnap;
}

export function usePipelineScroll(
  cardCount: number,
  cardsEl: HTMLElement | null,
) {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const manualClickAt = useRef(0);
  const ticking = useRef(false);
  const pollTimer = useRef(0);

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
    const desktopQuery = window.matchMedia(DESKTOP_QUERY);

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

  useLayoutEffect(() => {
    const scroller = cardsEl;
    if (!scroller || !(scroller instanceof HTMLElement)) return;

    const syncFromCarousel = (force = false) => {
      if (!isCarouselScroller(scroller)) return;
      if (!force && Date.now() - manualClickAt.current < MANUAL_LOCK_MS) return;
      activate(activeCarouselIndex(scroller));
    };

    const scheduleSettleSync = () => {
      syncFromCarousel(true);
      requestAnimationFrame(() => syncFromCarousel(true));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => syncFromCarousel(true));
      });
      window.setTimeout(() => syncFromCarousel(true), 50);
      window.setTimeout(() => syncFromCarousel(true), 180);
      window.setTimeout(() => syncFromCarousel(true), 400);
    };

    const onScrollerScroll = () => {
      requestAnimationFrame(() => syncFromCarousel(true));
    };

    const startPoll = () => {
      window.clearInterval(pollTimer.current);
      pollTimer.current = window.setInterval(() => syncFromCarousel(true), 120);
    };

    const stopPoll = () => {
      window.clearInterval(pollTimer.current);
      pollTimer.current = 0;
    };

    const onTouchStart = () => {
      startPoll();
      syncFromCarousel(true);
    };

    const onTouchEnd = () => {
      scheduleSettleSync();
      window.setTimeout(stopPoll, 500);
    };

    syncFromCarousel(true);

    scroller.addEventListener("scroll", onScrollerScroll, { passive: true });
    scroller.addEventListener("scrollend", scheduleSettleSync, { passive: true });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchend", onTouchEnd, { passive: true });
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true });

    const section = sectionRef.current;
    const visibilityObserver =
      section &&
      new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            syncFromCarousel(true);
          }
        },
        { threshold: 0.15 },
      );
    if (section) visibilityObserver?.observe(section);

    const onResize = () => syncFromCarousel(true);
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      stopPoll();
      scroller.removeEventListener("scroll", onScrollerScroll);
      scroller.removeEventListener("scrollend", scheduleSettleSync);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
      visibilityObserver?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [activate, cardsEl]);

  const selectCard = useCallback(
    (idx: number) => {
      if (cardsEl && isCarouselScroller(cardsEl)) return;

      manualClickAt.current = Date.now();
      activate(idx);
    },
    [activate, cardsEl],
  );

  return { sectionRef, selectedIndex, selectCard };
}
