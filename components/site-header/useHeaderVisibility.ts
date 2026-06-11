"use client";

import { useEffect } from "react";

export function useHeaderVisibility() {
  useEffect(() => {
    const header = document.querySelector(".site-header");
    if (!header) return;

    // Touch devices: hide scrolling down, pop back scrolling up; always
    // visible near the top. (The desktop logic below needs a cursor.)
    if (!window.matchMedia("(hover: hover)").matches) {
      const SHOW_BELOW_Y = 80;
      const MIN_DELTA = 6;
      let lastY = window.scrollY;
      let visible = true;

      const applyTouch = (next: boolean) => {
        if (next === visible) return;
        visible = next;
        header.classList.toggle("is-visible", next);
      };

      const onTouchScroll = () => {
        const y = window.scrollY;
        if (y <= SHOW_BELOW_Y) {
          applyTouch(true);
          lastY = Math.max(0, y);
          return;
        }
        const delta = y - lastY;
        if (Math.abs(delta) < MIN_DELTA) return;
        applyTouch(delta < 0);
        lastY = y;
      };

      window.addEventListener("scroll", onTouchScroll, { passive: true });
      return () => window.removeEventListener("scroll", onTouchScroll);
    }

    const REVEAL_Y = 90;
    const HIDE_Y = 180;
    const SCROLL_HIDE_AT = 200;

    let cursorWantsHeader = false;
    let pastHero = false;

    const apply = () => {
      header.classList.toggle("is-visible", !pastHero || cursorWantsHeader);
    };

    const onScroll = () => {
      const next = window.scrollY > SCROLL_HIDE_AT;
      if (next !== pastHero) {
        pastHero = next;
        apply();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (e.clientY <= REVEAL_Y) {
        if (!cursorWantsHeader) {
          cursorWantsHeader = true;
          apply();
        }
      } else if (e.clientY > HIDE_Y) {
        if (cursorWantsHeader) {
          cursorWantsHeader = false;
          apply();
        }
      }
    };

    const onFocusIn = () => {
      cursorWantsHeader = true;
      apply();
    };

    const onFocusOut = () => {
      cursorWantsHeader = false;
      apply();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    header.addEventListener("focusin", onFocusIn);
    header.addEventListener("focusout", onFocusOut);

    onScroll();
    apply();

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousemove", onMouseMove);
      header.removeEventListener("focusin", onFocusIn);
      header.removeEventListener("focusout", onFocusOut);
    };
  }, []);
}
