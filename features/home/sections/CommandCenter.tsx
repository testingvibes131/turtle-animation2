"use client";

import { SectionIntro, SectionIntroCopy } from "@/components/layout/SectionIntro";
import { SectionShell } from "@/components/layout/SectionShell";
import { CtaPill } from "@/components/ui/CtaPill";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import {
  CommandCenterCardShell,
  commandCenterCardCopyClass,
  commandCenterCardFooterClass,
} from "@/features/home/components/CommandCenterCardShell";
import { CommandCenterFeatureVisual } from "@/features/home/components/CommandCenterFeatureVisual";
import { commandCenterVisualFrameClass } from "@/features/home/components/commandCenterVisualFrame";
import { commandCenterFeatures } from "@/features/home/data/updates";

function FeatureTitle({ title }: { title: string }) {
  const lastSpace = title.lastIndexOf(" ");
  if (lastSpace <= 0) {
    return (
      <h3 className="bg-clip-text text-[23px] font-normal leading-[1.3] tracking-[0.015em] text-transparent text-gradient-heading-h lg:text-2xl">
        {title}
      </h3>
    );
  }

  const lead = title.slice(0, lastSpace);
  const tail = title.slice(lastSpace + 1);

  return (
    <h3 className="bg-clip-text text-[23px] font-normal leading-[1.3] tracking-[0.015em] text-transparent text-gradient-heading-h lg:text-2xl">
      {lead}{" "}
      <span className="font-extralight tracking-[0.01em]">{tail}</span>
    </h3>
  );
}

export function CommandCenter() {
  return (
    <SectionShell
      paddingY="none"
      className="flex flex-col mt-[clamp(40px,6vh,80px)] pt-[clamp(48px,6vw,64px)] pb-[clamp(32px,4vw,48px)] lg:mt-[clamp(56px,8vh,112px)] lg:h-svh lg:max-h-svh lg:min-h-svh lg:overflow-hidden lg:pt-[clamp(32px,4vh,64px)] lg:pb-[clamp(20px,3vh,48px)]"
      innerClassName="flex flex-col gap-[clamp(24px,3vw,32px)] lg:min-h-0 lg:flex-1 lg:gap-[clamp(16px,2.2vh,32px)]"
    >
      <RevealOnScroll className="shrink-0">
        <SectionIntro width="38">
          <h2 className="text-section-title bg-clip-text pb-[0.05em] font-normal text-transparent text-gradient-heading">
            Your book,
            <br />
            one command center.
          </h2>
          <SectionIntroCopy>
            <p>
              Find diligenced deals, track every position, and get alerted when it
              matters. All trustless, all self-custodial.
            </p>
          </SectionIntroCopy>
          {/* self-start: hug the label (the intro column stretches children). */}
          <CtaPill
            href="#"
            label="Manage Assets with Turtle"
            className="section-intro__cta self-start"
          />
        </SectionIntro>
      </RevealOnScroll>

      <div className="grid w-full grid-cols-1 items-stretch gap-6 md:grid-cols-3 md:justify-items-center md:gap-[clamp(22px,1.2vw,24px)] lg:min-h-0 lg:flex-1 lg:items-center">
        {commandCenterFeatures.map((feature, index) => (
          <RevealOnScroll
            key={feature.title}
            delayMs={index * 120}
            className="flex w-full max-md:mx-auto max-md:max-w-[min(100%,28rem)] md:justify-center"
          >
            <CommandCenterCardShell className="w-full md:max-w-[min(448px,34vw,46.8svh)]">
              <CommandCenterFeatureVisual
                visual={feature.visual}
                image={feature.image}
                frameClassName={commandCenterVisualFrameClass}
              />
              <div className={commandCenterCardFooterClass}>
                <div className={commandCenterCardCopyClass}>
                  <FeatureTitle title={feature.title} />
                  <p className="line-clamp-3 min-h-[3lh] leading-[1.4] tracking-[0.02em] text-ink-subtle">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CommandCenterCardShell>
          </RevealOnScroll>
        ))}
      </div>
    </SectionShell>
  );
}
