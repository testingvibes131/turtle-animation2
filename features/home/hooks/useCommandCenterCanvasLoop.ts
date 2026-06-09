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

    frameId = requestAnimationFrame(frame);

    const resizeObserver = new ResizeObserver(repaint);
    resizeObserver.observe(container);

    const onVisibility = () => {
      if (document.visibilityState === "visible") repaint();
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

    return () => {
      cancelled = true;
      cancelAnimationFrame(retryId);
      teardownRef.current?.();
    };
  }, [canvasRef, containerRef, mountLoop]);
}
