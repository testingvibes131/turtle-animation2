"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SectionIntro } from "@/components/layout/SectionIntro";
import { SectionShell } from "@/components/layout/SectionShell";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
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

        <div className="flex flex-col gap-[clamp(32px,4vw,48px)] lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-x-[clamp(32px,4vw,60px)]">
          <div
            className="flex w-full max-w-[36rem] flex-col"
            style={{ gap: "clamp(6px, 0.6vw, 10px)" }}
          >
            {caseStudies.map((study) => (
              <div
                key={study.id}
                className="case-pill flex w-full items-center justify-between rounded-full"
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
              </div>
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
                gap: "clamp(2px, 0.25vw, 4px)",
                padding:
                  "clamp(12px, 1.25vw, 14px) clamp(4px, 0.5vw, 8px) clamp(8px, 1vw, 10px) clamp(12px, 1.25vw, 14px)",
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
                  padding:
                    "clamp(12px, 1.25vw, 14px) clamp(8px, 1vw, 10px) clamp(10px, 1vw, 14px) clamp(12px, 1.25vw, 14px)",
                }}
              >
                <div
                  className="flex flex-col"
                  style={{ gap: "clamp(2px, 0.25vw, 4px)" }}
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
                </div>
                <div
                  className="flex w-full flex-wrap items-center justify-center"
                  style={{
                    gap: "clamp(8px, 0.9vw, 14px)",
                    marginTop: "clamp(6px, 0.65vw, 10px)",
                  }}
                >
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
              flipped
              className="min-w-0 w-full"
              contentClassName={caseStudyVerticalCardContentClass}
              contentStyle={{
                gridTemplateRows: `minmax(0, 1fr) minmax(0, ${CASE_STUDY_VERTICAL_CARD_DIVIDER_RATIO * 100}%)`,
              }}
            >
              <div
                className="flex h-full min-h-0 flex-col"
                style={{
                  gap: "clamp(10px, 1vw, 14px)",
                  padding:
                    "clamp(18px, 1.6vw, 22px) clamp(18px, 1.6vw, 22px) clamp(18px, 1.6vw, 22px) clamp(18px, 1.6vw, 22px)",
                }}
              >
                <div className="flex flex-1 flex-col items-start justify-center text-left">
                  <p className="max-lg:text-sm leading-[1.35] text-stone-50 lg:text-base">
                    "Turtle has been a strong partner for Avalanche DeFi, helping attract and retain
                    high-quality liquidity on the chain. Their vaults specialized in risk-screened
                    yield opportunities for LPs while increasing participation across key Avalanche
                    protocols, contributing to growth in asset flows and protocol adoption across the
                    ecosystem."
                  </p>
                </div>
              </div>
              <div
                className="flex h-full min-h-0 items-end"
                style={{
                  gap: "clamp(8px, 0.8vw, 12px)",
                  paddingBottom: "clamp(22px, 2.2vw, 28px)",
                  paddingLeft: "clamp(12px, 1.25vw, 14px)",
                }}
              >
                <div
                  className="inline-flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full outline outline-[0.42px] outline-offset-[-0.42px] outline-stone-50/10"
                  style={{
                    boxShadow:
                      "0 4.5px 56.6px rgba(0,0,0,0.4), inset 2.9px 2.9px 19.3px rgba(215,215,215,0.15), inset 2.9px 0.97px 9.67px rgba(255,255,255,0.25)",
                  }}
                >
                  <Image
                    src="/case-studies/apr-avalanche.png"
                    alt=""
                    width={52}
                    height={52}
                    className="block size-[52px] rounded-full object-cover"
                  />
                </div>
                <div className="min-w-0 text-left leading-[1.4]">
                  <p className="text-stone-50 max-lg:text-sm lg:text-lg">Matt Schmenk</p>
                  <p className="text-white/50 max-lg:text-[10px] lg:text-xs">
                    Business Development & Growth
                  </p>
                </div>
              </div>
            </UnionCardShell>
          </div>
        </div>
        </div>
      </div>
    </SectionShell>
  );
}
