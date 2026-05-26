import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { TerrainExperience } from "@/features/terrain-hero";

export function HeroSection() {
  return (
    <section className="relative w-full">
      <div className="w-full px-6 pt-10 md:px-10 lg:px-[60px]">
        <RevealOnScroll className="flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-2.5 text-center">
            <h1 className="bg-clip-text pb-[0.1em] text-[clamp(1.8rem,4.4vw,3.6rem)] font-medium leading-[1.25] tracking-[0.4px] text-transparent text-gradient-heading">
              Onchain
              <br />
              Yield Management
            </h1>
            <p className="bg-clip-text text-[clamp(0.9rem,1.92vw,1.6rem)] leading-[1.3] text-transparent text-gradient-heading">
              Aggregated, Diligenced, Personalized
            </p>
          </div>

          <div className="inline-flex gap-2">
            <CtaPill href="#" label="For Asset Issuers" />
            <CtaPill href="#" label="For On Chain Investors" variant="primary" />
          </div>
        </RevealOnScroll>
      </div>

      <TerrainExperience />
    </section>
  );
}
