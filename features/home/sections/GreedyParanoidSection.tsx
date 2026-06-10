"use client";

import { HeroCopy } from "@/features/home/components/HeroCopy";
import { PartnersLogos } from "@/features/home/components/PartnersLogos";

/** Clear sticky SiteHeader; small gap below the bar on mobile, more room on desktop. */
const section2MobilePad =
  "px-6 pt-[calc(var(--site-header-height)+clamp(8px,1.5vw,12px))] md:px-10";
const section2DesktopPad =
  "lg:px-[100px] lg:pt-[calc(var(--site-header-height)+clamp(56px,7vw,112px))] lg:pb-[clamp(48px,7vh,112px)]";

/** Section 2 — copy + partners, then blob reveal on mobile; side-by-side on desktop. */
export function GreedyParanoidSection() {
  return (
    <section
      data-blob-section="2"
      className={[
        "relative flex w-full flex-col pointer-events-none",
        "lg:min-h-svh",
        "opacity-100",
      ].join(" ")}
    >
      {/*
        Mobile: sticky full-viewport shell — copy top, marquee bottom, blob in the flex gap.
        Scroll runway below keeps section 2 pinned while the page advances.
      */}
      <div
        data-blob-mobile-text
        className={[
          "relative flex w-full flex-col justify-between bg-transparent",
          "max-lg:sticky max-lg:top-0 max-lg:h-svh max-lg:shrink-0",
          "px-6 md:px-10",
          section2MobilePad,
          "lg:sticky lg:top-0 lg:mx-auto lg:h-svh lg:max-w-[1728px] lg:shrink-0",
          section2DesktopPad,
        ].join(" ")}
      >
        <HeroCopy className="shrink-0" />
        {/* Strip sits one layer behind the blob canvas so the central partner
            logo (and dots) render on top of it where they overlap. */}
        <div className="relative -z-10 shrink-0">
          <PartnersLogos variant="flow" />
        </div>
      </div>

      {/* Mobile: in-flow scroll runway for blob reveal (content scrolls; panel above stays sticky) */}
      <div
        data-blob-mobile-visual
        className="relative h-[min(100svh,720px)] w-full shrink-0 lg:hidden"
        aria-hidden
      />

      {/* Desktop: scroll runway for the hold. The copy/logos above are sticky
          (lg:sticky), so they stay pinned with the blob through this runway —
          a longer pause with no empty space — before the page advances. */}
      <div
        data-blob-desktop-hold
        className="hidden h-[35svh] w-full shrink-0 lg:block"
        aria-hidden
      />
    </section>
  );
}
