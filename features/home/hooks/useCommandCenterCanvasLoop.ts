"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import { getCommandCenterCanvasContext } from "@/features/home/components/commandCenterCanvasContext";
import { resizeCanvas } from "@/features/home/components/commandCenterCanvas";
import { loadCommandCenterAlertDotImage } from "@/features/home/components/commandCenterMagnifyingRing";
import { loadCommandCenterTurtleImage } from "@/features/home/components/commandCenterTurtleMark";

export type CommandCenterFrameArgs = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dt: number;
  timeS: number;
};

export function useCommandCenterCanvasLoop(
  onFrame: (args: CommandCenterFrameArgs) => void,
  containerRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) {
  const startTimeRef = useRef<number | null>(null);
  const onFrameRef = useRef(onFrame);
  const teardownRef = useRef<(() => void) | null>(null);
  onFrameRef.current = onFrame;

  const mountLoop = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return false;

    if (teardownRef.current) return true;

    loadCommandCenterTurtleImage();
    loadCommandCenterAlertDotImage();

    const ctx = getCommandCenterCanvasContext(canvas);
    if (!ctx) return true;

    // Reduced motion: skip the rAF loop entirely — paint once and let the
    // resize/visibility repaints keep the static frame fresh (same contract
    // as the CSS @media rules elsewhere). The mount effect below remounts
    // the loop on preference changes, so this sample never goes stale.
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion && startTimeRef.current === null) {
      // Bias the clock past the entrance ramps (~0.85s of connector/presence
      // stagger) so the static paint shows the settled visual, not the empty
      // intro frame.
      startTimeRef.current = performance.now() - 10_000;
    }

    let frameId = 0;
    let lastTime = performance.now();

    const paint = (now: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const timeS = (now - startTimeRef.current) / 1000;

      const size = resizeCanvas(canvas, ctx, container);
      if (!size) return;

      onFrameRef.current({
        ctx,
        width: size.width,
        height: size.height,
        dt,
        timeS,
      });
    };

    const frame = (now: number) => {
      paint(now);
      frameId = requestAnimationFrame(frame);
    };

    const repaint = () => {
      paint(performance.now());
    };

    // Don't start while hidden (background-tab mount) — the rAF would sit
    // queued until visible and onVisibility would start a duplicate loop.
    if (!reducedMotion && document.visibilityState !== "hidden") {
      frameId = requestAnimationFrame(frame);
    }

    const resizeObserver = new ResizeObserver(repaint);
    resizeObserver.observe(container);

    // Reduced motion paints once at mount, before the async hub/alert images
    // decode — repaint a few beats later so they land in the static frame.
    // The 800ms slot also fast-forwards dt-driven runtimes (the alerts sweep
    // accumulates dt, which a lone repaint never provides): a synchronous
    // burst of clamped-dt paints stands in for the loop's first ~3s, and only
    // the final draw ever reaches the screen.
    const settleTimeouts = reducedMotion
      ? [
          window.setTimeout(repaint, 250),
          window.setTimeout(() => {
            for (let i = 0; i < 60; i++) {
              const now = performance.now();
              lastTime = now - 50;
              paint(now);
            }
          }, 800),
          window.setTimeout(repaint, 2000),
        ]
      : [];

    // Hidden tab: rAF is throttled but not free in every browser — stop the
    // loop outright and resume (with a fresh dt baseline) on return. The
    // leading cancel keeps this idempotent: at most one loop ever runs.
    const onVisibility = () => {
      cancelAnimationFrame(frameId);
      if (document.visibilityState === "hidden") return;
      lastTime = performance.now();
      repaint();
      if (!reducedMotion) frameId = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", repaint);
    window.addEventListener("orientationchange", repaint);

    repaint();
    requestAnimationFrame(() => {
      requestAnimationFrame(repaint);
    });

    teardownRef.current = () => {
      cancelAnimationFrame(frameId);
      settleTimeouts.forEach((id) => clearTimeout(id));
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", repaint);
      window.removeEventListener("orientationchange", repaint);
      teardownRef.current = null;
      startTimeRef.current = null;
    };

    return true;
  }, [canvasRef, containerRef]);

  useLayoutEffect(() => {
    let cancelled = false;
    let retryId = 0;
    let attempts = 0;

    const tryMount = () => {
      if (cancelled) return;
      const mounted = mountLoop();
      if (!mounted && attempts < 60) {
        attempts += 1;
        retryId = requestAnimationFrame(tryMount);
      }
    };

    tryMount();

    // Remount on a mid-session reduced-motion toggle so the loop's sampled
    // flag tracks the live preference (the other reduced-motion paths are
    // live via change listeners / CSS media queries).
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const onReducedMotionChange = () => {
      teardownRef.current?.();
      tryMount();
    };
    reducedMotionQuery.addEventListener("change", onReducedMotionChange);

    return () => {
      cancelled = true;
      cancelAnimationFrame(retryId);
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
      teardownRef.current?.();
    };
  }, [canvasRef, containerRef, mountLoop]);
}
