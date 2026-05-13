"use client";

import { useLayoutEffect, useState } from "react";
import { CoordinatedCapitalStats } from "./CoordinatedCapitalStats";
import { PlexusSketch } from "./PlexusSketch";
import { HeroSection } from "./HeroSection";
import { HomeStatsStrip } from "./HomeStatsStrip";
import { SiteHeader } from "./SiteHeader";

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
      <PlexusSketch />
      <HeroSection />
      <SiteHeader />
      <HomeStatsStrip />
      <CoordinatedCapitalStats />
    </main>
  );
}
