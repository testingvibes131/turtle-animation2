"use client";

import Image from "next/image";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import type { PipelineStep } from "@/features/home/data/pipelineSteps";

type Props = {
  steps: PipelineStep[];
  activeIndex: number;
};

function slideObjectPosition(index: number, count: number) {
  if (index === 0) return "0% 100%";
  if (index === count - 1) return "100% 100%";
  return "50% 100%";
}

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
            style={{ objectPosition: slideObjectPosition(activeIndex, steps.length) }}
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
                style={{ objectPosition: slideObjectPosition(index, steps.length) }}
              />
            </div>
          );
        })}
      </RevealOnScroll>
    </>
  );
}
