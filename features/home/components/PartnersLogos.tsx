import { DashedRule } from "@/components/ui/DashedRule";
import { LogoMarquee } from "@/components/ui/LogoMarquee";
import { protocolLogos } from "@/features/home/data/protocolLogos";

/**
 * Partner protocol marquee pinned to the bottom of Section 2.
 */
export function PartnersLogos() {
  return (
    <section
      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 w-full"
      aria-label="Partner protocols"
    >
      <DashedRule />
      <div className="py-[clamp(20px,2.4vw,36px)]">
        <LogoMarquee logos={protocolLogos} />
      </div>
    </section>
  );
}
