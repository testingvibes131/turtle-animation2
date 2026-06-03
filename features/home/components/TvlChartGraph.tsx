"use client";

import { useEffect, useRef } from "react";
import { tvlChartDots } from "@/features/home/data/tvlChartDots";

const VB_W = 534;
const VB_H = 380;
const STAGGER_MS = 1400;
const FADE_MS = 280;
const DOT_RADIUS = 2;

type TvlChartGraphProps = {
  animating: boolean;
  animationKey: number;
};

export function TvlChartGraph({ animating, animationKey }: TvlChartGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !animating) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let scale = 1;

    const syncSize = () => {
      width = wrap.clientWidth;
      height = (width * VB_H) / VB_W;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = width / VB_W;
    };

    const delays = tvlChartDots.map(
      (_, index) => (index / Math.max(tvlChartDots.length - 1, 1)) * STAGGER_MS,
    );

    const drawAt = (now: number, startedAt: number) => {
      ctx.clearRect(0, 0, width, height);
      for (let index = 0; index < tvlChartDots.length; index++) {
        const elapsed = now - startedAt - delays[index];
        let alpha = 1;
        if (!reducedMotion) {
          if (elapsed <= 0) alpha = 0;
          else alpha = Math.min(1, elapsed / FADE_MS);
        }
        if (alpha <= 0) continue;

        const dot = tvlChartDots[index];
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = "#73F36C";
        ctx.beginPath();
        ctx.arc(dot.cx * scale, dot.cy * scale, DOT_RADIUS * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    syncSize();
    const startedAt = performance.now();
    const totalMs = reducedMotion ? 0 : STAGGER_MS + FADE_MS;

    const frame = (now: number) => {
      drawAt(now, startedAt);
      if (now - startedAt < totalMs) {
        rafRef.current = requestAnimationFrame(frame);
      }
    };

    const ro = new ResizeObserver(() => {
      syncSize();
      drawAt(performance.now(), startedAt);
    });
    ro.observe(wrap);

    cancelAnimationFrame(rafRef.current);
    drawAt(startedAt, startedAt);
    if (!reducedMotion) rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [animating, animationKey]);

  return (
    <div
      ref={wrapRef}
      className="relative w-fit shrink-0 overflow-hidden rounded-[clamp(10px,1vw,14px)] bg-[#0f0f0f] outline outline-1 -outline-offset-1 outline-stone-50/10 [background-image:linear-gradient(to_bottom_right,rgba(249,249,249,0.12)_0%,rgba(249,249,249,0.04)_38%,#0f0f0f_100%)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/case-studies/TVLGraph-grid-light.svg"
        alt=""
        width={VB_W}
        height={VB_H}
        decoding="async"
        className="block h-auto w-[clamp(180px,32vw,534px)]"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
