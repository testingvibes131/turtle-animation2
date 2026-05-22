"use client";

import { Leva } from "leva";
import { useLayoutEffect, useState } from "react";
import { SketchHeroCopy } from "@/app/sketch/components/SketchHeroCopy";
import { SketchPartnersLogos } from "@/app/sketch/components/SketchPartnersLogos";
import { NoiseSphereSketch } from "@/app/sketch/NoiseSphereScene";

export default function SketchPage() {
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
          <NoiseSphereSketch />
        </div>
        <SketchHeroCopy />
        <SketchPartnersLogos />
      </main>
    </>
  );
}
