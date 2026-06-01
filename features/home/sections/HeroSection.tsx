import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { HeroStatsPanel } from "@/features/home/components/HeroStatsPanel";

export function HeroSection() {
  return (
    <section
      data-blob-section="1"
      className="relative flex min-h-[calc(100svh-var(--site-header-height))] w-full flex-col pointer-events-none"
    >
      <div className="w-full flex-1 px-6 pt-10 md:px-10 lg:px-[60px]">
        <RevealOnScroll className="flex flex-col items-start gap-8">
          <div className="flex flex-col items-start gap-2.5 text-left">
            <h1 className="bg-clip-text pb-[0.1em] text-[clamp(1.8rem,4.4vw,3.6rem)] font-medium leading-[1.25] tracking-[0.4px] text-transparent text-gradient-heading">
              Onchain Yield Management
            </h1>
            <p className="bg-clip-text text-[clamp(0.9rem,1.92vw,1.6rem)] leading-[1.3] text-transparent text-gradient-heading">
              Aggregated, Diligenced, Personalized
            </p>
          </div>

          <div className="pointer-events-auto inline-flex gap-2">
            <CtaPill href="#" label="For Asset Issuers" />
            <CtaPill href="#" label="For On Chain Investors" />
          </div>
        </RevealOnScroll>
      </div>

      <HeroStatsPanel />
    </section>
  );
}
