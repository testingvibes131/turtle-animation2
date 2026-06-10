import Image from "next/image";
import { marqueeDurationSec } from "@/components/ui/LogoMarquee";
import type { BackedByPartner } from "@/features/home/data/backedByPartners";

type PartnerMarqueeRowProps = {
  partners: BackedByPartner[];
  direction: "left" | "right";
  /** Fraction of the animation cycle to offset this row (keeps rows out of sync). */
  phaseCycle?: number;
};

export function PartnerMarqueeRow({
  partners,
  direction,
  phaseCycle = 0,
}: PartnerMarqueeRowProps) {
  // Four track copies + -50% keyframe => half-loop spans two partner sets.
  const durationSec = marqueeDurationSec(partners.length, 2);
  const phaseDelay =
    phaseCycle > 0 ? `${-(phaseCycle * durationSec)}s` : undefined;

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
        style={{
          animationDuration: `${durationSec}s`,
          ...(phaseDelay ? { animationDelay: phaseDelay } : {}),
        }}
      >
        {track.map((partner) => (
          <div
            key={partner.key}
            className="partner-card"
            aria-hidden={partner.hidden}
          >
            {/* Eager: lazy copies paint late as the track slides them in,
                which reads as a glitch. Copies share cached srcs, so cheap. */}
            <Image
              src={partner.src}
              alt={partner.hidden ? "" : partner.alt}
              width={189}
              height={105}
              className="partner-logo"
              loading="eager"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
