import Image from "next/image";
import { DashedRule } from "@/components/ui/DashedRule";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import {
  backedByRow1,
  backedByRow2,
  backedByRow3,
  type BackedByPartner,
} from "@/features/home/data/backedByPartners";

type PartnerMarqueeRowProps = {
  partners: BackedByPartner[];
  direction: "left" | "right";
};

function PartnerMarqueeRow({ partners, direction }: PartnerMarqueeRowProps) {
  const track = [...partners, ...partners, ...partners, ...partners].map(
    (partner, index) => ({
      ...partner,
      key: `${partner.logoKey}-${index}`,
      hidden: index >= partners.length,
    }),
  );

  return (
    <div className="partner-marquee" data-direction={direction}>
      <div className="partner-marquee__track">
        {track.map((partner) => (
          <div key={partner.key} className="partner-card" aria-hidden={partner.hidden}>
            <Image
              src={partner.src}
              alt={partner.hidden ? "" : partner.alt}
              width={217}
              height={100}
              className="partner-logo"
              data-logo={partner.logoKey}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BackedBy() {
  return (
    <section
      className="relative mx-auto w-full max-w-[1728px]"
      style={{
        paddingTop: "clamp(48px, 6vw, 96px)",
        paddingBottom: "clamp(48px, 6vw, 96px)",
      }}
    >
      <DashedRule />
      <div className="px-6 md:px-10 lg:px-[60px]">
        <RevealOnScroll>
          <h2
            className="mx-auto max-w-[22ch] bg-clip-text pb-[0.05em] text-center text-4xl font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading"
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
        <PartnerMarqueeRow partners={backedByRow1} direction="left" />
        <PartnerMarqueeRow partners={backedByRow2} direction="right" />
        <PartnerMarqueeRow partners={backedByRow3} direction="left" />
      </div>
    </section>
  );
}
