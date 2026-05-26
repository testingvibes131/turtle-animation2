"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { SectionShell } from "@/components/layout/SectionShell";
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
      { threshold: 0.25 },
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
      <div className="grid grid-cols-1 items-center gap-[clamp(40px,5vw,64px)] lg:grid-cols-[1fr_auto] lg:gap-x-[clamp(32px,4vw,60px)]">
        <RevealOnScroll className="flex w-full max-w-[36rem] flex-col">
          <div className="flex flex-col gap-[clamp(16px,1.8vw,28px)]">
            <h2 className="bg-clip-text pb-[0.05em] text-[clamp(1.5rem,2.8vw,2.5rem)] font-normal leading-[1.2] tracking-[-0.8px] text-transparent text-gradient-heading">
              See the track record
              <br />
              before you commit a dollar
            </h2>
            <p className="text-[clamp(15px,1.3vw,19px)] leading-[1.4] text-[rgba(239,248,237,0.5)]">
              The receipts speak for themselves.
              <br />
              Check the case studies, see the history, swim with the whales.
            </p>
          </div>

          <div
            className="mt-[clamp(40px,5vw,80px)] flex w-full flex-col"
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
        </RevealOnScroll>

        <div
          ref={cardsRef}
          className={[
            "case-cards flex w-full max-w-[clamp(400px,52vw,760px)] flex-col lg:w-auto",
            animating ? "is-animating" : "",
          ].join(" ")}
          style={{ gap: "clamp(8px, 0.7vw, 10px)" }}
        >
          <article className="case-card relative flex w-full rounded-[clamp(14px,1.2vw,17px)] bg-surface-1 shadow-[0_4px_20px_0_rgba(0,0,0,0.25)] outline outline-[0.5px] outline-offset-[-0.5px] outline-stone-50/10"
            style={{ padding: "clamp(8px, 1vw, 10px)", gap: "clamp(10px, 1.1vw, 14px)" }}
          >
            <div
              className="flex shrink-0 flex-col justify-start"
              style={{ gap: "clamp(6px, 0.7vw, 10px)", padding: "clamp(6px, 0.7vw, 10px) clamp(6px, 0.7vw, 10px) 0" }}
            >
              <div
                data-counter
                data-target="50"
                data-prefix="$"
                data-suffix="M"
                className="font-normal leading-[1.2] text-stone-50"
                style={{ fontSize: "clamp(28px, 3.2vw, 40px)", letterSpacing: "-0.4px" }}
              >
                $50M
              </div>
              <div className="leading-[1.4] text-white/50" style={{ fontSize: "clamp(13px, 1.1vw, 16px)" }}>
                TVL within 48hrs
              </div>
            </div>
            <div
              className="relative min-h-[clamp(180px,19vw,260px)] flex-1 overflow-hidden rounded-[clamp(10px,1vw,14px)] bg-[#0f0f0f] outline outline-1 outline-offset-[-1px] outline-stone-50/10"
            >
              <svg className="tvl-graph absolute inset-0 h-full w-full" viewBox="0 0 320 168" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="tvl-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#73F36C" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#73F36C" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="tvl-area"
                  d="M0,150 L18,140 30,120 45,95 60,40 78,55 92,30 110,75 128,60 145,90 162,70 180,110 198,100 215,135 232,115 248,145 265,130 282,90 300,50 320,75 L320,168 L0,168 Z"
                  fill="url(#tvl-fill)"
                />
                <path
                  className="tvl-line"
                  d="M0,150 L18,140 30,120 45,95 60,40 78,55 92,30 110,75 128,60 145,90 162,70 180,110 198,100 215,135 232,115 248,145 265,130 282,90 300,50 320,75"
                  fill="none"
                  stroke="#73F36C"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </article>

          <div className="grid grid-cols-2" style={{ gap: "clamp(8px, 0.7vw, 10px)" }}>
            <article className="case-card relative flex w-full flex-col rounded-[clamp(14px,1.2vw,17px)] bg-surface-1 shadow-[0_4px_20px_0_rgba(0,0,0,0.25)] outline outline-[0.5px] outline-offset-[-0.5px] outline-stone-50/10"
              style={{ padding: "clamp(8px, 1vw, 10px)", gap: "clamp(10px, 1.1vw, 14px)" }}
            >
              <div className="flex flex-col" style={{ gap: "clamp(6px, 0.7vw, 10px)", padding: "clamp(2px, 0.3vw, 4px) clamp(6px, 0.7vw, 10px) 0" }}>
                <div
                  data-counter
                  data-target="84.5"
                  data-prefix="$"
                  data-suffix="M"
                  className="font-normal leading-[1.2] text-stone-50"
                  style={{ fontSize: "clamp(28px, 3.2vw, 40px)", letterSpacing: "-0.4px" }}
                >
                  $84.5M
                </div>
                <div className="leading-[1.4] text-white/50" style={{ fontSize: "clamp(13px, 1.1vw, 16px)" }}>
                  Boosted TVL
                </div>
              </div>
              <div className="flex w-full items-center" style={{ gap: "clamp(8px, 0.9vw, 14px)", padding: "0 clamp(6px, 0.7vw, 10px)" }}>
                {[
                  { src: "/case-studies/apr-bitcoin.png", label: "9% APR" },
                  { src: "/case-studies/apr-avalanche.png", label: "10% APR" },
                  { src: "/case-studies/apr-usdc.png", label: "18% APR" },
                ].map((apr) => (
                  <div key={apr.label} className="flex min-w-0 items-center" style={{ gap: 5 }}>
                    <Image src={apr.src} alt="" width={16} height={16} className="shrink-0 rounded-full" />
                    <span className="truncate font-medium leading-[1.2] text-stone-50" style={{ fontSize: "clamp(11px, 0.9vw, 14px)" }}>
                      {apr.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="relative overflow-hidden rounded-[clamp(10px,1vw,14px)] bg-[#0f0f0f] outline outline-1 outline-offset-[-1px] outline-stone-50/10" style={{ aspectRatio: 1.5 }}>
                <svg className="boost-bars absolute inset-0 h-full w-full" viewBox="0 0 384 192" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="bar-amber" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></linearGradient>
                    <linearGradient id="bar-red" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
                    <linearGradient id="bar-blue" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.32" /><stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" /></linearGradient>
                  </defs>
                  <g transform="translate(12 130)"><g className="bar-grow" data-color="amber"><rect width="116" height="62" fill="url(#bar-amber)" /><line x1="0" y1="0" x2="116" y2="0" stroke="#f59e0b" strokeWidth="2.4" /><line x1="0" y1="0" x2="0" y2="62" stroke="#f59e0b" strokeWidth="1.2" /><line x1="116" y1="0" x2="116" y2="62" stroke="#f59e0b" strokeWidth="1.2" /></g></g>
                  <g transform="translate(132 100)"><g className="bar-grow" data-color="red"><rect width="116" height="92" fill="url(#bar-red)" /><line x1="0" y1="0" x2="116" y2="0" stroke="#ef4444" strokeWidth="2.4" /><line x1="0" y1="0" x2="0" y2="92" stroke="#ef4444" strokeWidth="1.2" /><line x1="116" y1="0" x2="116" y2="92" stroke="#ef4444" strokeWidth="1.2" /></g></g>
                  <g transform="translate(252 60)"><g className="bar-grow" data-color="blue"><rect width="116" height="132" fill="url(#bar-blue)" /><line x1="0" y1="0" x2="116" y2="0" stroke="#1d4ed8" strokeWidth="2.4" /><line x1="0" y1="0" x2="0" y2="132" stroke="#1d4ed8" strokeWidth="1.2" /><line x1="116" y1="0" x2="116" y2="132" stroke="#1d4ed8" strokeWidth="1.2" /></g></g>
                </svg>
              </div>
            </article>

            <article className="case-card relative flex w-full flex-col justify-between rounded-[clamp(14px,1.2vw,17px)] bg-surface-1 shadow-[0_4px_20px_0_rgba(0,0,0,0.25)] outline outline-[0.5px] outline-offset-[-0.5px] outline-stone-50/10"
              style={{ padding: "clamp(8px, 1vw, 10px)", gap: "clamp(10px, 1.1vw, 14px)" }}
            >
              <div className="inline-flex items-center justify-center overflow-hidden rounded-full outline outline-[0.42px] outline-offset-[-0.42px] outline-stone-50/10"
                style={{ width: "clamp(56px, 5.2vw, 75px)", height: "clamp(56px, 5.2vw, 75px)", boxShadow: "0 4.5px 56.6px rgba(0,0,0,0.4), inset 2.9px 2.9px 19.3px rgba(215,215,215,0.15), inset 2.9px 0.97px 9.67px rgba(255,255,255,0.25)" }}
              >
                <Image src="/case-studies/apr-avalanche.png" alt="" width={75} height={75} className="block h-full w-full rounded-full object-cover" />
              </div>
              <div className="flex flex-col" style={{ gap: "clamp(6px, 0.7vw, 10px)", padding: "0 clamp(6px, 0.7vw, 10px) clamp(2px, 0.3vw, 4px)" }}>
                <p className="leading-[1.35] text-stone-50" style={{ fontSize: "clamp(14px, 1.5vw, 19px)" }}>
                  &ldquo;Turtle were so great to work with they made everything a breeze and got our campaign off the ground in days&rdquo;
                </p>
                <p className="leading-[1.4] text-white/50" style={{ fontSize: "clamp(12px, 1.1vw, 16px)" }}>
                  Write some name here
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
