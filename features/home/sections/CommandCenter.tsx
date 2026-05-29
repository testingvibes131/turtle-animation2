import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionShell } from "@/components/layout/SectionShell";
import { CommandCenterCardShell } from "@/features/home/components/CommandCenterCardShell";
import { CommandCenterFeatureVisual } from "@/features/home/components/CommandCenterFeatureVisual";
import { commandCenterFeatures } from "@/features/home/data/updates";

export function CommandCenter() {
  return (
    <SectionShell>
      <div className="grid grid-cols-1 gap-[clamp(48px,6vw,80px)] lg:grid-cols-2 lg:gap-x-[clamp(32px,5vw,76px)]">
        <RevealOnScroll className="flex max-w-[38rem] flex-col gap-[clamp(20px,2.4vw,32px)] lg:sticky lg:top-[clamp(80px,10vh,120px)] lg:self-start">
          <h2 className="bg-clip-text pb-[0.05em] text-[clamp(1.5rem,2.8vw,2.5rem)] font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading">
            Your book,
            <br />
            one command center.
          </h2>
          <p className="text-[clamp(15px,1.3vw,19px)] leading-[1.4] text-ink-subtle">
            Find diligenced deals, track every position, and get alerted when it
            matters. All trustless, all self-custodial.
          </p>
          <CtaPill href="#" label="Gral CTA" className="w-[240px]" />
        </RevealOnScroll>

        <div className="flex flex-col gap-[clamp(16px,1.4vw,20px)] lg:items-end">
          {commandCenterFeatures.map((feature) => (
            <RevealOnScroll key={feature.title}>
              <CommandCenterCardShell>
                <div
                  className="relative w-full overflow-hidden rounded-[clamp(10px,0.9vw,13px)]"
                  style={{ aspectRatio: "570 / 499" }}
                >
                  <CommandCenterFeatureVisual
                    visual={feature.visual}
                    image={feature.image}
                  />
                </div>
                <div className="flex flex-col gap-[clamp(10px,1vw,16px)] px-2.5">
                  <h3 className="bg-clip-text text-[clamp(20px,2.1vw,30px)] font-normal leading-[1.3] text-transparent text-gradient-heading-h">
                    {feature.title}
                  </h3>
                  <p className="text-[clamp(14px,1.05vw,16px)] leading-[1.4] text-ink-subtle">
                    {feature.description}
                  </p>
                </div>
              </CommandCenterCardShell>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
