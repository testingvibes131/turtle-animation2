import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { PartnerMarqueeRow } from "@/features/home/components/PartnerMarqueeRow";
import {
  backedByRow1,
  backedByRow2,
  backedByRow3,
} from "@/features/home/data/backedByPartners";

export function BackedBy() {
  return (
    <section
      className="relative mx-auto w-full max-w-[1728px]"
      style={{
        paddingTop: "clamp(48px, 6vw, 96px)",
        paddingBottom: "clamp(48px, 6vw, 96px)",
      }}
    >
      <div className="px-6 md:px-10 lg:px-[60px]">
        <RevealOnScroll>
          <h2
            className="bg-clip-text pb-[0.05em] text-left text-lg font-normal leading-[1.2] tracking-[-0.4px] text-transparent text-gradient-heading"
            style={{ paddingTop: "clamp(24px, 3vw, 56px)" }}
          >
            Backed by
          </h2>
        </RevealOnScroll>
      </div>

      <div
        className="partner-rows mt-[clamp(40px,5vw,80px)] flex w-full flex-col"
        style={{ gap: "clamp(12px, 1.2vw, 20px)" }}
      >
        <PartnerMarqueeRow partners={backedByRow1} direction="left" phaseMs={0} />
        <PartnerMarqueeRow partners={backedByRow2} direction="right" phaseMs={20_000} />
        <PartnerMarqueeRow partners={backedByRow3} direction="left" phaseMs={40_000} />
      </div>
    </section>
  );
}
