"use client";

import { useEffect, useRef } from "react";
import {
  barRowBounds,
  litInBarShape,
  morphCellAt,
} from "@/features/home/data/boostedTvlBarIdle";
import {
  BOOSTED_TVL_BARS,
  BOOSTED_TVL_CELL_PITCH,
  BOOSTED_TVL_DOT_RADIUS,
  BOOSTED_TVL_FADE_MS,
  BOOSTED_TVL_GRID_DOT_COLOR,
  BOOSTED_TVL_START_DELAY_MS,
  boostedTvlAnimationTotalMs,
  boostedTvlBarColStart,
  boostedTvlBarLitRowRange,
  boostedTvlCellCenter,
  boostedTvlGridCols,
  boostedTvlGridRows,
  boostedTvlLayoutSize,
  boostedTvlLitDelayMs,
  type BoostedTvlBarSpec,
} from "@/features/home/data/boostedTvlLayout";
import {
  chartContainFit,
  chartUniformMarginFit,
} from "@/features/home/utils/chartViewBoxFit";

const IDLE_HOLD_MS = 3000;
const IDLE_MORPH_MS = 1400;
const IDLE_BLINK_MS = 180;

type IdleShape = "base" | "grown";

type BoostedTvlChartProps = {
  animating: boolean;
  animationKey: number;
  className?: string;
  size?: "default" | "shell";
};

const { w: LAYOUT_W, h: LAYOUT_H } = boostedTvlLayoutSize();

function idleCycleMs() {
  return 2 * (IDLE_HOLD_MS + IDLE_MORPH_MS);
}

export function BoostedTvlChart({
  animating,
  animationKey,
  className,
  size = "default",
}: BoostedTvlChartProps) {
  const shell = size === "shell";
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = boostedTvlGridCols();
    const rows = boostedTvlGridRows();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let revealDone = reducedMotion;
    let idleStartedAt = 0;

    const morphStagger = BOOSTED_TVL_BARS.map(
      (_, i) => (i / Math.max(BOOSTED_TVL_BARS.length - 1, 1)) * (IDLE_MORPH_MS - IDLE_BLINK_MS),
    );

    const syncLayout = () => {
      width = wrap.clientWidth;
      if (shell) {
        height = wrap.clientHeight;
        if (height <= 0) height = (width * LAYOUT_H) / LAYOUT_W;
      } else {
        height = (width * LAYOUT_H) / LAYOUT_W;
      }

      const fit = shell
        ? chartUniformMarginFit(width, height, LAYOUT_W, LAYOUT_H)
        : chartContainFit(width, height, LAYOUT_W, LAYOUT_H);
      scale = fit.scale;
      offsetX = fit.offsetX;
      offsetY = fit.offsetY;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const toPx = (x: number, y: number) => ({
      px: offsetX + x * scale,
      py: offsetY + y * scale,
    });

    const dotR = () => BOOSTED_TVL_DOT_RADIUS * BOOSTED_TVL_CELL_PITCH * scale;

    const barAt = (col: number, row: number): { bar: BoostedTvlBarSpec; barIndex: number } | null => {
      for (let i = 0; i < BOOSTED_TVL_BARS.length; i++) {
        const bar = BOOSTED_TVL_BARS[i];
        const startCol = boostedTvlBarColStart(i);
        if (col < startCol || col >= startCol + bar.cols) continue;
        const { top, bottom } = barRowBounds(i);
        if (row >= top && row < bottom) return { bar, barIndex: i };
      }
      return null;
    };

    const idlePhase = (now: number) => {
      const t = ((now - idleStartedAt) % idleCycleMs() + idleCycleMs()) % idleCycleMs();
      if (t < IDLE_HOLD_MS) return { kind: "hold" as const, shape: "base" as const };
      if (t < IDLE_HOLD_MS + IDLE_MORPH_MS) {
        return { kind: "morph" as const, morphT: t - IDLE_HOLD_MS, to: "grown" as const };
      }
      if (t < 2 * IDLE_HOLD_MS + IDLE_MORPH_MS) {
        return { kind: "hold" as const, shape: "grown" as const };
      }
      return { kind: "morph" as const, morphT: t - (2 * IDLE_HOLD_MS + IDLE_MORPH_MS), to: "base" as const };
    };

    const morphCellAlpha = (col: number, row: number, to: IdleShape, morphT: number) => {
      const cell = morphCellAt(col, row);
      if (!cell) return 1;

      const local = morphT - morphStagger[cell.barIndex];
      const litInGrown = litInBarShape(col, row, cell.barIndex, "grown");
      const goal = litInGrown ? 1 : 0;

      if (local < 0) return litInBarShape(col, row, cell.barIndex, to === "grown" ? "base" : "grown") ? 1 : 0;
      if (local >= IDLE_BLINK_MS) return goal;
      if (goal === 1) return (local / IDLE_BLINK_MS) * 0.96 + 0.04;
      return 1 - (local / IDLE_BLINK_MS) * 0.96;
    };

    const idleBarAlpha = (col: number, row: number, barIndex: number, now: number) => {
      const phase = idlePhase(now);
      const shape = phase.kind === "hold" ? phase.shape : phase.to;

      if (phase.kind === "hold") {
        return litInBarShape(col, row, barIndex, shape) ? 1 : 0.04;
      }

      const morph = morphCellAt(col, row);
      if (!morph) return 1;
      return morphCellAlpha(col, row, phase.to, phase.morphT);
    };

    const drawDot = (x: number, y: number, fill: string, alpha: number) => {
      const { px, py } = toPx(x, y);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(px, py, dotR(), 0, Math.PI * 2);
      ctx.fill();
    };

    const drawAt = (now: number, startedAt: number) => {
      ctx.clearRect(0, 0, width, height);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const { x, y } = boostedTvlCellCenter(col, row);
          const hit = barAt(col, row);

          if (!animating || !hit) {
            drawDot(x, y, BOOSTED_TVL_GRID_DOT_COLOR, 0.5);
            continue;
          }

          const { bar, barIndex } = hit;

          if (!reducedMotion && revealDone) {
            const idleA = idleBarAlpha(col, row, barIndex, now);
            if (idleA <= 0.04) {
              drawDot(x, y, BOOSTED_TVL_GRID_DOT_COLOR, 0.5);
              continue;
            }
          } else if (!litInBarShape(col, row, barIndex, "base")) {
            drawDot(x, y, BOOSTED_TVL_GRID_DOT_COLOR, 0.5);
            continue;
          }

          let alpha = 1;
          if (!reducedMotion && !revealDone) {
            const elapsed =
              now - startedAt - BOOSTED_TVL_START_DELAY_MS - boostedTvlLitDelayMs(bar, row);
            if (elapsed <= 0) alpha = 0;
            else alpha = Math.min(1, elapsed / BOOSTED_TVL_FADE_MS);
          }

          if (alpha <= 0) {
            drawDot(x, y, BOOSTED_TVL_GRID_DOT_COLOR, 0.5);
            continue;
          }

          if (!reducedMotion && revealDone) {
            alpha *= idleBarAlpha(col, row, barIndex, now);
          }

          drawDot(x, y, bar.color, alpha * 0.95);
        }
      }

      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      drawAt(now, startedAt);
      if (!reducedMotion) {
        if (!revealDone && animating && now - startedAt >= boostedTvlAnimationTotalMs()) {
          revealDone = true;
          idleStartedAt = now;
        }
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    syncLayout();
    const startedAt = performance.now();
    idleStartedAt = startedAt + boostedTvlAnimationTotalMs();

    const ro = new ResizeObserver(() => {
      syncLayout();
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
        shell ? "h-full min-h-0 w-full" : "w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={shell ? undefined : { aspectRatio: `${LAYOUT_W} / ${LAYOUT_H}` }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
