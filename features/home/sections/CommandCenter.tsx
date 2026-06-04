import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionShell } from "@/components/layout/SectionShell";
import { CommandCenterCardShell } from "@/features/home/components/CommandCenterCardShell";
import { CommandCenterFeatureVisual } from "@/features/home/components/CommandCenterFeatureVisual";
import { commandCenterVisualFrameClass } from "@/features/home/components/commandCenterVisualFrame";
import { commandCenterFeatures } from "@/features/home/data/updates";

function FeatureTitle({ title }: { title: string }) {
  const lastSpace = title.lastIndexOf(" ");
  if (lastSpace <= 0) {
    return (
      <h3 className="bg-clip-text text-[clamp(18px,1.6vw,26px)] font-normal leading-[1.3] text-transparent text-gradient-heading-h">
        {title}
      </h3>
    );
  }

  const lead = title.slice(0, lastSpace);
  const tail = title.slice(lastSpace + 1);

  return (
    <h3 className="bg-clip-text text-[clamp(18px,1.6vw,26px)] font-normal leading-[1.3] text-transparent text-gradient-heading-h">
      {lead}{" "}
      <span className="font-extralight tracking-[-0.02em]">{tail}</span>
    </h3>
  );
}

export function CommandCenter() {
  return (
    <SectionShell
      paddingY="none"
      className="flex flex-col py-[clamp(32px,4vw,48px)] lg:h-svh lg:max-h-svh lg:min-h-svh lg:overflow-hidden lg:py-[clamp(20px,3vh,48px)]"
      innerClassName="flex flex-col gap-[clamp(24px,3vw,32px)] lg:min-h-0 lg:flex-1 lg:gap-[clamp(16px,2.2vh,32px)]"
    >
      <RevealOnScroll className="mb-[clamp(16px,2.5vh,28px)] flex w-full max-w-[38rem] shrink-0 flex-col gap-[clamp(20px,3.2vh,32px)] lg:mb-[clamp(12px,1.8vh,20px)]">
        <h2 className="text-section-title bg-clip-text pb-[0.05em] font-normal text-transparent text-gradient-heading">
          Your book,
          <br />
          one command center.
        </h2>
        <p className="text-[clamp(14px,1.2vw,18px)] leading-[1.4] text-ink-subtle">
          Find diligenced deals, track every position, and get alerted when it
          matters. All trustless, all self-custodial.
        </p>
        <CtaPill
          href="#"
          label="Grail CTA"
          className="w-full max-w-[240px] sm:w-[240px]"
        />
      </RevealOnScroll>

      <div className="grid w-full grid-cols-1 items-stretch gap-6 md:grid-cols-3 md:justify-items-center md:gap-[clamp(11px,1.2vw,20px)] lg:min-h-0 lg:flex-1 lg:items-center">
        {commandCenterFeatures.map((feature) => (
          <RevealOnScroll
            key={feature.title}
            className="flex w-full max-md:mx-auto max-md:max-w-[min(100%,28rem)] md:justify-center"
          >
            <CommandCenterCardShell className="w-full md:max-w-[min(396px,34vw)]">
              <div className={commandCenterVisualFrameClass}>
                <CommandCenterFeatureVisual
                  visual={feature.visual}
                  image={feature.image}
                />
              </div>
              <div className="flex shrink-0 flex-col gap-[clamp(9px,0.77vh,13px)] px-1.5">
                <FeatureTitle title={feature.title} />
                <p className="text-[clamp(13px,1vw,17px)] leading-[1.4] text-ink-subtle">
                  {feature.description}
                </p>
              </div>
            </CommandCenterCardShell>
          </RevealOnScroll>
        ))}
      </div>
    </SectionShell>
  );
}
