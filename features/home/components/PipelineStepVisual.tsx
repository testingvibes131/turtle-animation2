"use client";

import Image from "next/image";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import type { PipelineStep } from "@/features/home/data/pipelineSteps";

type Props = {
  steps: PipelineStep[];
  activeIndex: number;
};

/** Crossfades pipeline step illustrations (`/pipeline/{StepName}.png`). */
export function PipelineStepVisual({ steps, activeIndex }: Props) {
  const activeStep = steps[activeIndex];

  return (
    <RevealOnScroll
      className="pipeline-visual relative pointer-events-none"
      aria-live="polite"
      aria-label={activeStep ? `${activeStep.title} illustration` : undefined}
    >
      {steps.map((step, index) => {
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;
        const objectPosition = isFirst
          ? "object-left-bottom"
          : isLast
            ? "object-right-bottom"
            : "object-bottom";

        return (
          <div
            key={step.image}
            className="pipeline-visual__slide"
            aria-hidden={index !== activeIndex}
          >
            <Image
              src={step.image}
              alt=""
              fill
              priority={index === 0}
              sizes="(max-width: 1023px) 220px, (max-width: 1535px) 51vw, 1024px"
              className={[
                "object-contain transition-opacity duration-500 ease-out motion-reduce:transition-none",
                objectPosition,
                index === activeIndex ? "opacity-100" : "opacity-0",
              ].join(" ")}
            />
          </div>
        );
      })}
    </RevealOnScroll>
  );
}
