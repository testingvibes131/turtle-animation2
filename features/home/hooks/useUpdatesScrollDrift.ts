"use client";

import { useEffect, type RefObject } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** Cards of horizontal travel across the section's full viewport transit.
 *  The page ends just past the section, so the reachable travel is ~95% of
 *  this — tuned to land at ≈1.8 cards at the bottom of the page. */
const DRIFT_CARDS = 1.95;
/** Extra starting inset (in cards), applied via --updates-drift-inset on the
 *  track. The early drift spends this first, carrying the first card INTO
 *  the container-edge line as the section comes into view — without it the
 *  first card is already sliding off-screen before you ever see it. */
const INSET_CARDS = 0.8;
/** How long a manual scroll owns the row before the drift re-engages. */
const USER_PAUSE_MS = 300;

/**
 * Scroll-linked drift for the Latest Updates row (desktop only): the cards
 * slide left as the section travels down the viewport and back right on the
 * way up. Manual scrolling always wins — the drift is applied on top of a
 * user-owned base (scrollLeft = userBase + drift), and any user scroll
 * rebases that offset, so the row never snaps back or fights the user.
 *
 * Perf contract (Safari janks where Chrome shrugs): the hook is fully inert
 * — no scroll listener, no rAF — unless the row is within ~1.5 viewports
 * (IntersectionObserver-gated), scroll handlers only set a flag, and all
 * layout reads happen at most once per animation frame.
 */
export function useUpdatesScrollDrift(
  scrollerRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const desktop = window.matchMedia(DESKTOP_QUERY);
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY);

    let teardown: (() => void) | null = null;

    const start = () => {
      if (teardown) return;

      let userBase = 0;
      let drift = 0;
      let target = 0;
      let step = 420;
      /** scrollLeft as of our last write — distinguishes our scroll events. */
      let expected = -1;
      let userPauseUntil = 0;
      let rafId = 0;
      let engaged = false;
      /** Page scrolled/resized since the last frame — recompute the target. */
      let dirty = true;

      const measure = () => {
        const card = scroller.querySelector(".update-card");
        step = (card?.getBoundingClientRect().width ?? 400) + 20;
        scroller.style.setProperty(
          "--updates-drift-inset",
          `${Math.round(step * INSET_CARDS)}px`,
        );
      };

      const computeTarget = () => {
        const r = scroller.getBoundingClientRect();
        // 0 as the row's top meets the viewport bottom → 1 as its bottom
        // leaves the top; the page ends just past the section, so the
        // reachable range lands around 1.8 cards of travel.
        const p = Math.min(
          1,
          Math.max(
            0,
            (window.innerHeight - r.top) / (window.innerHeight + r.height),
          ),
        );
        target = p * step * DRIFT_CARDS;
      };

      const onPageScroll = () => {
        dirty = true;
      };

      const onRowScroll = () => {
        if (Math.abs(scroller.scrollLeft - expected) < 1) return;
        userPauseUntil = performance.now() + USER_PAUSE_MS;
      };

      const tick = () => {
        if (dirty) {
          dirty = false;
          computeTarget();
        }
        drift += (target - drift) * 0.06;
        if (performance.now() < userPauseUntil) {
          // The user owns the row right now: track their position so the
          // drift resumes from wherever they stop, with no jump.
          userBase = scroller.scrollLeft - drift;
        } else {
          const max = scroller.scrollWidth - scroller.clientWidth;
          const desired = Math.round(
            Math.min(max, Math.max(0, userBase + drift)),
          );
          if (Math.abs(scroller.scrollLeft - desired) > 0.5) {
            scroller.scrollLeft = desired;
            expected = scroller.scrollLeft;
          }
        }
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
      drift = target;
      userBase = scroller.scrollLeft - drift;

      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) engage();
          else disengage();
        },
        { rootMargin: "150% 0px" },
      );
      io.observe(scroller);

      window.addEventListener("resize", onResize);
      scroller.addEventListener("scroll", onRowScroll, { passive: true });

      teardown = () => {
        disengage();
        io.disconnect();
        scroller.style.removeProperty("--updates-drift-inset");
        window.removeEventListener("resize", onResize);
        scroller.removeEventListener("scroll", onRowScroll);
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
