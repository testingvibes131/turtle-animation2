import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionShell } from "@/components/layout/SectionShell";
import { CommandCenterCardShell } from "@/features/home/components/CommandCenterCardShell";
import { CommandCenterFeatureVisual } from "@/features/home/components/CommandCenterFeatureVisual";
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
      className="flex h-svh max-h-svh min-h-svh flex-col overflow-hidden py-[clamp(20px,3vh,48px)]"
      innerClassName="flex min-h-0 flex-1 flex-col gap-[clamp(16px,2.2vh,32px)]"
    >
      <RevealOnScroll className="flex max-w-[38rem] shrink-0 flex-col gap-[clamp(12px,1.4vh,20px)]">
        <h2 className="bg-clip-text pb-[0.05em] text-4xl font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading">
          Your book,
          <br />
          one command center.
        </h2>
        <p className="text-[clamp(14px,1.2vw,18px)] leading-[1.4] text-ink-subtle">
          Find diligenced deals, track every position, and get alerted when it
          matters. All trustless, all self-custodial.
        </p>
        <CtaPill href="#" label="Grail CTA" className="w-[240px]" />
      </RevealOnScroll>

      <div className="grid min-h-0 flex-1 grid-cols-3 items-center justify-items-center gap-[clamp(11px,1.2vw,20px)]">
        {commandCenterFeatures.map((feature) => (
          <RevealOnScroll key={feature.title} className="flex w-full justify-center">
            <CommandCenterCardShell className="w-full max-w-[min(396px,34vw)]">
              <div
                className="relative w-full shrink-0 overflow-hidden rounded-[clamp(9px,0.77vw,12px)]"
                style={{
                  aspectRatio: "570 / 499",
                  maxHeight: "min(330px, 38.5vh)",
                }}
              >
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
