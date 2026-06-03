"use client";

import { useEffect } from "react";
import { SiteHeader } from "@/components/site-header/SiteHeader";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { GlowDivider } from "@/components/ui/GlowDivider";
import { BackedBy } from "@/features/home/sections/BackedBy";
import { CaseStudies } from "@/features/home/sections/CaseStudies";
import { CommandCenter } from "@/features/home/sections/CommandCenter";
import { BlobScrollBlock } from "@/features/home/sections/BlobScrollBlock";
import { GreedyParanoidSection } from "@/features/home/sections/GreedyParanoidSection";
import { HeroSection } from "@/features/home/sections/HeroSection";
import { LatestUpdates } from "@/features/home/sections/LatestUpdates";
import { Pipeline } from "@/features/home/sections/Pipeline";
import { DeFiCta } from "@/features/home/sections/DeFiCta";
import { Team } from "@/features/home/sections/Team";

export function LandingPage() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="bg-surface-0 text-ink-primary">
        <BlobScrollBlock>
          <HeroSection />
          <GreedyParanoidSection />
        </BlobScrollBlock>
        <CommandCenter />
        <Pipeline />
        <CaseStudies />
        <BackedBy />
        <Team />
        <DeFiCta />
        <LatestUpdates />
        <GlowDivider />
      </main>
      <SiteFooter />
    </>
  );
}
