import Image from "next/image";
import type { BackedByPartner } from "@/features/home/data/backedByPartners";

type PartnerMarqueeRowProps = {
  partners: BackedByPartner[];
  direction: "left" | "right";
  /** Negative animation-delay offset (ms) so rows do not reset in sync. */
  phaseMs?: number;
};

export function PartnerMarqueeRow({
  partners,
  direction,
  phaseMs = 0,
}: PartnerMarqueeRowProps) {
  const phaseDelay =
    phaseMs > 0 ? `${-(phaseMs / 1000)}s` : undefined;

  return (
    <div className="partner-marquee" data-direction={direction}>
      <div
        className="partner-marquee__track"
        style={phaseDelay ? { animationDelay: phaseDelay } : undefined}
      >
        {[0, 1].map((setIndex) => (
          <div
            key={setIndex}
            className="partner-marquee__set"
            aria-hidden={setIndex > 0 || undefined}
          >
            {partners.map((partner) => (
              <div key={`${setIndex}-${partner.logoKey}`} className="partner-card">
                <Image
                  src={partner.src}
                  alt={setIndex > 0 ? "" : partner.alt}
                  width={217}
                  height={100}
                  className="partner-logo"
                  data-logo={partner.logoKey}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
