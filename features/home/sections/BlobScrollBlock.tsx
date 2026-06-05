"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BlobExperience } from "@/features/blob-scene";
import { useBlobControls } from "@/features/blob-scene/hooks/useBlobControls";
import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";
import { BlobScrollProgressProvider } from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  blobColoredToGrayMix,
  blobInteractionEnabledFromScroll,
  blobRuntimeSetup,
} from "@/features/blob-scene/lib/scroll/blobScrollInteraction";
import { resolveBlobRuntimeParams } from "@/features/blob-scene/lib/blobRuntimeParams";
import { blobHeroShowcaseActive } from "@/features/blob-scene/lib/scroll/heroShowcase";
import { BlobLevaPanel } from "@/features/home/sections/BlobLevaPanel";

const MOBILE_BLOB_QUERY = "(max-width: 1023px)";

function computeBlobScrollProgress(
  scrolled: number,
  heroScroll: number,
  section2: HTMLElement | null,
  isMobile: boolean,
): number {
  if (!isMobile || !section2) {
    return Math.min(1, Math.max(0, scrolled / Math.max(heroScroll, 1)));
  }

  const textBlock = section2.querySelector<HTMLElement>("[data-blob-mobile-text]");
  const visualBlock = section2.querySelector<HTMLElement>(
    "[data-blob-mobile-visual]",
  );
  const textHeight = textBlock?.offsetHeight ?? 0;
  const visualHeight = visualBlock?.offsetHeight ?? window.innerHeight;
  const visualStart = heroScroll + textHeight;

  if (scrolled <= visualStart) {
    return 0;
  }

  return Math.min(1, (scrolled - visualStart) / Math.max(visualHeight, 1));
}

/**
 * One blob canvas for hero + section 2: sticky backdrop with scrollable content overlaid.
 * Leva setup picks params + interaction mode; scroll always drives blob placement.
 */
export function BlobScrollBlock({ children }: { children: ReactNode }) {
  const { setup: levaSetup, params, section1, transition, coloredDots } =
    useBlobControls();
  const blockRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const [runtimeSetup, setRuntimeSetup] = useState<BlobSetupId>(() =>
    levaSetup === "section-1-blob" ? "section-1-blob" : "connected-lines",
  );
  const [coloredToGrayMix, setColoredToGrayMix] = useState(() =>
    levaSetup === "section-1-blob" ? 0 : 1,
  );
  const coloredToGrayMixRef = useRef(coloredToGrayMix);
  const scrollRafRef = useRef<number | null>(null);
  const runtimeParams = useMemo(
    () =>
      resolveBlobRuntimeParams(params, levaSetup, coloredToGrayMix, section1),
    [coloredToGrayMix, levaSetup, params, section1],
  );

  const heroShowcaseActive =
    runtimeSetup === "connected-lines" &&
    blobHeroShowcaseActive(scrollProgress, interactionEnabled);

  useEffect(() => {
    if (levaSetup !== "section-1-blob") return;
    window.scrollTo(0, 0);
  }, [levaSetup]);

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

      const metrics = { scrolled, heroScroll, section2Scroll };
      const isMobile = mobileQuery.matches;
      const grayMix = blobColoredToGrayMix(levaSetup, metrics, transition);
      const runtime = blobRuntimeSetup(levaSetup, metrics, transition);

      coloredToGrayMixRef.current = grayMix;

      setScrollProgress(
        computeBlobScrollProgress(scrolled, heroScroll, section2, isMobile),
      );
      setColoredToGrayMix(grayMix);
      setRuntimeSetup(runtime);
      setInteractionEnabled(
        blobInteractionEnabledFromScroll(metrics, levaSetup, transition),
      );
    };

    const updateScroll = () => {
      const hero = block.querySelector<HTMLElement>('[data-blob-section="1"]');
      const section2 = block.querySelector<HTMLElement>(
        '[data-blob-section="2"]',
      );
      const heroScroll = hero?.offsetHeight ?? window.innerHeight;
      const section2Scroll = section2?.offsetHeight ?? window.innerHeight;
      const scrolled = -block.getBoundingClientRect().top;
      const metrics = { scrolled, heroScroll, section2Scroll };
      coloredToGrayMixRef.current = blobColoredToGrayMix(
        levaSetup,
        metrics,
        transition,
      );

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
  }, [levaSetup, transition]);

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
            heroShowcaseActive={heroShowcaseActive}
            interactionEnabled={interactionEnabled}
            blobSetup={runtimeSetup}
            coloredToGrayMix={coloredToGrayMix}
            coloredToGrayMixRef={coloredToGrayMixRef}
            transitionTuning={transition}
            coloredDotsTuning={coloredDots}
            section1Tuning={section1}
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
