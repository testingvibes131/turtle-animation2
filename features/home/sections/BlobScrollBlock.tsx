"use client";

import { Leva } from "leva";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BlobExperience } from "@/features/blob-scene";
import { useBlobControls } from "@/features/blob-scene/hooks/useBlobControls";
import type { BlobSetupId } from "@/features/blob-scene/lib/blobVisualPresets";
import { BlobScrollProgressProvider } from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  blobColoredToGrayMix,
  blobInteractionEnabledFromScroll,
  blobRuntimeSetup,
} from "@/features/blob-scene/lib/scroll/blobScrollInteraction";
import { blobHeroShowcaseActive } from "@/features/blob-scene/lib/scroll/heroShowcase";
import {
  SCROLL_VELOCITY_DECAY,
  SCROLL_VELOCITY_IDLE_MS,
  SCROLL_VELOCITY_ZERO_EPS,
} from "@/features/blob-scene/lib/scroll/blobScrollVelocity";

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
  const { setup: levaSetup, params, transition, coloredDots } = useBlobControls();
  const blockRef = useRef<HTMLDivElement>(null);
  const scrollVelocityRef = useRef(0);
  const lastScrollSampleRef = useRef({ scrolled: 0, time: 0 });
  const lastVelocityUpdateRef = useRef(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const [runtimeSetup, setRuntimeSetup] = useState<BlobSetupId>(() =>
    levaSetup === "section-1-blob" ? "section-1-blob" : "connected-lines",
  );
  const [coloredToGrayMix, setColoredToGrayMix] = useState(() =>
    levaSetup === "section-1-blob" ? 0 : 1,
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

    const updateScroll = () => {
      const hero = block.querySelector<HTMLElement>('[data-blob-section="1"]');
      const section2 = block.querySelector<HTMLElement>(
        '[data-blob-section="2"]',
      );
      const heroScroll = hero?.offsetHeight ?? window.innerHeight;
      const section2Scroll = section2?.offsetHeight ?? window.innerHeight;
      const scrolled = -block.getBoundingClientRect().top;
      const now = performance.now();
      const last = lastScrollSampleRef.current;

      if (last.time > 0) {
        const dt = (now - last.time) / 1000;
        if (dt > 0 && dt < 0.25) {
          scrollVelocityRef.current = (scrolled - last.scrolled) / dt;
          lastVelocityUpdateRef.current = now;
        }
      }

      lastScrollSampleRef.current = { scrolled, time: now };

      const metrics = { scrolled, heroScroll, section2Scroll };
      const isMobile = mobileQuery.matches;
      const grayMix = blobColoredToGrayMix(levaSetup, metrics, transition);
      const runtime = blobRuntimeSetup(levaSetup, metrics, transition);

      setScrollProgress(
        computeBlobScrollProgress(scrolled, heroScroll, section2, isMobile),
      );
      setColoredToGrayMix(grayMix);
      setRuntimeSetup(runtime);
      setInteractionEnabled(
        blobInteractionEnabledFromScroll(metrics, levaSetup, transition),
      );
    };

    let decayRaf = 0;
    const decayScrollVelocity = (time: number) => {
      if (time - lastVelocityUpdateRef.current > SCROLL_VELOCITY_IDLE_MS) {
        scrollVelocityRef.current *= SCROLL_VELOCITY_DECAY;
        if (Math.abs(scrollVelocityRef.current) < SCROLL_VELOCITY_ZERO_EPS) {
          scrollVelocityRef.current = 0;
        }
      }
      decayRaf = requestAnimationFrame(decayScrollVelocity);
    };

    updateScroll();
    decayRaf = requestAnimationFrame(decayScrollVelocity);
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    mobileQuery.addEventListener("change", updateScroll);
    return () => {
      cancelAnimationFrame(decayRaf);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      mobileQuery.removeEventListener("change", updateScroll);
    };
  }, [levaSetup, transition]);

  return (
    <div ref={blockRef} className="relative isolate">
      <Leva oneLineLabels titleBar={{ title: "Blob" }} />
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
            scrollVelocityRef={scrollVelocityRef}
            transitionTuning={transition}
            coloredDotsTuning={coloredDots}
          >
            <BlobExperience params={params} />
          </BlobScrollProgressProvider>
        </div>
      </div>
      <div className="relative z-0 -mt-[100vh] pointer-events-none">
        {children}
      </div>
    </div>
  );
}
