"use client";

import { useEffect, type RefObject } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** Cards of leftward travel across the section's viewport transit. */
const DRIFT_CARDS = 1.95;
/** Starting inset (in cards): the early drift spends this first, carrying the
 *  first card INTO the container line as the section comes into view. */
const INSET_CARDS = 0.8;

/**
 * Scroll-linked drift for the Latest Updates row (desktop only): the cards
 * slide left as the section travels down the viewport and back right on the
 * way up.
 *
 * Safety contract (this feature's first life, built on scrollLeft writes,
 * was implicated in Safari scroll jank): the drift animates a translate3d on
 * the TRACK — a composited transform that never touches scroll state — so
 * native/manual scrolling composes with it untouched. The hook is fully
 * inert (no listeners, no rAF) unless the row is within ~1.5 viewports, and
 * all layout reads happen at most once per animation frame.
 */
export function useUpdatesScrollDrift(
  scrollerRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const track = scroller.querySelector<HTMLElement>(".updates-scroll__track");
    if (!track) return;

    const desktop = window.matchMedia(DESKTOP_QUERY);
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY);

    let teardown: (() => void) | null = null;

    const start = () => {
      if (teardown) return;

      let rafId = 0;
      let engaged = false;
      /** Page scrolled/resized since last frame — recompute the target. */
      let dirty = true;
      let step = 420;
      let translate = 0;
      let target = 0;

      const measure = () => {
        const card = scroller.querySelector(".update-card");
        step = (card?.getBoundingClientRect().width ?? 400) + 20;
      };

      const computeTarget = () => {
        const r = scroller.getBoundingClientRect();
        // 0 as the row's top meets the viewport bottom → 1 as its bottom
        // leaves the top. Starts +INSET (cards right of the line), crosses
        // the container line as the section comes into view, ends ~1.8
        // cards left of the start.
        const p = Math.min(
          1,
          Math.max(
            0,
            (window.innerHeight - r.top) / (window.innerHeight + r.height),
          ),
        );
        target = step * INSET_CARDS - p * step * DRIFT_CARDS;
      };

      const onPageScroll = () => {
        dirty = true;
      };

      const tick = () => {
        if (dirty) {
          dirty = false;
          computeTarget();
        }
        translate += (target - translate) * 0.06;
        // Right-end guard: never translate past the scroller's own remaining
        // scroll room, or manual scrolling to the end would reveal blank.
        const minTranslate = -(
          scroller.scrollWidth -
          scroller.clientWidth -
          scroller.scrollLeft
        );
        const clamped = Math.max(translate, minTranslate);
        track.style.transform = `translate3d(${clamped.toFixed(1)}px, 0, 0)`;
        rafId = requestAnimationFrame(tick);
      };

      const engage = () => {
        if (engaged) return;
        engaged = true;
        dirty = true;
        window.addEventListener("scroll", onPageScroll, { passive: true });
        rafId = requestAnimationFrame(tick);
      };

      const disengage = () => {
        if (!engaged) return;
        engaged = false;
        window.removeEventListener("scroll", onPageScroll);
        cancelAnimationFrame(rafId);
      };

      const onResize = () => {
        measure();
        dirty = true;
      };

      measure();
      // Land mid-page (reload with scroll restoration) without a sweep-in.
      computeTarget();
      translate = target;
      track.style.willChange = "transform";
      track.style.transform = `translate3d(${translate.toFixed(1)}px, 0, 0)`;

      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) engage();
          else disengage();
        },
        { rootMargin: "150% 0px" },
      );
      io.observe(scroller);
      window.addEventListener("resize", onResize);

      teardown = () => {
        disengage();
        io.disconnect();
        window.removeEventListener("resize", onResize);
        track.style.transform = "";
        track.style.willChange = "";
        teardown = null;
      };
    };

    const sync = () => {
      if (desktop.matches && !reduced.matches) start();
      else teardown?.();
    };
    sync();
    desktop.addEventListener("change", sync);
    reduced.addEventListener("change", sync);

    return () => {
      desktop.removeEventListener("change", sync);
      reduced.removeEventListener("change", sync);
      teardown?.();
    };
  }, [scrollerRef]);
}
