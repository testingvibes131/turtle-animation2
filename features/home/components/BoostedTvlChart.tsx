"use client";

import { useEffect, useRef } from "react";
import {
  barRowBounds,
  litInBarShape,
  morphCellAt,
} from "@/features/home/data/boostedTvlBarIdle";
import {
  BOOSTED_TVL_BARS,
  BOOSTED_TVL_FADE_MS,
  BOOSTED_TVL_START_DELAY_MS,
  boostedTvlAnimationTotalMs,
  boostedTvlBarColStart,
  boostedTvlGridCols,
  boostedTvlGridRows,
  boostedTvlLitDelayMs,
  type BoostedTvlBarSpec,
} from "@/features/home/data/boostedTvlLayout";
import {
  alignBarChartLayoutToCanvas,
  chartAlignedBarCellCenter,
  drawChartMutedGrid,
  GRID_DOT_RADIUS,
} from "@/features/home/components/chartCanvasGrid";
import {
  drawVisualCanvasBackground,
  visualCanvasBgClass,
} from "@/features/home/components/commandCenterCanvas";
import { drawChartBarGlow } from "@/features/home/components/chartDotGlow";

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

const LAYOUT_ROWS = boostedTvlGridRows();
const LAYOUT_COLS = boostedTvlGridCols();

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

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let gridCol0 = 0;
    let gridRow0 = 0;
    let gridLayout = alignBarChartLayoutToCanvas(1, 1, LAYOUT_COLS, LAYOUT_ROWS).grid;
    let revealDone = reducedMotion;
    let idleStartedAt = 0;

    const morphStagger = BOOSTED_TVL_BARS.map(
      (_, i) => (i / Math.max(BOOSTED_TVL_BARS.length - 1, 1)) * (IDLE_MORPH_MS - IDLE_BLINK_MS),
    );

    const syncLayout = () => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      if (height <= 0) height = (width * LAYOUT_ROWS) / LAYOUT_COLS;

      const aligned = alignBarChartLayoutToCanvas(
        width,
        height,
        LAYOUT_COLS,
        LAYOUT_ROWS,
      );
      gridLayout = aligned.grid;
      gridCol0 = aligned.gridCol0;
      gridRow0 = aligned.gridRow0;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const layoutCellFromGrid = (gridCol: number, gridRow: number) => ({
      col: gridCol - gridCol0,
      row: gridRow - gridRow0,
    });

    const barCellCenter = (layoutCol: number, layoutRow: number) =>
      chartAlignedBarCellCenter(
        gridLayout,
        gridCol0,
        gridRow0,
        layoutCol,
        layoutRow,
      );

    const barAt = (
      layoutCol: number,
      layoutRow: number,
    ): { bar: BoostedTvlBarSpec; barIndex: number } | null => {
      if (layoutCol < 0 || layoutCol >= LAYOUT_COLS || layoutRow < 0 || layoutRow >= LAYOUT_ROWS) {
        return null;
      }

      for (let i = 0; i < BOOSTED_TVL_BARS.length; i++) {
        const bar = BOOSTED_TVL_BARS[i];
        const startCol = boostedTvlBarColStart(i);
        if (layoutCol < startCol || layoutCol >= startCol + bar.cols) continue;
        const { top, bottom } = barRowBounds(i);
        if (layoutRow >= top && layoutRow < bottom) return { bar, barIndex: i };
      }
      return null;
    };

    const barAtGrid = (gridCol: number, gridRow: number) => {
      const { col, row } = layoutCellFromGrid(gridCol, gridRow);
      return barAt(col, row);
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

    const drawAt = (now: number, startedAt: number) => {
      drawVisualCanvasBackground(ctx, width, height);

      drawChartMutedGrid(
        ctx,
        width,
        height,
        GRID_DOT_RADIUS,
        animating ? (gridCol, gridRow) => barAtGrid(gridCol, gridRow) !== null : undefined,
      );

      if (!animating) return;

      for (let layoutRow = 0; layoutRow < LAYOUT_ROWS; layoutRow++) {
        for (let layoutCol = 0; layoutCol < LAYOUT_COLS; layoutCol++) {
          const hit = barAt(layoutCol, layoutRow);
          if (!hit) continue;

          const { bar, barIndex } = hit;

          if (!reducedMotion && revealDone) {
            const idleA = idleBarAlpha(layoutCol, layoutRow, barIndex, now);
            if (idleA <= 0.04) continue;
          } else if (!litInBarShape(layoutCol, layoutRow, barIndex, "base")) {
            continue;
          }

          let alpha = 1;
          if (!reducedMotion && !revealDone) {
            const elapsed =
              now - startedAt - BOOSTED_TVL_START_DELAY_MS - boostedTvlLitDelayMs(bar, layoutRow);
            if (elapsed <= 0) continue;
            alpha = Math.min(1, elapsed / BOOSTED_TVL_FADE_MS);
          }

          if (!reducedMotion && revealDone) {
            alpha *= idleBarAlpha(layoutCol, layoutRow, barIndex, now);
          }

          const { x, y } = barCellCenter(layoutCol, layoutRow);
          drawChartBarGlow(ctx, x, y, GRID_DOT_RADIUS, alpha * 0.95, bar.color);
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
        `relative overflow-hidden rounded-[15px] outline outline-1 -outline-offset-1 outline-stone-50/10 ${visualCanvasBgClass}`,
        shell ? "h-full min-h-0 w-full" : "w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={shell ? undefined : { aspectRatio: "19 / 14" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
