"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { PipelineStepVisual } from "@/features/home/components/PipelineStepVisual";
import { pipelineSteps } from "@/features/home/data/pipelineSteps";
import { usePipelineCardAnchor } from "@/features/home/hooks/usePipelineCardAnchor";
import { usePipelineScroll } from "@/features/home/hooks/usePipelineScroll";

export function Pipeline() {
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const [cardsEl, setCardsEl] = useState<HTMLDivElement | null>(null);
  const setCardsNode = useCallback((node: HTMLDivElement | null) => {
    cardsRef.current = node;
    setCardsEl(node);
  }, []);
  const { sectionRef, selectedIndex, selectCard } = usePipelineScroll(
    pipelineSteps.length,
    cardsEl,
  );
  const anchorX = usePipelineCardAnchor(cardsRef, selectedIndex);
  const [carouselMode, setCarouselMode] = useState(false);

  useEffect(() => {
    const scroller = cardsEl;
    if (!scroller) return;

    const update = () => {
      setCarouselMode(scroller.scrollWidth > scroller.clientWidth + 1);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(scroller);
    window.addEventListener("resize", update, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [cardsEl]);

  return (
    <section
      ref={sectionRef}
      className="scroll-stage pipeline-stage relative mx-auto w-full max-w-[1728px] px-6 pt-[clamp(36px,4vw,64px)] pb-[clamp(56px,8vw,96px)] md:px-10 lg:px-[100px] lg:pt-0 lg:pb-0"
    >
      <div className="scroll-stage-inner pipeline-stage-inner w-full min-h-0">
        <RevealOnScroll className="pipeline-stage-header shrink-0 max-lg:pt-0 lg:pt-14">
          {/* Statement piece: its own mobile step between the hero (35px) and
              the 23px section titles. */}
          <h2 className="mx-auto max-w-none bg-clip-text pb-[0.05em] text-center text-[28px] font-normal leading-[1.2] tracking-[-0.8px] lg:text-4xl text-transparent text-gradient-heading lg:whitespace-nowrap">
            The tools a fund runs on, now yours.
          </h2>
        </RevealOnScroll>

        <div
          className="pipeline-stage-main"
          style={
            anchorX != null
              ? ({
                  "--pipeline-visual-x": `${anchorX}px`,
                } as CSSProperties)
              : undefined
          }
        >
          <PipelineStepVisual steps={pipelineSteps} activeIndex={selectedIndex} />

          <div ref={setCardsNode} className="pipeline-cards mx-auto w-full min-w-0 shrink-0">
            <div className="pipeline-cards__track">
            {pipelineSteps.map((step, index) => {
              const state = index === selectedIndex ? "selected" : "default";
              return (
              <article
                key={step.title}
                data-pipeline-card
                data-pipeline-index={index}
                data-state={state}
                onClick={() => selectCard(index)}
                onKeyDown={
                  carouselMode
                    ? undefined
                    : (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectCard(index);
                        }
                      }
                }
                role={carouselMode ? undefined : "button"}
                tabIndex={carouselMode ? undefined : 0}
                className="pipeline-card group flex flex-col items-start justify-between gap-[clamp(10px,1vw,14px)] rounded-2xl border border-[var(--stroke-default)] max-lg:cursor-default lg:cursor-pointer"
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
                  {/* Mobile matches the DeFi-CTA intro line (18px), a step
                      below the 23px section/card-title size. */}
                  <h3 className="pipeline-card-title text-[18px] font-normal leading-[1.3] tracking-[0.015em] lg:text-2xl">
                    {step.title}
                  </h3>
                  <div className="pipeline-card-body-wrap">
                    <p
                      className="pipeline-card-body"
                      style={{
                        fontSize: "clamp(14px, 1.05vw, 16px)",
                        lineHeight: 1.4,
                        color: "var(--ink-muted)",
                      }}
                    >
                      {step.body}
                    </p>
                  </div>
                </div>
              </article>
              );
            })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
