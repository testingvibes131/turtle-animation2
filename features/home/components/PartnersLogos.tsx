import { DashedRule } from "@/components/ui/DashedRule";
import { LogoMarquee } from "@/components/ui/LogoMarquee";
import { protocolLogos } from "@/features/home/data/protocolLogos";

type PartnersLogosProps = {
  /** `flow`: follows copy in document order. `pinned`: bottom of section 2 (desktop). */
  variant?: "flow" | "pinned" | "overlay";
  className?: string;
};

/**
 * Partner protocol marquee at the bottom of Section 2.
 */
export function PartnersLogos({
  variant = "overlay",
  className = "",
}: PartnersLogosProps) {
  return (
    <section
      className={[
        // No base w-full: it would override the flow variant's breakout
        // width (same-specificity width utilities), leaving the strip flush
        // left but inset on the right. Desktop deliberately stays at lg:w-full
        // (yesterday's exact geometry): widening the three continuously
        // animating marquee rows to true edge-to-edge measurably janked
        // Safari's scroll compositing (blind-tested), and the full-bleed fix
        // was only ever needed on mobile.
        "pointer-events-none z-10",
        variant === "flow" &&
          "relative -mx-6 w-[calc(100%+3rem)] md:-mx-10 md:w-[calc(100%+5rem)] lg:-mx-[100px] lg:w-full",
        variant === "pinned" && "absolute inset-x-0 bottom-0 w-full",
        variant === "overlay" && "absolute inset-x-0 bottom-0 w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Partner protocols"
    >
      <DashedRule />
      <div className="py-[clamp(12px,2vh,20px)] lg:py-[clamp(20px,2.4vw,36px)]">
        <LogoMarquee logos={protocolLogos} />
      </div>
      <DashedRule />
    </section>
  );
}
