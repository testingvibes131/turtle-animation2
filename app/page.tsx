import { CoordinatedCapitalStats } from "./components/CoordinatedCapitalStats";
import { PlexusSketch } from "./components/PlexusSketch";
import { HeroSection } from "./components/HeroSection";
import { HomeStatsStrip } from "./components/HomeStatsStrip";
import { SiteHeader } from "./components/SiteHeader";

export default function Home() {
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
