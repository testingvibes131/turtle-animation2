import { CoordinatedCapitalStats } from "./components/CoordinatedCapitalStats";
import { FlowFieldSketch } from "./components/FlowFieldSketch";
import { HeroSection } from "./components/HeroSection";
import { HomeStatsStrip } from "./components/HomeStatsStrip";
import { SiteHeader } from "./components/SiteHeader";

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#0a0a0a]">
      <FlowFieldSketch />
      <HeroSection />
      <SiteHeader />
      <HomeStatsStrip />
      <CoordinatedCapitalStats />
    </main>
  );
}
