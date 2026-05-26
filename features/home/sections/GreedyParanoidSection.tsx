"use client";

import { Leva } from "leva";
import { useLayoutEffect, useState } from "react";
import { BlobExperience } from "@/features/blob-scene";
import { HeroCopy } from "@/features/home/components/HeroCopy";
import { PartnersLogos } from "@/features/home/components/PartnersLogos";

/** Section 2 — fullscreen blob scene (existing prototype setup). */
export function GreedyParanoidSection() {
  const [fadeIn, setFadeIn] = useState(false);

  useLayoutEffect(() => {
    setFadeIn(true);
  }, []);

  return (
    <>
      <Leva collapsed />
      <section
        className={[
          "relative h-screen w-full overflow-hidden bg-[#141514]",
          "transition-opacity duration-500 ease-out motion-reduce:transition-none",
          fadeIn ? "opacity-100" : "opacity-0",
          "motion-reduce:opacity-100",
        ].join(" ")}
      >
        <div className="relative mx-auto h-full w-full max-w-[1728px]">
          <div className="absolute inset-0 z-0 touch-none">
            <BlobExperience />
          </div>
          <HeroCopy />
          <PartnersLogos />
        </div>
      </section>
    </>
  );
}
