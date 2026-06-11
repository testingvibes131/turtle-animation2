"use client";

import { useEffect, useRef } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Live prefers-reduced-motion flag as a ref, for reading inside useFrame
 *  loops (same live-sync pattern as useMobileZoneCarousel's gate). */
export function usePrefersReducedMotionRef() {
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const sync = () => {
      reducedMotionRef.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return reducedMotionRef;
}
