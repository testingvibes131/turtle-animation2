"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { SectionIntro } from "@/components/layout/SectionIntro";
import { SectionShell } from "@/components/layout/SectionShell";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { CaseStudyBoostedTvlChartSvg } from "@/features/home/components/CaseStudyBoostedTvlChartSvg";
import { CaseStudyThirdCard } from "@/features/home/components/CaseStudyThirdCard";
import { CaseStudyTvlChartSvg } from "@/features/home/components/CaseStudyTvlChartSvg";
import { UnionCardShell } from "@/features/home/components/UnionCardShell";
import {
  CASE_STUDY_TVL_CARD_DIVIDER_RATIO,
  CASE_STUDY_TVL_CARD_SHELL_PATH,
  CASE_STUDY_TVL_CARD_SHELL_VIEWBOX,
} from "@/features/home/components/caseStudyTvlCardShellPath";
import {
  CASE_STUDY_VERTICAL_CARD_DIVIDER_RATIO,
  CASE_STUDY_VERTICAL_CARD_SHELL_PATH,
  CASE_STUDY_VERTICAL_CARD_SHELL_VIEWBOX,
} from "@/features/home/components/caseStudyVerticalCardShellPath";
import {
  caseStudyCardsStackClass,
  caseStudyThirdCardContentClass,
  caseStudyTvlCardContentClass,
  caseStudyVerticalCardContentClass,
} from "@/features/home/components/caseStudyCardFrame";
import { caseStudies, sortAprBadgesByApy } from "@/features/home/data/caseStudies";

const COUNTER_DURATION_MS = 1100;

function counterEase(t: number) {
  return 1 - (1 - t) ** 3;
}

function animateCounter(
  el: HTMLElement,
  target: number,
  prefix: string,
  suffix: string,
  decimals: number,
) {
  const startedAt = performance.now();

  const tick = (now: number) => {
    const t = Math.min(1, (now - startedAt) / COUNTER_DURATION_MS);
    const eased = counterEase(t);
    const value = (target * eased).toFixed(decimals);
    el.textContent = `${prefix}${value}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function animateApyRange(
  el: HTMLElement,
  minTarget: number,
  maxTarget: number,
  minDecimals: number,
  maxDecimals: number,
  suffix: string,
) {
  const startedAt = performance.now();

  const tick = (now: number) => {
    const t = Math.min(1, (now - startedAt) / COUNTER_DURATION_MS);
    const eased = counterEase(t);
    const min = (minTarget * eased).toFixed(minDecimals);
    const max = (maxTarget * eased).toFixed(maxDecimals);
    el.textContent = `${min}-${max}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function animateMetric(el: HTMLElement) {
  if (el.dataset.counterKind === "range") {
    animateApyRange(
      el,
      parseFloat(el.dataset.minTarget ?? "0"),
      parseFloat(el.dataset.maxTarget ?? "0"),
      parseInt(el.dataset.minDecimals ?? "0", 10),
      parseInt(el.dataset.maxDecimals ?? "0", 10),
      el.dataset.suffix ?? "",
    );
    return;
  }

  animateCounter(
    el,
    parseFloat(el.dataset.target ?? "0"),
    el.dataset.prefix ?? "",
    el.dataset.suffix ?? "",
    (el.dataset.target?.split(".")[1] ?? "").length,
  );
}

export function CaseStudies() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const runAnimation = () => {
    const cardsRoot = cardsRef.current;
    if (!cardsRoot) return;

    flushSync(() => setAnimating(false));
    flushSync(() => {
      setAnimationKey((key) => key + 1);
      setAnimating(true);
    });

    cardsRoot.querySelectorAll<HTMLElement>("[data-counter]").forEach(animateMetric);
  };

  useEffect(() => {
    const cardsRoot = cardsRef.current;
    if (!cardsRoot) return;

    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            runAnimation();
            io.disconnect();
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    io.observe(cardsRoot);
    return () => io.disconnect();
  }, []);

  const selectPill = (index: number) => {
    flushSync(() => setSelectedIndex(index));
    runAnimation();
  };

  const activeStudy = caseStudies[selectedIndex];

  return (
    <SectionShell>
      <div className="flex flex-col gap-[clamp(40px,5vw,64px)]">
        <RevealOnScroll>
          <SectionIntro>
            <h2 className="text-section-title bg-clip-text pb-[0.05em] font-normal text-transparent text-gradient-heading">
              See the track record
              <br />
              before you commit a dollar
            </h2>
            <p>
              The receipts speak for themselves.
              <br />
              Check the case studies, see the history, swim with the whales.
            </p>
          </SectionIntro>
        </RevealOnScroll>

        <div className="flex flex-col gap-[clamp(32px,4vw,48px)] lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(400px,52vw,760px)] lg:items-start lg:gap-x-[clamp(32px,4vw,60px)]">
          <div
            className="flex w-full max-w-[36rem] flex-col"
            style={{ gap: "clamp(6px, 0.6vw, 10px)" }}
          >
            {caseStudies.map((study, index) => (
              <button
                key={study.id}
                type="button"
                data-state={index === selectedIndex ? "selected" : "default"}
                aria-pressed={index === selectedIndex}
                onClick={() => selectPill(index)}
                className="case-pill flex w-full cursor-pointer items-center justify-between rounded-full text-left"
                style={{ padding: 5, gap: "clamp(10px, 1vw, 15px)" }}
              >
                <span
                  className="flex min-w-0 items-center"
                  style={{ gap: "clamp(10px, 1vw, 15px)" }}
                >
                  <Image
                    src={study.logo}
                    alt=""
                    width={40}
                    height={40}
                    className="shrink-0 rounded-full"
                    style={{
                      width: "clamp(32px, 2.8vw, 40px)",
                      height: "clamp(32px, 2.8vw, 40px)",
                    }}
                  />
                  <span
                    className="line-clamp-2 text-left text-stone-50"
                    style={{ fontSize: "clamp(13px, 1.1vw, 16px)", lineHeight: 1.4 }}
                  >
                    {study.title}
                  </span>
                </span>
                <span
                  className="case-pill-arrow grid shrink-0 place-items-center"
                  style={{
                    width: "clamp(32px, 2.8vw, 40px)",
                    height: "clamp(32px, 2.8vw, 40px)",
                  }}
                >
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
                    <path
                      d="M1 1L7 7L1 13"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            ))}
          </div>

        <div
          ref={cardsRef}
          className={[caseStudyCardsStackClass, animating ? "is-animating" : ""].join(
            " ",
          )}
          style={{ gap: "clamp(8px, 0.7vw, 10px)" }}
        >
          <UnionCardShell
            path={CASE_STUDY_TVL_CARD_SHELL_PATH}
            viewBox={CASE_STUDY_TVL_CARD_SHELL_VIEWBOX}
            className="w-full"
            contentClassName={caseStudyTvlCardContentClass}
            contentStyle={{
              gridTemplateColumns: `minmax(0, ${CASE_STUDY_TVL_CARD_DIVIDER_RATIO * 100}%) minmax(0, 1fr)`,
            }}
          >
            <div
              className="flex h-full min-h-0 flex-col justify-start"
              style={{
                padding:
                  "clamp(12px, 1.25vw, 14px) clamp(4px, 0.5vw, 8px) clamp(8px, 1vw, 10px) clamp(12px, 1.25vw, 14px)",
              }}
            >
              <div
                className="flex flex-col"
                style={{ gap: "clamp(2px, 0.25vw, 4px)" }}
              >
                <div
                  key={activeStudy.id}
                  data-counter
                  data-target={String(activeStudy.tvl.target)}
                  data-prefix={activeStudy.tvl.prefix}
                  data-suffix={activeStudy.tvl.suffix}
                  className="max-lg:text-xl max-lg:tracking-[-0.4px] font-normal leading-[1.2] text-stone-50 lg:text-[clamp(28px,3.2vw,40px)] lg:tracking-[-0.4px]"
                >
                  {activeStudy.tvl.display}
                </div>
                <div
                  key={`${activeStudy.id}-label`}
                  className="max-lg:text-[9px] leading-[1.4] text-white/50 lg:text-[clamp(13px,1.1vw,16px)]"
                >
                  {activeStudy.tvl.label}
                </div>
              </div>
              <Image
                key={`${activeStudy.id}-tvl-logo`}
                src={activeStudy.logo}
                alt=""
                width={56}
                height={56}
                className="mt-auto shrink-0 rounded-full"
                style={{
                  width: "clamp(40px, 3.5vw, 56px)",
                  height: "clamp(40px, 3.5vw, 56px)",
                }}
              />
            </div>
            <div
              className="flex h-full min-h-0 min-w-0 flex-col"
              style={{
                padding: "clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px) clamp(2px, 0.3vw, 4px)",
              }}
            >
              <CaseStudyTvlChartSvg
                key={`${animationKey}-${activeStudy.id}`}
                variant={activeStudy.id}
                className="h-full w-full"
              />
            </div>
          </UnionCardShell>

          <div className="grid min-w-0 grid-cols-2" style={{ gap: "clamp(8px, 0.7vw, 10px)" }}>
            <UnionCardShell
              path={CASE_STUDY_VERTICAL_CARD_SHELL_PATH}
              viewBox={CASE_STUDY_VERTICAL_CARD_SHELL_VIEWBOX}
              className="min-w-0 w-full"
              contentClassName={caseStudyVerticalCardContentClass}
              contentStyle={{
                gridTemplateRows: `minmax(0, ${CASE_STUDY_VERTICAL_CARD_DIVIDER_RATIO * 100}%) minmax(0, 1fr)`,
              }}
            >
              <div
                className="flex h-full min-h-0 flex-col"
                style={{
                  padding:
                    "clamp(12px, 1.25vw, 14px) clamp(8px, 1vw, 10px) clamp(10px, 1vw, 14px) clamp(12px, 1.25vw, 14px)",
                }}
              >
                <div
                  className="flex flex-col"
                  style={{ gap: "clamp(2px, 0.25vw, 4px)" }}
                >
                  {activeStudy.boosted.kind === "counter" ? (
                    <div
                      key={`${activeStudy.id}-boosted`}
                      data-counter
                      data-target={String(activeStudy.boosted.target)}
                      data-prefix={activeStudy.boosted.prefix}
                      data-suffix={activeStudy.boosted.suffix}
                      className="max-lg:text-xl max-lg:tracking-[-0.4px] font-normal leading-[1.2] text-stone-50 lg:text-[clamp(28px,3.2vw,40px)] lg:tracking-[-0.4px]"
                    >
                      {activeStudy.boosted.display}
                    </div>
                  ) : (
                    <div
                      key={`${activeStudy.id}-boosted`}
                      data-counter
                      data-counter-kind="range"
                      data-min-target={String(activeStudy.boosted.min)}
                      data-max-target={String(activeStudy.boosted.max)}
                      data-min-decimals={String(activeStudy.boosted.minDecimals)}
                      data-max-decimals={String(activeStudy.boosted.maxDecimals)}
                      data-suffix={activeStudy.boosted.suffix}
                      className="max-lg:text-xl max-lg:tracking-[-0.4px] font-normal leading-[1.2] text-stone-50 lg:text-[clamp(28px,3.2vw,40px)] lg:tracking-[-0.4px]"
                    >
                      {activeStudy.boosted.display}
                    </div>
                  )}
                  <div
                    key={`${activeStudy.id}-boosted-label`}
                    className="max-lg:text-[9px] leading-[1.4] text-white/50 lg:text-[clamp(13px,1.1vw,16px)]"
                  >
                    {activeStudy.boosted.label}
                  </div>
                </div>
                {activeStudy.boosted.badges.length > 0 ? (
                  <div
                    className="mt-auto flex w-full flex-wrap items-center justify-evenly"
                    style={{ paddingBottom: "clamp(2px, 0.25vw, 6px)" }}
                  >
                    {sortAprBadgesByApy(activeStudy.boosted.badges).map((apr) => (
                      <span
                        key={apr.label}
                        className="max-lg:text-[6px] min-w-0 truncate font-medium leading-[1.2] text-stone-50 lg:text-[clamp(9px,0.75vw,11px)]"
                      >
                        {apr.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div
                className="flex h-full min-h-0 min-w-0 flex-col"
                style={{
                  padding:
                    "clamp(4px, 0.5vw, 6px) clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px)",
                }}
              >
                <CaseStudyBoostedTvlChartSvg
                  key={`${animationKey}-${activeStudy.id}`}
                  chartId={activeStudy.id}
                  badges={activeStudy.boosted.badges}
                  className="h-full w-full"
                />
              </div>
            </UnionCardShell>

            <UnionCardShell
              path={CASE_STUDY_VERTICAL_CARD_SHELL_PATH}
              viewBox={CASE_STUDY_VERTICAL_CARD_SHELL_VIEWBOX}
              flipped
              className="min-w-0 w-full"
              contentClassName={caseStudyThirdCardContentClass}
            >
              <CaseStudyThirdCard key={activeStudy.id} card={activeStudy.thirdCard} />
            </UnionCardShell>
          </div>
        </div>
        </div>
      </div>
    </SectionShell>
  );
}
