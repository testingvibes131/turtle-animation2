"use client";

import { useEffect } from "react";

export function useHeaderVisibility() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;

    const header = document.querySelector(".site-header");
    if (!header) return;

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
