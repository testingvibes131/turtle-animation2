"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useState } from "react";
import { HeroSection } from "./HeroSection";
import { SiteHeader } from "./SiteHeader";

const OpportunitiesField = dynamic(() => import("./OpportunitiesField"), {
  ssr: false,
});

export function HomeClient() {
  const [fadeIn, setFadeIn] = useState(false);
  useLayoutEffect(() => {
    setFadeIn(true);
  }, []);

  return (
    <main
      className={[
        "relative h-screen w-full overflow-hidden bg-[#0a0a0a]",
        "transition-opacity duration-500 ease-out motion-reduce:transition-none",
        fadeIn ? "opacity-100" : "opacity-0",
        "motion-reduce:opacity-100",
      ].join(" ")}
    >
      <OpportunitiesField />
      <HeroSection />
      <SiteHeader />
    </main>
  );
}
