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
                priority={index === 0}
                sizes="(max-width: 1535px) 51vw, 1024px"
                className={[
                  "object-contain transition-opacity duration-500 ease-out motion-reduce:transition-none",
                  isActive ? "opacity-100" : "opacity-0",
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
