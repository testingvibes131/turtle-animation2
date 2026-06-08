"use client";

import { useEffect, useRef } from "react";
import {
  chartLitCellCenter,
  drawChartMutedGrid,
  GRID_DOT_RADIUS,
  isInsideChartMargin,
} from "@/features/home/components/chartCanvasGrid";
import {
  drawVisualCanvasBackground,
  visualCanvasBgClass,
} from "@/features/home/components/commandCenterCanvas";
import { drawChartGreenGlow } from "@/features/home/components/chartDotGlow";
import { cornerSwaps, peakOffInGrown } from "@/features/home/data/tvlChartCliff";
import { tvlChartLitPath } from "@/features/home/data/tvlChartGridPath";

const STAGGER_MS = 1400;
const FADE_MS = 280;

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

  const litCellKeys = useRef(
    new Set(tvlChartLitPath.map((c) => `${c.col},${c.row}`)),
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let revealDone = reducedMotion || !animating;
    let idleStartedAt = 0;

    const peakStagger = cornerSwaps.map(
      (_, i) => (i / Math.max(cornerSwaps.length - 1, 1)) * (IDLE_MORPH_MS - IDLE_BLINK_MS),
    );
    const peakPairIndex = new Map(cornerSwaps.map((s, i) => [s.peak, i]));

    const syncSize = () => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      if (height <= 0) height = (width * 380) / 534;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const delays = tvlChartLitPath.map(
      (_, index) =>
        (index / Math.max(tvlChartLitPath.length - 1, 1)) * STAGGER_MS,
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
      drawVisualCanvasBackground(ctx, width, height);

      drawChartMutedGrid(
        ctx,
        width,
        height,
        GRID_DOT_RADIUS,
        animating
          ? (col, row) => litCellKeys.current.has(`${col},${row}`)
          : undefined,
      );

      if (!animating) return;

      for (let index = 0; index < tvlChartLitPath.length; index++) {
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

        const cell = tvlChartLitPath[index];
        const { x, y } = chartLitCellCenter(width, height, cell.col, cell.row);
        if (!isInsideChartMargin(x, y, width, height)) continue;
        drawChartGreenGlow(ctx, x, y, GRID_DOT_RADIUS, alpha * 0.95);
      }
    };

    const tick = (now: number) => {
      drawAt(now, startedAt);
      if (!reducedMotion && animating) {
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
    if (!reducedMotion && animating) rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [animating, animationKey, shell]);

  return (
    <div
      ref={wrapRef}
      className={[
        `relative overflow-hidden rounded-[15px] outline outline-1 -outline-offset-1 outline-stone-50/10 ${visualCanvasBgClass}`,
        shell ? "h-full min-h-0 w-full" : "w-full max-w-[534px] shrink-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={shell ? undefined : { aspectRatio: "534 / 380" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
