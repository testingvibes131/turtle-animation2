"use client";

import { HeroCopy } from "@/features/home/components/HeroCopy";
import { PartnersLogos } from "@/features/home/components/PartnersLogos";

/** Clear sticky SiteHeader; small gap below the bar on mobile, more room on desktop. */
const section2MobilePad =
  "px-6 pt-[calc(var(--site-header-height)+clamp(8px,1.5vw,12px))] md:px-10";
const section2DesktopPad =
  "lg:px-[100px] lg:pt-[calc(var(--site-header-height)+clamp(56px,7vw,112px))]";

/** Section 2 — copy + partners, then blob reveal on mobile; side-by-side on desktop. */
export function GreedyParanoidSection() {
  return (
    <section
      data-blob-section="2"
      className={[
        "relative z-10 flex w-full flex-col pointer-events-none",
        "lg:min-h-svh",
        "opacity-100",
      ].join(" ")}
    >
      {/*
        Mobile: sticky full-viewport shell — copy top, marquee bottom, blob in the flex gap.
        Scroll distance below (data-blob-mobile-visual) drives blob motion while this panel stays pinned.
      */}
      <div
        data-blob-mobile-text
        className={[
          "relative z-10 flex w-full flex-col justify-between bg-transparent",
          "max-lg:sticky max-lg:top-0 max-lg:h-svh max-lg:shrink-0",
          "px-6 md:px-10",
          section2MobilePad,
          "lg:mx-auto lg:min-h-0 lg:max-w-[1728px] lg:flex-1",
          section2DesktopPad,
        ].join(" ")}
      >
        <HeroCopy className="shrink-0" />
        <PartnersLogos variant="flow" className="shrink-0" />
      </div>

      {/* Mobile: in-flow scroll runway for blob reveal (content scrolls; panel above stays sticky) */}
      <div
        data-blob-mobile-visual
        className="relative h-[min(100svh,720px)] w-full shrink-0 lg:hidden"
        aria-hidden
      />
    </section>
  );
}
