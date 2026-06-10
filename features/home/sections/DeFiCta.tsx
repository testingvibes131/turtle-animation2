import { SectionIntro } from "@/components/layout/SectionIntro";
import { SectionShell } from "@/components/layout/SectionShell";
import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { TurtleGreenIllustration } from "@/features/home/components/TurtleGreenIllustration";

/** Figma Sixth-Section (1282:81060) — audience CTA below Team. */
export function DeFiCta() {
  return (
    <SectionShell
      paddingY="none"
      className="py-[clamp(80px,10vw,150px)]"
      innerClassName="mx-auto flex w-fit max-w-full flex-col gap-[clamp(48px,8vh,72px)] lg:flex-row lg:items-center lg:gap-[clamp(48px,5vw,80px)]"
    >
      <RevealOnScroll className="flex shrink-0 justify-center lg:w-auto">
        <TurtleGreenIllustration />
      </RevealOnScroll>

      {/* min-w-0 + wrapping text: the w-fit row sizes to one line where it
          fits and wraps (still centred) where it doesn't — a nowrap line just
          cropped at the viewport edge on smaller screens. */}
      <RevealOnScroll className="min-w-0 text-left">
        <SectionIntro className="max-w-none items-start">
          <p className="bg-clip-text text-[clamp(17px,1.6vw,24px)] font-normal leading-[1.4] text-transparent text-gradient-heading-h">
            DeFi promised an upgrade. It delivered a mess. Turtle is the upgrade it was supposed to be:
          </p>
          <p className="bg-clip-text text-[clamp(22px,2.2vw,30px)] font-normal leading-[1.3] text-transparent text-gradient-heading-h">
            Aggregated, Diligenced, Personalized
          </p>

          <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
            <CtaPill href="#" label="For Investors" />
            <CtaPill href="#" label="For Asset Issuers" />
          </div>
        </SectionIntro>
      </RevealOnScroll>
    </SectionShell>
  );
}
