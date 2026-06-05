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

  const track = [...partners, ...partners, ...partners, ...partners].map(
    (partner, index) => ({
      ...partner,
      key: `${partner.logoKey}-${index}`,
      hidden: index >= partners.length,
    }),
  );

  return (
    <div className="partner-marquee" data-direction={direction}>
      <div
        className="partner-marquee__track"
        style={phaseDelay ? { animationDelay: phaseDelay } : undefined}
      >
        {track.map((partner) => (
          <div
            key={partner.key}
            className="partner-card"
            aria-hidden={partner.hidden}
          >
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
