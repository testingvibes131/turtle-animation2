"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
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
  const [motionProgress, setMotionProgress] = useState(0);
  const [inSection1, setInSection1] = useState(true);
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const [mobileZoneCarouselEnabled, setMobileZoneCarouselEnabled] =
    useState(false);
  const coloredToGrayMixRef = useRef(GRAY_DOT_MIX);
  const scrollWobbleStrengthRef = useRef(0);
  const prevScrolledRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
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
      // Blob motion: most of the travel over the hero (0 -> 0.88), then the final
      // creep over section 2's sticky hold (0.88 -> 1), so the blob glides to its
      // resting spot and lands as the section scrolls on (no wall at handoff).
      const heroMotionT = Math.min(
        1,
        Math.max(0, scrolled / Math.max(heroScroll, 1)),
      );
      const holdMotionT = Math.min(
        1,
        Math.max(0, (scrolled - heroScroll) / Math.max(section2Scroll, 1)),
      );
      setMotionProgress(
        heroMotionT < 1 ? heroMotionT * 0.88 : 0.88 + 0.12 * holdMotionT,
      );
      const inSec1 = blobInSection1(metrics);
      setInSection1(inSec1);
      const inSection2 = blobInteractionEnabledFromScroll(metrics);
      setInteractionEnabled(!isMobile && inSection2);
      // Mobile carousel: only once the blob is fully past the hero (finishing spin
      // done), not during the 85%+ approach — stops a partner flashing mid-spin.
      setMobileZoneCarouselEnabled(isMobile && inSection2 && !inSec1);
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
  }, []);

  return (
    <div ref={blockRef} className="relative">
      {/* Canvas backdrop — z-0, no pointer events (mobile + desktop); desktop interaction re-enabled on hit target only */}
      <div className="pointer-events-none sticky top-0 z-0 h-svh w-full">
        <div
          className={[
            "absolute inset-0 z-0 touch-none",
            interactionEnabled
              ? "pointer-events-none lg:pointer-events-auto"
              : "pointer-events-none",
          ].join(" ")}
        >
          <BlobScrollProgressProvider
            progress={scrollProgress}
            motionProgress={motionProgress}
            inSection1={inSection1}
            interactionEnabled={interactionEnabled}
            mobileZoneCarouselEnabled={mobileZoneCarouselEnabled}
            blobSetup={blobRuntimeSetup()}
            coloredToGrayMix={GRAY_DOT_MIX}
            coloredToGrayMixRef={coloredToGrayMixRef}
            scrollWobbleStrengthRef={scrollWobbleStrengthRef}
            layoutMirrored={layoutMirrored}
            transitionTuning={transition}
          >
            <BlobExperience params={params} />
          </BlobScrollProgressProvider>
        </div>
      </div>
      {/* No z-10 here: text stays above the blob via DOM paint order, which
          frees the partner strip below to drop onto its own negative layer
          (behind the blob) without a stacking-context trap. */}
      <div className="pointer-events-none relative -mt-[100svh]">
        {children}
      </div>
    </div>
  );
}
