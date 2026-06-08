import { DashedRule } from "@/components/ui/DashedRule";
import { LogoMarquee } from "@/components/ui/LogoMarquee";
import { protocolLogos } from "@/features/home/data/protocolLogos";

type PartnersLogosProps = {
  /** `flow`: follows copy in document order. `pinned`: bottom of section 2 (desktop). */
  variant?: "flow" | "pinned" | "overlay";
};

/**
 * Partner protocol marquee at the bottom of Section 2.
 */
export function PartnersLogos({ variant = "overlay" }: PartnersLogosProps) {
  return (
    <section
      className={[
        "pointer-events-none z-10 w-full",
        variant === "flow" &&
          "relative shrink-0 -mx-6 w-[calc(100%+3rem)] md:-mx-10 md:w-[calc(100%+5rem)] lg:-mx-[100px] lg:w-[calc(100%+200px)]",
        variant === "pinned" && "absolute inset-x-0 bottom-0",
        variant === "overlay" && "absolute inset-x-0 bottom-0",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Partner protocols"
    >
      <DashedRule />
      <div className="py-[clamp(20px,2.4vw,36px)]">
        <LogoMarquee logos={protocolLogos} />
      </div>
      <DashedRule />
    </section>
  );
}
