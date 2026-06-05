"use client";

import { useLayoutEffect, useState } from "react";
import { HeroCopy } from "@/features/home/components/HeroCopy";
import { PartnersLogos } from "@/features/home/components/PartnersLogos";

/** Clear sticky SiteHeader; small gap below the bar on mobile, more room on desktop. */
const section2MobilePad =
  "px-6 pt-[calc(var(--site-header-height)+clamp(8px,1.5vw,12px))] md:px-10";
const section2DesktopPad =
  "lg:px-[100px] lg:pt-[calc(var(--site-header-height)+clamp(56px,7vw,112px))]";

/** Section 2 — copy + partners, then blob reveal on mobile; side-by-side on desktop. */
export function GreedyParanoidSection() {
  const [fadeIn, setFadeIn] = useState(false);

  useLayoutEffect(() => {
    setFadeIn(true);
  }, []);

  return (
    <section
      data-blob-section="2"
      className={[
        "pointer-events-none relative flex w-full flex-col",
        "min-h-[calc(100svh-var(--site-header-height))] lg:min-h-svh",
        "transition-opacity duration-500 ease-out motion-reduce:transition-none",
        fadeIn ? "opacity-100" : "opacity-0",
        "motion-reduce:opacity-100",
      ].join(" ")}
    >
      {/* Mobile: one viewport — copy top, marquee bottom */}
      <div
        data-blob-mobile-text
        className={[
          "relative z-10 flex min-h-[calc(100svh-var(--site-header-height))] w-full shrink-0 flex-col justify-between bg-transparent lg:hidden",
          section2MobilePad,
        ].join(" ")}
      >
        <HeroCopy className="max-w-none shrink-0" />
        <PartnersLogos variant="flow" />
      </div>

      {/* Desktop: full section height — copy top, marquee bottom */}
      <div
        className={[
          "relative mx-auto hidden min-h-0 w-full max-w-[1728px] flex-1 flex-col justify-between lg:flex",
          "px-6 md:px-10",
          section2DesktopPad,
        ].join(" ")}
      >
        <HeroCopy className="shrink-0" />
        <PartnersLogos variant="flow" />
      </div>

      {/* Mobile: scroll stage for blob reveal (sticky canvas shows through here) */}
      <div
        data-blob-mobile-visual
        className="relative min-h-[min(100svh,720px)] w-full shrink-0 lg:hidden"
        aria-hidden
      />
    </section>
  );
}
