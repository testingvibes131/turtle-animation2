"use client";

import { Leva } from "leva";
import { useLayoutEffect, useState } from "react";
import { HeroSection } from "@/app/components/HeroSection";
import { SiteHeader } from "@/app/components/SiteHeader";
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
        <HeroSection />
        <SiteHeader />
      </main>
    </>
  );
}
