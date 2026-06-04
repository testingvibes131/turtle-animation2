"use client";

import { Leva } from "leva";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BlobExperience } from "@/features/blob-scene";
import { BlobScrollProgressProvider } from "@/features/blob-scene/context/BlobScrollProgressContext";
import { blobInteractionEnabledFromScroll } from "@/features/blob-scene/lib/scroll/blobScrollInteraction";
import { blobHeroShowcaseActive } from "@/features/blob-scene/lib/scroll/heroShowcase";

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
 */
export function BlobScrollBlock({ children }: { children: ReactNode }) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [heroShowcaseActive, setHeroShowcaseActive] = useState(true);
  const [interactionEnabled, setInteractionEnabled] = useState(false);

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
      const metrics = { scrolled, heroScroll, section2Scroll };
      const isMobile = mobileQuery.matches;

      const progress = computeBlobScrollProgress(
        scrolled,
        heroScroll,
        section2,
        isMobile,
      );
      const interaction = blobInteractionEnabledFromScroll(metrics);

      setScrollProgress(progress);
      setInteractionEnabled(interaction);
      setHeroShowcaseActive(blobHeroShowcaseActive(progress, interaction));
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    mobileQuery.addEventListener("change", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      mobileQuery.removeEventListener("change", updateScroll);
    };
  }, []);

  return (
    <div ref={blockRef} className="relative isolate">
      <Leva collapsed />
      {/* Behind scroll content: sticky z-0 can still composite above the sibling layer. */}
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
          >
            <BlobExperience />
          </BlobScrollProgressProvider>
        </div>
      </div>
      <div className="relative z-0 -mt-[100vh] pointer-events-none">
        {children}
      </div>
    </div>
  );
}
