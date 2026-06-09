import { SectionIntro } from "@/components/layout/SectionIntro";
import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { HeroStatsPanel } from "@/features/home/components/HeroStatsPanel";

export function HeroSection() {
  return (
    <section
      data-blob-section="1"
      className="relative z-10 flex w-full flex-col pointer-events-none lg:min-h-[calc(100svh-var(--site-header-height))]"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 md:px-10 lg:flex-1 lg:px-[60px]">
        <div className="w-full pt-[clamp(32px,8svh,15svh)] lg:flex-1">
          <RevealOnScroll className="w-full text-center lg:text-left">
            <SectionIntro
              width="none"
              className="items-center gap-0 lg:items-start"
            >
              <h1 className="w-full overflow-visible bg-clip-text text-4xl font-normal leading-tight tracking-[0.4px] text-transparent text-gradient-heading lg:text-6xl lg:leading-[1.1]">
                Onchain Yield Management
              </h1>
              <p className="mt-3 bg-clip-text text-2xl font-normal leading-[1.4] text-transparent text-gradient-heading lg:mt-[clamp(6px,0.55vw,8px)] lg:leading-[1.3]">
                Aggregated, Diligenced, Personalized
              </p>
              <div className="pointer-events-auto mt-0 flex flex-wrap justify-center gap-2 lg:mt-7 lg:justify-start">
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
