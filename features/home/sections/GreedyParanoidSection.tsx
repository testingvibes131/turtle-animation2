"use client";

import { useLayoutEffect, useState } from "react";
import { HeroCopy } from "@/features/home/components/HeroCopy";
import { PartnersLogos } from "@/features/home/components/PartnersLogos";

/** Section 2 — in-flow copy + partner marquee over the shared blob backdrop. */
export function GreedyParanoidSection() {
  const [fadeIn, setFadeIn] = useState(false);

  useLayoutEffect(() => {
    setFadeIn(true);
  }, []);

  return (
    <section
      data-blob-section="2"
      className={[
        "pointer-events-none relative flex min-h-svh w-full flex-col",
        "transition-opacity duration-500 ease-out motion-reduce:transition-none",
        fadeIn ? "opacity-100" : "opacity-0",
        "motion-reduce:opacity-100",
      ].join(" ")}
    >
      <div className="mx-auto flex w-full max-w-[1728px] flex-1 flex-col px-6 pb-[clamp(120px,14vw,220px)] pt-[clamp(56px,7vw,112px)] md:px-10 lg:px-[100px]">
        <HeroCopy />
      </div>
      <PartnersLogos />
    </section>
  );
}
