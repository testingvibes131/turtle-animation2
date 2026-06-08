import { SectionIntro } from "@/components/layout/SectionIntro";
import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { HeroStatsPanel } from "@/features/home/components/HeroStatsPanel";

export function HeroSection() {
  return (
    <section
      data-blob-section="1"
      className="pointer-events-none relative flex min-h-[calc(100svh-var(--site-header-height))] w-full flex-col"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 md:px-10 lg:px-[60px]">
        <div className="w-full flex-1 pt-[clamp(32px,8svh,15svh)]">
          <RevealOnScroll className="w-full text-center lg:text-left">
            <SectionIntro
              width="none"
              className="hero-intro items-center lg:items-start"
            >
              <h1 className="w-full overflow-visible bg-clip-text text-4xl font-normal leading-[1.1] tracking-[0.4px] text-transparent text-gradient-heading lg:text-6xl">
                Onchain Yield Management
              </h1>
              <p className="bg-clip-text font-normal text-transparent text-gradient-heading">
                Aggregated, Diligenced, Personalized
              </p>
              <div className="pointer-events-auto mt-6 flex flex-wrap justify-center gap-2 lg:mt-7 lg:justify-start">
                <CtaPill href="#" label="For Investors" />
                <CtaPill href="#" label="For Asset Issuers" />
              </div>
            </SectionIntro>
          </RevealOnScroll>
        </div>

        <HeroStatsPanel />
      </div>
    </section>
  );
}
