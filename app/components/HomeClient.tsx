"use client";

import { CoordinatedCapitalStats } from "./CoordinatedCapitalStats";
import { PlexusSketch } from "./PlexusSketch";
import { HeroSection } from "./HeroSection";
import { HomeStatsStrip } from "./HomeStatsStrip";
import { SiteHeader } from "./SiteHeader";

export function HomeClient() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#0a0a0a]">
      <PlexusSketch />
      <HeroSection />
      <SiteHeader />
      <HomeStatsStrip />
      <CoordinatedCapitalStats />
    </main>
  );
}
