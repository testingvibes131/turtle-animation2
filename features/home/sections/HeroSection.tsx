import { SectionIntro } from "@/components/layout/SectionIntro";
import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { HeroStatsPanel } from "@/features/home/components/HeroStatsPanel";

export function HeroSection() {
  return (
    <section
      data-blob-section="1"
      className="relative z-10 flex w-full flex-col pointer-events-none lg:min-h-[calc(100dvh-var(--site-header-height))]"
    >
      <div className="mx-auto flex w-full max-w-[1728px] flex-col px-6 md:px-10 lg:flex-1 lg:px-[60px]">
        <div className="w-full pt-[clamp(12px,3svh,60px)] lg:flex-1 lg:pt-[clamp(28px,4.5svh,88px)]">
          <RevealOnScroll className="w-full text-center lg:text-left">
            <SectionIntro
              width="none"
              className="items-center gap-0 lg:items-start"
            >
              {/* Desktop clamp caps at 60px (old text-6xl) at the same ~1460px
                  width where the tagline clamp caps, so both scale together. */}
              <h1 className="w-full overflow-visible bg-clip-text pb-[0.08em] text-[35px] font-normal leading-tight tracking-[0.4px] text-transparent text-gradient-heading lg:text-[clamp(2.4rem,4.11vw,3.75rem)] lg:leading-[1.1]">
                <span className="block lg:inline">Onchain</span>{" "}
                <span className="block lg:inline">Yield Management</span>
              </h1>
              {/* Desktop: section-title size. -4px trims the 60px H1's extra
                  internal leading + pb to a ~39px glyph gap — eyeballed against
                  the 25px section-intro rhythm, with extra air for the larger
                  hero type. */}
              <p className="-mt-1 bg-clip-text text-[23px] font-normal leading-[1.4] text-transparent text-gradient-heading lg:mt-[-4px] lg:text-[clamp(1.35rem,2.3vw,2.1rem)] lg:leading-[1.3]">
                Aggregated, Diligenced, Personalized
              </p>
              <div className="pointer-events-auto mt-8 flex flex-wrap justify-center gap-2 lg:mt-7 lg:justify-start">
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
