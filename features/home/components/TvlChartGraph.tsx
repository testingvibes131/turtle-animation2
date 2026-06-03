"use client";

import { useEffect, useRef } from "react";
import { cornerSwaps, peakOffInGrown } from "@/features/home/data/tvlChartCliff";
import { tvlChartDots } from "@/features/home/data/tvlChartDots";

const VB_W = 534;
const VB_H = 380;
const STAGGER_MS = 1400;
const FADE_MS = 280;
const DOT_RADIUS = 2;

const IDLE_HOLD_MS = 3000;
const IDLE_MORPH_MS = 1400;
const IDLE_BLINK_MS = 180;

type IdleShape = "base" | "grown";

type TvlChartGraphProps = {
  animating: boolean;
  animationKey: number;
  className?: string;
  size?: "default" | "shell";
};

function idleCycleMs() {
  return 2 * (IDLE_HOLD_MS + IDLE_MORPH_MS);
}

function litInShape(index: number, shape: IdleShape) {
  if (peakOffInGrown.has(index)) return shape === "base";
  return true;
}

export function TvlChartGraph({
  animating,
  animationKey,
  className,
  size = "default",
}: TvlChartGraphProps) {
  const shell = size === "shell";
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
    let revealDone = reducedMotion;
    let idleStartedAt = 0;

    const peakStagger = cornerSwaps.map(
      (_, i) => (i / Math.max(cornerSwaps.length - 1, 1)) * (IDLE_MORPH_MS - IDLE_BLINK_MS),
    );
    const peakPairIndex = new Map(cornerSwaps.map((s, i) => [s.peak, i]));

    const syncSize = () => {
      width = wrap.clientWidth;
      if (shell) {
        height = wrap.clientHeight;
        if (height <= 0) height = (width * VB_H) / VB_W;
      } else {
        height = (width * VB_H) / VB_W;
      }
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = width / VB_W;
    };

    const scaleX = () => width / VB_W;
    const scaleY = () => (shell ? height / VB_H : width / VB_W);
    const baseDotR = () => DOT_RADIUS * (shell ? (scaleX() + scaleY()) / 2 : scale);

    const delays = tvlChartDots.map(
      (_, index) => (index / Math.max(tvlChartDots.length - 1, 1)) * STAGGER_MS,
    );

    const idlePhase = (now: number) => {
      const t = ((now - idleStartedAt) % idleCycleMs() + idleCycleMs()) % idleCycleMs();
      if (t < IDLE_HOLD_MS) return { kind: "hold" as const, shape: "base" as const };
      if (t < IDLE_HOLD_MS + IDLE_MORPH_MS) {
        return {
          kind: "morph" as const,
          morphT: t - IDLE_HOLD_MS,
          to: "grown" as const,
        };
      }
      if (t < 2 * IDLE_HOLD_MS + IDLE_MORPH_MS) {
        return { kind: "hold" as const, shape: "grown" as const };
      }
      return {
        kind: "morph" as const,
        morphT: t - (2 * IDLE_HOLD_MS + IDLE_MORPH_MS),
        to: "base" as const,
      };
    };

    /** Only the peak toggles; the face neighbor below stays lit (no dead cell between). */
    const peakMorphAlpha = (index: number, to: IdleShape, morphT: number) => {
      const pairIdx = peakPairIndex.get(index);
      if (pairIdx === undefined) return 1;

      const local = morphT - peakStagger[pairIdx];
      const goal = to === "base" ? 1 : 0;

      if (local < 0) return to === "base" ? 0 : 1;
      if (local >= IDLE_BLINK_MS) return goal;
      if (goal === 0) return 1 - (local / IDLE_BLINK_MS) * 0.96;
      return (local / IDLE_BLINK_MS) * 0.96 + 0.04;
    };

    const idleAlpha = (index: number, now: number) => {
      const phase = idlePhase(now);
      if (phase.kind === "hold") {
        return litInShape(index, phase.shape) ? 1 : 0.04;
      }
      if (!peakOffInGrown.has(index)) return 1;
      return peakMorphAlpha(index, phase.to, phase.morphT);
    };

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

        if (!reducedMotion && revealDone) {
          alpha *= idleAlpha(index, now);
        }

        const dot = tvlChartDots[index];
        ctx.globalAlpha = alpha * 0.95;
        ctx.fillStyle = "#73F36C";
        ctx.beginPath();
        ctx.arc(dot.cx * scaleX(), dot.cy * scaleY(), baseDotR(), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      drawAt(now, startedAt);
      if (!reducedMotion) {
        if (!revealDone && now - startedAt >= STAGGER_MS + FADE_MS) {
          revealDone = true;
          idleStartedAt = now;
        }
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    syncSize();
    const startedAt = performance.now();
    idleStartedAt = startedAt + STAGGER_MS + FADE_MS;

    const ro = new ResizeObserver(() => {
      syncSize();
      drawAt(performance.now(), startedAt);
    });
    ro.observe(wrap);

    cancelAnimationFrame(rafRef.current);
    drawAt(startedAt, startedAt);
    if (!reducedMotion) rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [animating, animationKey, shell]);

  return (
    <div
      ref={wrapRef}
      className={[
        "relative overflow-hidden rounded-[15px] bg-[#0f0f0f] outline outline-1 -outline-offset-1 outline-stone-50/10 [background-image:linear-gradient(to_bottom_right,rgba(249,249,249,0.12)_0%,rgba(249,249,249,0.04)_38%,#0f0f0f_100%)]",
        shell ? "h-full min-h-0 w-full" : "w-fit shrink-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/case-studies/TVLGraph-grid-light.svg"
        alt=""
        width={VB_W}
        height={VB_H}
        decoding="async"
        className={
          shell
            ? "absolute inset-0 block h-full w-full object-fill"
            : "block h-auto w-[clamp(180px,32vw,534px)]"
        }
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
