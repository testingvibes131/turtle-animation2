"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BlobExperience } from "@/features/blob-scene";
import { useBlobControls } from "@/features/blob-scene/hooks/useBlobControls";
import { BlobScrollProgressProvider } from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  blobInSection1,
  blobInteractionEnabledFromScroll,
  blobRuntimeSetup,
} from "@/features/blob-scene/lib/scroll/blobScrollInteraction";
import { computeBlobScrollProgress } from "@/features/blob-scene/lib/scroll/blobScrollProgress";
import { scrollWobbleStrengthFromDelta } from "@/features/blob-scene/lib/geometry/blobScrollWobble";
import { resolveBlobRuntimeParams } from "@/features/blob-scene/lib/blobRuntimeParams";
import { BlobLevaPanel } from "@/features/home/sections/BlobLevaPanel";

const MOBILE_BLOB_QUERY = "(max-width: 1023px)";
const GRAY_DOT_MIX = 1;
/** Hero (section 1) uses mirrored section-2 layout until scroll crosses center. */
const LAYOUT_MIRROR_THRESHOLD = 0.5;

/**
 * One blob canvas for hero + section 2: sticky backdrop with scrollable content overlaid.
 * Section 1 mirrors section 2 on the left; scroll moves the blob to the right.
 */
export function BlobScrollBlock({ children }: { children: ReactNode }) {
  const { params, transition } = useBlobControls();
  const blockRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [inSection1, setInSection1] = useState(true);
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const coloredToGrayMixRef = useRef(GRAY_DOT_MIX);
  const scrollWobbleStrengthRef = useRef(0);
  const prevScrolledRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const runtimeParams = useMemo(
    () => resolveBlobRuntimeParams(params),
    [params],
  );
  const layoutMirrored = scrollProgress < LAYOUT_MIRROR_THRESHOLD;

  useEffect(() => {
    const block = blockRef.current;
    if (!block) return;

    const mobileQuery = window.matchMedia(MOBILE_BLOB_QUERY);
    const applyScroll = () => {
      scrollRafRef.current = null;
      const hero = block.querySelector<HTMLElement>('[data-blob-section="1"]');
      const section2 = block.querySelector<HTMLElement>(
        '[data-blob-section="2"]',
      );
      const heroScroll = hero?.offsetHeight ?? window.innerHeight;
      const section2Scroll = section2?.offsetHeight ?? window.innerHeight;
      const scrolled = -block.getBoundingClientRect().top;
      const scrollDelta = Math.abs(scrolled - prevScrolledRef.current);
      prevScrolledRef.current = scrolled;
      scrollWobbleStrengthRef.current = scrollWobbleStrengthFromDelta(
        scrollDelta,
        scrollWobbleStrengthRef.current,
      );

      const metrics = { scrolled, heroScroll, section2Scroll };
      const isMobile = mobileQuery.matches;

      setScrollProgress(
        computeBlobScrollProgress(scrolled, heroScroll, section2, isMobile),
      );
      setInSection1(blobInSection1(metrics));
      setInteractionEnabled(
        blobInteractionEnabledFromScroll(metrics, transition, section2),
      );
    };

    const updateScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = requestAnimationFrame(applyScroll);
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    mobileQuery.addEventListener("change", updateScroll);
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      mobileQuery.removeEventListener("change", updateScroll);
    };
  }, [transition]);

  return (
    <div ref={blockRef} className="relative isolate">
      <BlobLevaPanel />
      <div className="sticky top-0 -z-10 h-screen w-full">
        <div
          className={[
            "absolute inset-0 touch-none",
            interactionEnabled ? "pointer-events-auto" : "pointer-events-none",
          ].join(" ")}
        >
          <BlobScrollProgressProvider
            progress={scrollProgress}
            inSection1={inSection1}
            interactionEnabled={interactionEnabled}
            blobSetup={blobRuntimeSetup()}
            coloredToGrayMix={GRAY_DOT_MIX}
            coloredToGrayMixRef={coloredToGrayMixRef}
            scrollWobbleStrengthRef={scrollWobbleStrengthRef}
            layoutMirrored={layoutMirrored}
            transitionTuning={transition}
          >
            <BlobExperience params={runtimeParams} />
          </BlobScrollProgressProvider>
        </div>
      </div>
      <div className="relative z-0 -mt-[100vh] pointer-events-none">
        {children}
      </div>
    </div>
  );
}
