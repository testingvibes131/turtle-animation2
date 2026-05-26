import Image from "next/image";
import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

export function RadarCta() {
  return (
    <section className="relative w-full px-6 py-[clamp(32px,4vw,64px)] pb-[clamp(120px,14vw,220px)] md:px-10 lg:px-[100px]">
      <RevealOnScroll className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-[clamp(24px,3.5vw,40px)]">
        <div className="relative mx-auto flex w-full max-w-[clamp(640px,80vw,965px)] justify-center">
          <Image
            src="/cta/radar-illustration.png"
            alt=""
            width={965}
            height={400}
            className="pointer-events-none block h-auto w-full select-none"
          />
          <div className="absolute bottom-0 left-0 right-0 border-b border-stone-50/10" aria-hidden="true" />
        </div>

        <p className="max-w-[36ch] bg-clip-text text-center text-body-big font-normal text-transparent text-gradient-heading">
          DeFi promised an upgrade. It delivered a mess.
          <br />
          Turtle is the upgrade it was supposed to be: aggregated, diligenced, personalized.
        </p>

        <div className="inline-flex flex-wrap justify-center gap-2.5">
          <CtaPill href="#" label="Explore Deals" className="w-[240px]" />
          <CtaPill href="#" label="Launch with Turtle" variant="primary" className="w-[240px]" />
        </div>
      </RevealOnScroll>
    </section>
  );
}
