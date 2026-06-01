"use client";

import { useLayoutEffect, useState } from "react";
import { HeroCopy } from "@/features/home/components/HeroCopy";
import { PartnersLogos } from "@/features/home/components/PartnersLogos";

/** Section 2 — copy overlays the shared blob backdrop (see BlobScrollBlock). */
export function GreedyParanoidSection() {
  const [fadeIn, setFadeIn] = useState(false);

  useLayoutEffect(() => {
    setFadeIn(true);
  }, []);

  return (
    <section
      data-blob-section="2"
      className={[
        "pointer-events-none relative h-screen w-full overflow-hidden",
        "transition-opacity duration-500 ease-out motion-reduce:transition-none",
        fadeIn ? "opacity-100" : "opacity-0",
        "motion-reduce:opacity-100",
      ].join(" ")}
    >
      <div className="relative mx-auto h-full w-full max-w-[1728px]">
        <HeroCopy />
        <PartnersLogos />
      </div>
    </section>
  );
}
