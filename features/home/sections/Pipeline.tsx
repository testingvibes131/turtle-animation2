"use client";

import { useRef, type CSSProperties } from "react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { PipelineStepVisual } from "@/features/home/components/PipelineStepVisual";
import { pipelineSteps } from "@/features/home/data/pipelineSteps";
import { usePipelineCardAnchor } from "@/features/home/hooks/usePipelineCardAnchor";
import { usePipelineScroll } from "@/features/home/hooks/usePipelineScroll";

export function Pipeline() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const { sectionRef, selectedIndex, selectCard } = usePipelineScroll(
    pipelineSteps.length,
  );
  const anchorX = usePipelineCardAnchor(cardsRef, selectedIndex);

  return (
    <section
      ref={sectionRef}
      className="scroll-stage pipeline-stage relative mx-auto w-full max-w-[1728px] px-6 py-[clamp(36px,4vw,64px)] md:px-10 lg:px-[100px] lg:py-0"
    >
      <div className="scroll-stage-inner pipeline-stage-inner w-full min-h-0">
        <RevealOnScroll className="pipeline-stage-header shrink-0 pt-14">
          <h2 className="mx-auto max-w-none bg-clip-text pb-[0.05em] text-center text-4xl font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading lg:whitespace-nowrap">
            The tools a fund runs on, now yours.
          </h2>
        </RevealOnScroll>

        <div
          className="pipeline-stage-main"
          style={
            anchorX != null
              ? ({ "--pipeline-visual-x": `${anchorX}px` } as CSSProperties)
              : undefined
          }
        >
          <PipelineStepVisual steps={pipelineSteps} activeIndex={selectedIndex} />

          <div
            ref={cardsRef}
            className="pipeline-cards mx-auto flex w-full shrink-0 flex-col gap-[clamp(8px,0.8vw,10px)] lg:flex-row lg:items-stretch"
          >
            {pipelineSteps.map((step, index) => {
              const state = index === selectedIndex ? "selected" : "default";
              return (
              <article
                key={step.title}
                data-pipeline-card
                data-state={state}
                onClick={() => selectCard(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectCard(index);
                  }
                }}
                role="button"
                tabIndex={0}
                className="pipeline-card group flex w-full cursor-pointer flex-col items-start justify-between rounded-2xl border border-white/10"
                style={{
                  padding: "clamp(14px, 1.4vw, 20px)",
                  height: "clamp(160px, 14vw, 209px)",
                  transition:
                    "flex-basis 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease",
                }}
              >
                <svg
                  className="pipeline-dot"
                  viewBox="0 0 20 20"
                  aria-hidden
                >
                  <circle
                    cx="10"
                    cy="10"
                    r="9.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <circle cx="10" cy="10" r="6" fill="currentColor" />
                </svg>
                <div
                  className="flex w-full flex-col"
                  style={{ gap: "clamp(6px, 0.6vw, 10px)" }}
                >
                  <h3
                    className="pipeline-card-title font-normal"
                    style={{ fontSize: "clamp(20px, 2.1vw, 30px)", lineHeight: 1.3 }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="pipeline-card-body"
                    style={{
                      fontSize: "clamp(14px, 1.05vw, 16px)",
                      lineHeight: 1.4,
                      color: "rgba(239, 248, 237, 0.5)",
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
