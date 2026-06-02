"use client";

import { useRef } from "react";
import {
  createBlipIntensityState,
  drawPipelineRadar,
  pipelineRadarLeadingAngle,
  stepPipelineRadarBlips,
} from "@/features/home/components/pipelineRadarDraw";
import { usePipelineRadarLoop } from "@/features/home/hooks/usePipelineRadarLoop";

type Props = {
  className?: string;
  onBlipIntensities?: (intensities: readonly number[]) => void;
};

export function PipelineRadarCanvas({
  className = "",
  onBlipIntensities,
}: Props) {
  const blipIntensitiesRef = useRef(createBlipIntensityState());
  const onBlipIntensitiesRef = useRef(onBlipIntensities);
  onBlipIntensitiesRef.current = onBlipIntensities;

  const { containerRef, canvasRef } = usePipelineRadarLoop(
    ({ ctx, width, height, dt, timeS, reducedMotion }) => {
      const leadingAngle = pipelineRadarLeadingAngle(timeS, reducedMotion);
      stepPipelineRadarBlips(
        blipIntensitiesRef.current,
        dt,
        leadingAngle,
        reducedMotion,
      );
      onBlipIntensitiesRef.current?.(blipIntensitiesRef.current);
      drawPipelineRadar(
        ctx,
        width,
        height,
        timeS,
        reducedMotion,
        blipIntensitiesRef.current,
      );
    },
  );

  return (
    <div
      ref={containerRef}
      className={[
        "relative mx-auto aspect-square w-full max-w-[530px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="img"
      aria-label="Animated radar display"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
