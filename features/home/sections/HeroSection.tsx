import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { HeroStatsPanel } from "@/features/home/components/HeroStatsPanel";

export function HeroSection() {
  return (
    <section
      data-blob-section="1"
      className="relative flex min-h-[calc(100svh-var(--site-header-height))] w-full flex-col pointer-events-none"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 md:px-10 lg:px-[60px]">
        <div className="w-full flex-1 pt-[15svh]">
          <RevealOnScroll className="flex w-full flex-col">
            <h1 className="w-full overflow-visible bg-clip-text pb-[0.15em] text-7xl font-normal leading-none tracking-[0.4px] text-transparent text-gradient-heading">
              Onchain Yield Management
            </h1>

            <div className="flex w-full flex-wrap items-center justify-end gap-x-[50px] gap-y-4">
              <p className="bg-clip-text text-4xl font-normal leading-[1.3] text-transparent text-gradient-heading">
                Aggregated, Diligenced, Personalized
              </p>
              <div className="pointer-events-auto inline-flex gap-2">
                <CtaPill href="#" label="For Investors" />
                <CtaPill href="#" label="For Asset Issuers" />
              </div>
            </div>
          </RevealOnScroll>
        </div>

        <HeroStatsPanel />
      </div>
    </section>
  );
}
