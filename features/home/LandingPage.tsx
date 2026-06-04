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

/**
 * Section-by-section dev focus. Set to a section key to render only that slice
 * (and everything above it in page order). Set to null for the full landing page.
 */
const LANDING_FOCUS_SECTION:
  | null
  | "hero"
  | "greedy"
  | "command-center"
  | "pipeline"
  | "case-studies"
  | "team"
  | "backed-by"
  | "defi-cta"
  | "latest-updates" = "command-center";

const SECTION_ORDER = [
  "hero",
  "greedy",
  "command-center",
  "pipeline",
  "case-studies",
  "team",
  "backed-by",
  "defi-cta",
  "latest-updates",
] as const;

function includesSection(
  focus: typeof LANDING_FOCUS_SECTION,
  section: (typeof SECTION_ORDER)[number],
) {
  if (focus === null) return true;
  const focusIndex = SECTION_ORDER.indexOf(focus);
  const sectionIndex = SECTION_ORDER.indexOf(section);
  return sectionIndex <= focusIndex;
}

export function LandingPage() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }, []);

  const show = (section: (typeof SECTION_ORDER)[number]) =>
    includesSection(LANDING_FOCUS_SECTION, section);

  const fullPage = LANDING_FOCUS_SECTION === null;

  return (
    <>
      <SiteHeader />
      <main className="bg-surface-0 text-ink-primary">
        <BlobScrollBlock>
          {show("hero") ? <HeroSection /> : null}
          {show("greedy") ? <GreedyParanoidSection /> : null}
        </BlobScrollBlock>
        {show("command-center") ? <CommandCenter /> : null}
        {show("pipeline") ? <Pipeline /> : null}
        {show("case-studies") ? <CaseStudies /> : null}
        {show("team") ? <Team /> : null}
        {show("backed-by") ? <BackedBy /> : null}
        {show("defi-cta") ? <DeFiCta /> : null}
        {show("latest-updates") ? <LatestUpdates /> : null}
        {fullPage ? <GlowDivider /> : null}
      </main>
      {fullPage ? <SiteFooter /> : null}
    </>
  );
}
