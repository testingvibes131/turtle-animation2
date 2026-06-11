import { SectionIntro } from "@/components/layout/SectionIntro";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { PartnerMarqueeRow } from "@/features/home/components/PartnerMarqueeRow";
import {
  backedByRow1,
  backedByRow2,
  backedByRow3,
} from "@/features/home/data/backedByPartners";

export function BackedBy() {
  return (
    <section className="relative mx-auto w-full max-w-[1728px] py-[clamp(48px,6vw,96px)]">
      <div className="px-6 md:px-10 lg:px-[100px]">
        <RevealOnScroll>
          <SectionIntro className="items-start">
            <h2 className="bg-clip-text pb-[0.05em] text-left text-[18px] font-normal leading-[1.2] tracking-[-0.4px] lg:text-2xl text-transparent text-gradient-heading">
              Backed by
            </h2>
          </SectionIntro>
        </RevealOnScroll>
      </div>

      <div className="partner-rows mt-[clamp(28px,3.4vw,54px)] flex w-full flex-col">
        <PartnerMarqueeRow partners={backedByRow1} direction="left" />
        <PartnerMarqueeRow partners={backedByRow2} direction="right" phaseCycle={1 / 3} />
        <PartnerMarqueeRow partners={backedByRow3} direction="left" phaseCycle={2 / 3} />
      </div>
    </section>
  );
}
