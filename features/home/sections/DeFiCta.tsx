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
      innerClassName="flex flex-col items-center justify-center gap-[clamp(40px,5vw,60px)] lg:flex-row lg:items-center"
    >
      <RevealOnScroll className="flex w-full justify-center lg:w-auto">
        <TurtleGreenIllustration />
      </RevealOnScroll>

      <RevealOnScroll className="flex w-full max-w-160 flex-col items-start gap-[clamp(28px,3.5vw,40px)] lg:max-w-none lg:flex-1">
        <div className="flex flex-col gap-[clamp(8px,1vw,10px)]">
          <p className="bg-clip-text text-[clamp(17px,1.6vw,24px)] font-normal leading-[1.4] text-transparent text-gradient-heading-h">
            DeFi promised an upgrade. It delivered a mess. Turtle is the upgrade it was supposed to be:
          </p>
          <p className="bg-clip-text text-[clamp(22px,2.2vw,30px)] font-normal leading-[1.3] text-transparent text-gradient-heading-h">
            Aggregated, Diligenced, Personalized
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-[clamp(16px,2vw,24px)]">
          <CtaPill
            href="#"
            label="For Investors"
            className="w-full min-w-0 rounded-[30px] py-[5px] pl-5 pr-[5px] sm:w-[232px] [&>span:first-child]:text-[clamp(16px,1.2vw,20px)] [&>span:last-child]:size-10"
          />
          <CtaPill
            href="#"
            label="For Asset Issuers"
            className="w-full min-w-0 rounded-[30px] py-[5px] pl-5 pr-[5px] sm:w-auto [&>span:first-child]:text-[clamp(16px,1.2vw,20px)] [&>span:last-child]:size-10"
          />
        </div>
      </RevealOnScroll>
    </SectionShell>
  );
}
