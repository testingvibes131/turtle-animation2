"use client";

import { useEffect, useRef } from "react";
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
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    loadCommandCenterTurtleImage();
    loadCommandCenterAlertDotImage();

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    let lastTime = performance.now();

    const frame = (now: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const timeS = (now - startTimeRef.current) / 1000;

      const size = resizeCanvas(canvas, ctx, container);
      if (size) {
        onFrameRef.current({
          ctx,
          width: size.width,
          height: size.height,
          dt,
          timeS,
        });
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    const observer = new ResizeObserver(() => {
      resizeCanvas(canvas, ctx, container);
    });
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return { containerRef, canvasRef };
}
