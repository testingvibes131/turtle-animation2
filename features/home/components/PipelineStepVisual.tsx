"use client";

import Image from "next/image";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import type { PipelineStep } from "@/features/home/data/pipelineSteps";

type Props = {
  steps: PipelineStep[];
  activeIndex: number;
};

// Every slide centres its artwork in the box: positions come from the
// even rail (.pipeline-visual), so edge-pinning the end slides (the old
// full-bleed design) would make the VISIBLE monitors unevenly spaced —
// the end exports carry big internal slack that 0%/100% shoved outward.

/** Crossfades pipeline step illustrations (`/pipeline/{StepName}.png`). */
export function PipelineStepVisual({ steps, activeIndex }: Props) {
  const activeStep = steps[activeIndex];
  const ariaLabel = activeStep ? `${activeStep.title} illustration` : undefined;

  return (
    <>
      {/* Mobile: warm every step image on first load so switching cards is instant
          (not slow-on-scroll). Hidden + eager so they fetch + cache up front. */}
      <div
        aria-hidden
        className="pointer-events-none h-0 w-0 overflow-hidden opacity-0 lg:hidden"
      >
        {steps.map((step) => (
          <Image
            key={`warm-${step.image}`}
            src={step.image}
            alt=""
            width={420}
            height={420}
            loading="eager"
            sizes="420px"
          />
        ))}
      </div>
      {/* Mobile: single keyed image — stacked opacity layers are unreliable on iOS Safari. */}
      <div
        className="pipeline-visual pointer-events-none lg:hidden"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        <div className="pipeline-visual__slide">
          <Image
            key={activeStep.image}
            src={activeStep.image}
            alt=""
            fill
            priority
            sizes="420px"
            className="object-contain"
            /* Mobile fits by height with one centered slide; edge-bracket
               pinning (slideObjectPosition) stays desktop-only. */
            style={{ objectPosition: "50% 100%" }}
          />
        </div>
      </div>

      {/* Desktop: crossfade stack */}
      <RevealOnScroll
        className="pipeline-visual pointer-events-none hidden lg:block"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        {steps.map((step, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={step.image}
              className={[
                "pipeline-visual__slide",
                isActive ? "z-1" : "z-0",
              ].join(" ")}
              aria-hidden={!isActive}
            >
              <Image
                src={step.image}
                alt=""
                fill
                loading="eager"
                sizes="(max-width: 1535px) 51vw, 1024px"
                className={[
                  // Only the incoming slide fades in; the outgoing one cuts to 0
                  // instantly (no transition). So at most one slide is ever
                  // visible — no two-image overlap, hence no ghosting/double-monitor.
                  "object-contain motion-reduce:transition-none",
                  isActive
                    ? "opacity-100 transition-opacity duration-[250ms] ease-out"
                    : "opacity-0",
                ].join(" ")}
                style={{ objectPosition: "50% 100%" }}
              />
            </div>
          );
        })}
      </RevealOnScroll>
    </>
  );
}
