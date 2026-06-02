"use client";

import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { PipelineRadarCanvas } from "@/features/home/components/PipelineRadarCanvas";
import { pipelineSteps } from "@/features/home/data/pipelineSteps";
import { usePipelineScroll } from "@/features/home/hooks/usePipelineScroll";

export function Pipeline() {
  const { sectionRef, selectedIndex, selectCard } = usePipelineScroll(
    pipelineSteps.length,
  );

  return (
    <section
      ref={sectionRef}
      className="scroll-stage relative mx-auto w-full max-w-[1728px] px-6 py-[clamp(36px,4vw,64px)] md:px-10 lg:px-[100px]"
    >
      <div className="scroll-stage-inner w-full">
        <RevealOnScroll>
          <h2 className="mx-auto max-w-[22ch] bg-clip-text pb-[0.05em] text-center text-[clamp(1.5rem,2.8vw,2.5rem)] font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading">
            The tools a fund
            <br />
            runs on, now yours.
          </h2>
        </RevealOnScroll>

        <div className="mx-auto mt-[clamp(16px,2vw,32px)] w-full">
          <PipelineRadarCanvas />
        </div>

        <div className="pipeline-cards mt-[clamp(16px,1.6vw,28px)] flex w-full flex-col gap-[clamp(8px,0.8vw,10px)] lg:flex-row lg:items-stretch">
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
                className={[
                  "pipeline-card group flex w-full cursor-pointer flex-col items-start justify-between rounded-2xl border border-white/10",
                  state === "selected"
                    ? "bg-gradient-to-b from-[#141514] to-[#1b1c1b]"
                    : "",
                ].join(" ")}
                style={{
                  padding: "clamp(14px, 1.4vw, 20px)",
                  height: "clamp(160px, 14vw, 200px)",
                  transition:
                    "flex-basis 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease",
                }}
              >
                <span className="pipeline-dot" />
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
    </section>
  );
}
