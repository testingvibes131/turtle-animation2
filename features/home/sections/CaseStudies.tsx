"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionShell } from "@/components/layout/SectionShell";
import { CaseStudyBoostedTvlChartSvg } from "@/features/home/components/CaseStudyBoostedTvlChartSvg";
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
  caseStudyTvlCardContentClass,
  caseStudyVerticalCardContentClass,
} from "@/features/home/components/caseStudyCardFrame";
import { caseStudies } from "@/features/home/data/caseStudies";

function animateCounter(
  el: HTMLElement,
  target: number,
  prefix: string,
  suffix: string,
  decimals: number,
) {
  const duration = 1100;
  const startedAt = performance.now();

  const tick = (now: number) => {
    const t = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - (1 - t) ** 3;
    const value = (target * eased).toFixed(decimals);
    el.textContent = `${prefix}${value}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

export function CaseStudies() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [animating, setAnimating] = useState(false);

  const runAnimation = () => {
    const cardsRoot = cardsRef.current;
    if (!cardsRoot) return;

    setAnimating(false);
    void cardsRoot.offsetWidth;
    setAnimating(true);

    cardsRoot.querySelectorAll<HTMLElement>("[data-counter]").forEach((el) => {
      animateCounter(
        el,
        parseFloat(el.dataset.target ?? "0"),
        el.dataset.prefix ?? "",
        el.dataset.suffix ?? "",
        (el.dataset.target?.split(".")[1] ?? "").length,
      );
    });
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
    setSelectedIndex(index);
    runAnimation();
  };

  return (
    <SectionShell>
      <div className="flex flex-col gap-[clamp(40px,5vw,64px)]">
        <RevealOnScroll className="flex w-full max-w-[36rem] flex-col gap-[clamp(16px,1.8vw,28px)]">
          <h2 className="bg-clip-text pb-[0.05em] text-4xl font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading">
            See the track record
            <br />
            before you commit a dollar
          </h2>
          <p className="text-[clamp(15px,1.3vw,19px)] leading-[1.4] text-[rgba(239,248,237,0.5)]">
            The receipts speak for themselves.
            <br />
            Check the case studies, see the history, swim with the whales.
          </p>
        </RevealOnScroll>

        <div className="flex flex-col gap-[clamp(32px,4vw,48px)] lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-[clamp(32px,4vw,60px)]">
          <div
            className="flex w-full max-w-[36rem] flex-col"
            style={{ gap: "clamp(6px, 0.6vw, 10px)" }}
          >
            {caseStudies.map((study, index) => (
              <button
                key={study.id}
                type="button"
                data-case-pill
                data-state={index === selectedIndex ? "selected" : "default"}
                onClick={() => selectPill(index)}
                className="case-pill group flex w-full cursor-pointer items-center justify-between rounded-full transition-colors duration-300"
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
                  className="case-pill-arrow grid shrink-0 place-items-center rounded-full"
                  style={{
                    width: "clamp(32px, 2.8vw, 40px)",
                    height: "clamp(32px, 2.8vw, 40px)",
                  }}
                >
                  <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
                    <path
                      d="M1 1L7 7L1 13"
                      stroke="#73F36C"
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
          className={[
            caseStudyCardsStackClass,
            "lg:w-auto",
            animating ? "is-animating" : "",
          ].join(" ")}
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
              className="flex flex-col justify-start"
              style={{
                gap: "clamp(6px, 0.7vw, 10px)",
                padding: "clamp(8px, 1vw, 10px) clamp(4px, 0.5vw, 8px) clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px)",
              }}
            >
              <div
                data-counter
                data-target="50"
                data-prefix="$"
                data-suffix="M"
                className="max-lg:text-xl max-lg:tracking-[-0.4px] font-normal leading-[1.2] text-stone-50 lg:text-[clamp(28px,3.2vw,40px)] lg:tracking-[-0.4px]"
              >
                $50M
              </div>
              <div className="max-lg:text-[9px] leading-[1.4] text-white/50 lg:text-[clamp(13px,1.1vw,16px)]">
                TVL within 48hrs
              </div>
            </div>
            <div
              className="flex h-full min-h-0 min-w-0 flex-col"
              style={{
                padding: "clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px) clamp(2px, 0.3vw, 4px)",
              }}
            >
              <CaseStudyTvlChartSvg className="h-full w-full" />
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
                className="flex flex-col"
                style={{
                  gap: "clamp(6px, 0.7vw, 8px)",
                  padding: "clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px) clamp(4px, 0.5vw, 6px)",
                }}
              >
                <div
                  data-counter
                  data-target="84.5"
                  data-prefix="$"
                  data-suffix="M"
                  className="max-lg:text-xl max-lg:tracking-[-0.4px] font-normal leading-[1.2] text-stone-50 lg:text-[clamp(28px,3.2vw,40px)] lg:tracking-[-0.4px]"
                >
                  $84.5M
                </div>
                <div className="max-lg:text-[9px] leading-[1.4] text-white/50 lg:text-[clamp(13px,1.1vw,16px)]">
                  Boosted TVL
                </div>
                <div className="flex w-full flex-wrap items-center justify-center" style={{ gap: "clamp(8px, 0.9vw, 14px)" }}>
                  {[
                    { src: "/case-studies/apr-bitcoin.png", label: "9% APR" },
                    { src: "/case-studies/apr-avalanche.png", label: "10% APR" },
                    { src: "/case-studies/apr-usdc.png", label: "18% APR" },
                  ].map((apr) => (
                    <div key={apr.label} className="flex min-w-0 items-center" style={{ gap: 5 }}>
                      <Image
                        src={apr.src}
                        alt=""
                        width={16}
                        height={16}
                        className="size-2 shrink-0 rounded-full lg:size-4"
                      />
                      <span className="max-lg:text-[7px] truncate font-medium leading-[1.2] text-stone-50 lg:text-[clamp(11px,0.9vw,14px)]">
                        {apr.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="flex h-full min-h-0 min-w-0 flex-col"
                style={{
                  padding:
                    "clamp(4px, 0.5vw, 6px) clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px)",
                }}
              >
                <CaseStudyBoostedTvlChartSvg className="h-full w-full" />
              </div>
            </UnionCardShell>

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
                style={{
                  padding: "clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px) clamp(4px, 0.5vw, 6px)",
                }}
              >
                <div
                  className="inline-flex max-lg:size-8 items-center justify-center overflow-hidden rounded-full outline outline-[0.42px] outline-offset-[-0.42px] outline-stone-50/10 lg:h-[clamp(56px,5.2vw,75px)] lg:w-[clamp(56px,5.2vw,75px)]"
                  style={{
                    boxShadow:
                      "0 4.5px 56.6px rgba(0,0,0,0.4), inset 2.9px 2.9px 19.3px rgba(215,215,215,0.15), inset 2.9px 0.97px 9.67px rgba(255,255,255,0.25)",
                  }}
                >
                  <Image
                    src="/case-studies/apr-avalanche.png"
                    alt=""
                    width={75}
                    height={75}
                    className="block max-lg:size-8 h-full w-full rounded-full object-cover"
                  />
                </div>
              </div>
              <div
                className="flex h-full min-h-0 flex-col justify-end"
                style={{
                  gap: "clamp(6px, 0.7vw, 10px)",
                  padding: "clamp(4px, 0.5vw, 6px) clamp(8px, 1vw, 10px) clamp(8px, 1vw, 10px)",
                }}
              >
                <p className="max-lg:text-sm leading-[1.35] text-stone-50 lg:text-[clamp(14px,1.5vw,19px)]">
                  &ldquo;Turtle were the best partners to work with and helped us exceed our
                  liquidity goals&rdquo;
                </p>
                <p className="max-lg:text-[9px] leading-[1.4] text-white/50 lg:text-[clamp(12px,1.1vw,16px)]">
                  Joe Blogs
                  <br />
                  CTO - Avalanche Foundation
                </p>
              </div>
            </UnionCardShell>
          </div>
        </div>
        </div>
      </div>
    </SectionShell>
  );
}
