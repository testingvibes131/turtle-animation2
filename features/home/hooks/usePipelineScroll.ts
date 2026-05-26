"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function usePipelineScroll(cardCount: number) {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const manualClickAt = useRef(0);
  const ticking = useRef(false);

  const activate = useCallback(
    (idx: number) => {
      setSelectedIndex((current) => (current === idx ? current : idx));
    },
    [],
  );

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
    const onScroll = () => {
      if (Date.now() - manualClickAt.current < 2500) return;
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        activate(progressToIndex());
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activate, progressToIndex]);

  const selectCard = (idx: number) => {
    manualClickAt.current = Date.now();
    activate(idx);
  };

  return { sectionRef, selectedIndex, selectCard };
}
