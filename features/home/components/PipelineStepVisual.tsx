"use client";

import Image from "next/image";
import type { PipelineStep } from "@/features/home/data/pipelineSteps";

type Props = {
  steps: PipelineStep[];
  activeIndex: number;
};

/** Crossfades pipeline step illustrations (`/pipeline/1.png` … `5.png`). */
export function PipelineStepVisual({ steps, activeIndex }: Props) {
  const activeStep = steps[activeIndex];

  return (
    <div
      className="pipeline-visual relative overflow-hidden pointer-events-none"
      aria-live="polite"
      aria-label={activeStep ? `${activeStep.title} illustration` : undefined}
    >
      {steps.map((step, index) => (
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
            sizes="(max-width: 1024px) 92vw, 709px"
            className={[
              "object-contain object-center transition-opacity duration-500 ease-out motion-reduce:transition-none",
              index === activeIndex ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        </div>
      ))}
    </div>
  );
}
