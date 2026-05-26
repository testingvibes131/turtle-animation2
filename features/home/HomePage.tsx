"use client";

import { Leva } from "leva";
import { useLayoutEffect, useState } from "react";
import { BlobExperience } from "@/features/blob-scene";
import { HeroCopy } from "@/features/home/components/HeroCopy";
import { PartnersLogos } from "@/features/home/components/PartnersLogos";

export function HomePage() {
  const [fadeIn, setFadeIn] = useState(false);
  useLayoutEffect(() => {
    setFadeIn(true);
  }, []);

  return (
    <>
      <Leva collapsed />
      <main
        className={[
          "relative h-screen w-full overflow-hidden bg-[#141514]",
          "transition-opacity duration-500 ease-out motion-reduce:transition-none",
          fadeIn ? "opacity-100" : "opacity-0",
          "motion-reduce:opacity-100",
        ].join(" ")}
      >
        <div className="absolute inset-0 z-0 touch-none">
          <BlobExperience />
        </div>
        <HeroCopy />
        <PartnersLogos />
      </main>
    </>
  );
}
