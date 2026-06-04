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
      innerClassName="flex flex-col items-center justify-center gap-[clamp(48px,8vh,72px)] lg:flex-row lg:items-center lg:gap-[clamp(48px,5vw,80px)]"
    >
      <RevealOnScroll className="flex w-full shrink-0 justify-center lg:w-auto">
        <TurtleGreenIllustration />
      </RevealOnScroll>

      <RevealOnScroll className="flex w-full max-w-[36rem] flex-col items-start gap-[clamp(20px,3.2vh,28px)] text-left max-lg:max-w-full lg:max-w-none lg:flex-1">
        <p className="bg-clip-text text-[clamp(17px,1.6vw,24px)] font-normal leading-[1.4] text-transparent text-gradient-heading-h">
          DeFi promised an upgrade. It delivered a mess. Turtle is the upgrade it was supposed to be:
        </p>
        <p className="bg-clip-text text-[clamp(22px,2.2vw,30px)] font-normal leading-[1.3] text-transparent text-gradient-heading-h">
          Aggregated, Diligenced, Personalized
        </p>

        <div className="flex w-full max-w-full flex-row flex-nowrap items-center justify-start gap-2 max-lg:px-1 lg:flex-wrap lg:gap-[clamp(16px,2vw,24px)]">
          <CtaPill
            href="#"
            label="For Investors"
            className="min-w-0 shrink rounded-[30px] py-[5px] pl-3 pr-[5px] max-lg:[&>span:first-child]:text-sm max-lg:[&>span:last-child]:size-8 lg:pl-5 lg:[&>span:first-child]:text-lg lg:[&>span:last-child]:size-10"
          />
          <CtaPill
            href="#"
            label="For Asset Issuers"
            className="min-w-0 shrink rounded-[30px] py-[5px] pl-3 pr-[5px] max-lg:[&>span:first-child]:text-sm max-lg:[&>span:last-child]:size-8 lg:pl-5 lg:[&>span:first-child]:text-lg lg:[&>span:last-child]:size-10"
          />
        </div>
      </RevealOnScroll>
    </SectionShell>
  );
}
