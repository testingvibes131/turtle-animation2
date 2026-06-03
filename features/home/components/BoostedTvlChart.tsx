"use client";

import { useEffect, useRef } from "react";
import {
  BOOSTED_TVL_DOT_RADIUS,
  BOOSTED_TVL_FADE_MS,
  BOOSTED_TVL_START_DELAY_MS,
  BOOSTED_TVL_TOTAL_MS,
  BOOSTED_TVL_VB_H,
  BOOSTED_TVL_VB_W,
  boostedTvlBarDots,
} from "@/features/home/data/boostedTvlBarDots";

type BoostedTvlChartProps = {
  animating: boolean;
  animationKey: number;
};

export function BoostedTvlChart({ animating, animationKey }: BoostedTvlChartProps) {
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
      height = (width * BOOSTED_TVL_VB_H) / BOOSTED_TVL_VB_W;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = width / BOOSTED_TVL_VB_W;
    };

    const drawAt = (now: number, startedAt: number) => {
      ctx.clearRect(0, 0, width, height);
      const dotRadius = BOOSTED_TVL_DOT_RADIUS * scale;

      for (const dot of boostedTvlBarDots) {
        const elapsed = now - startedAt - BOOSTED_TVL_START_DELAY_MS - dot.delayMs;
        let alpha = 1;
        if (!reducedMotion) {
          if (elapsed <= 0) alpha = 0;
          else alpha = Math.min(1, elapsed / BOOSTED_TVL_FADE_MS);
        }
        if (alpha <= 0) continue;

        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(dot.cx * scale, dot.cy * scale, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    syncSize();
    const startedAt = performance.now();
    const totalMs = reducedMotion ? 0 : BOOSTED_TVL_START_DELAY_MS + BOOSTED_TVL_TOTAL_MS;

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
      className="relative w-full overflow-hidden rounded-[clamp(10px,1vw,14px)] bg-[#0f0f0f] outline outline-1 -outline-offset-1 outline-stone-50/10 [background-image:linear-gradient(to_bottom_right,rgba(249,249,249,0.12)_0%,rgba(249,249,249,0.04)_38%,#0f0f0f_100%)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/case-studies/TVLGraph-grid-light.svg"
        alt=""
        width={BOOSTED_TVL_VB_W}
        height={BOOSTED_TVL_VB_H}
        decoding="async"
        className="block h-auto w-full"
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
