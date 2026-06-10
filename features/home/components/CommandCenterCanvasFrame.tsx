"use client";

import { useRef } from "react";
import {
  commandCenterVisualFrameCanvasClass,
  commandCenterVisualFrameInnerClass,
} from "@/features/home/components/commandCenterVisualFrame";
import {
  useCommandCenterCanvasLoop,
  type CommandCenterFrameArgs,
} from "@/features/home/hooks/useCommandCenterCanvasLoop";

type Props = {
  frameClassName: string;
  onFrame: (args: CommandCenterFrameArgs) => void;
};

export function CommandCenterCanvasFrame({ frameClassName, onFrame }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useCommandCenterCanvasLoop(onFrame, containerRef, canvasRef);

  return (
    <div className={frameClassName}>
      <div ref={containerRef} className={commandCenterVisualFrameInnerClass}>
        <canvas
          ref={canvasRef}
          className={`${commandCenterVisualFrameCanvasClass} theme-invert`}
        />
      </div>
    </div>
  );
}
