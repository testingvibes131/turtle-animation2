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
          <RevealOnScroll className="flex w-full flex-col items-center gap-2.5 text-center lg:items-start lg:text-left">
            <h1 className="w-full overflow-visible bg-clip-text pb-[0.1em] text-4xl font-normal leading-[1.1] tracking-[0.4px] text-transparent text-gradient-heading">
              Onchain Yield Management
            </h1>
            <p className="bg-clip-text text-2xl font-normal leading-[1.3] text-transparent text-gradient-heading">
              Aggregated, Diligenced, Personalized
            </p>
            <div className="pointer-events-auto mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
              <CtaPill href="#" label="For Investors" />
              <CtaPill href="#" label="For Asset Issuers" />
            </div>
          </RevealOnScroll>
        </div>

        <HeroStatsPanel />
      </div>
    </section>
  );
}
