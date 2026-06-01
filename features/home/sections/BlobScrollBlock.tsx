"use client";

import { Leva } from "leva";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BlobExperience } from "@/features/blob-scene";
import { BlobScrollProgressProvider } from "@/features/blob-scene/context/BlobScrollProgressContext";
import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";
import {
  blobInteractionEnabledFromScroll,
  blobInteractionEndScroll,
  blobShowcaseActiveFromScroll,
  blobShowcaseEndScroll,
  blobShowcaseProgress,
  blobShowcaseTourCompleteFromScroll,
  BLOB_INTERACTION_SECTION2_FRAC,
  BLOB_SHOWCASE_FRAC_OF_INTERACTION_PATH,
  curatorIndexForShowcaseProgress,
} from "@/features/blob-scene/lib/scroll/blobShowcase";

/**
 * One blob canvas for hero + section 2: sticky backdrop with scrollable content overlaid.
 */
export function BlobScrollBlock({ children }: { children: ReactNode }) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showcaseProgress, setShowcaseProgress] = useState(0);
  const [showcaseActive, setShowcaseActive] = useState(false);
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const tourFinishedLoggedRef = useRef(false);
  const hoverEnabledLoggedRef = useRef(false);

  useEffect(() => {
    const block = blockRef.current;
    if (!block) return;

    const updateScroll = () => {
      const hero = block.querySelector<HTMLElement>('[data-blob-section="1"]');
      const section2 = block.querySelector<HTMLElement>(
        '[data-blob-section="2"]',
      );
      const heroScroll = hero?.offsetHeight ?? window.innerHeight;
      const section2Scroll = section2?.offsetHeight ?? window.innerHeight;
      const scrolled = -block.getBoundingClientRect().top;
      const metrics = { scrolled, heroScroll, section2Scroll };

      const showcase = blobShowcaseProgress(metrics);
      const tourComplete = blobShowcaseTourCompleteFromScroll(metrics);
      const interaction = blobInteractionEnabledFromScroll(metrics);
      const showcaseEnd = blobShowcaseEndScroll(metrics);
      const interactionEnd = blobInteractionEndScroll(metrics);

      if (tourComplete && !tourFinishedLoggedRef.current) {
        tourFinishedLoggedRef.current = true;
        const curator =
          CURATORS[curatorIndexForShowcaseProgress(1)]?.name ?? "?";
        console.log("[blob tour] finished", {
          scrolled: Math.round(scrolled),
          showcaseEnd: Math.round(showcaseEnd),
          interactionEnd: Math.round(interactionEnd),
          gapPx: Math.round(interactionEnd - showcaseEnd),
          showcaseProgress: showcase,
          lastCurator: curator,
          pathToHoverFrac: BLOB_SHOWCASE_FRAC_OF_INTERACTION_PATH,
          section2HoverFrac: BLOB_INTERACTION_SECTION2_FRAC,
          heroScroll: Math.round(heroScroll),
          section2Scroll: Math.round(section2Scroll),
        });
      }
      if (!tourComplete && scrolled < showcaseEnd * 0.9) {
        tourFinishedLoggedRef.current = false;
      }

      if (interaction && !hoverEnabledLoggedRef.current) {
        hoverEnabledLoggedRef.current = true;
        console.log("[blob tour] hover enabled (tour off, pointer on)", {
          scrolled: Math.round(scrolled),
          showcaseEnd: Math.round(showcaseEnd),
          interactionLine: Math.round(interactionEnd),
          section2HoverFrac: BLOB_INTERACTION_SECTION2_FRAC,
        });
      }
      if (!interaction) {
        hoverEnabledLoggedRef.current = false;
      }

      setScrollProgress(Math.min(1, Math.max(0, scrolled / heroScroll)));
      setShowcaseProgress(showcase);
      setInteractionEnabled(interaction);
      setShowcaseActive(blobShowcaseActiveFromScroll(metrics));
    };

    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, []);

  return (
    <div ref={blockRef} className="relative">
      <Leva collapsed />
      <div className="sticky top-0 z-0 h-screen w-full">
        <div
          className={[
            "absolute inset-0 touch-none",
            interactionEnabled ? "pointer-events-auto" : "pointer-events-none",
          ].join(" ")}
        >
          <BlobScrollProgressProvider
            progress={scrollProgress}
            showcaseProgress={showcaseProgress}
            showcaseActive={showcaseActive}
            interactionEnabled={interactionEnabled}
          >
            <BlobExperience />
          </BlobScrollProgressProvider>
        </div>
      </div>
      <div className="relative z-10 -mt-[100vh] pointer-events-none">
        {children}
      </div>
    </div>
  );
}
