"use client";

import { useEffect, useRef, useState } from "react";
import { initTerrainScene } from "@/features/terrain-hero/lib/initTerrainScene";

export function TerrainExperience() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    return initTerrainScene(container, canvas, () => setHintVisible(false));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative mt-[38px] h-[600px] w-full cursor-grab touch-none select-none"
    >
      <canvas
        ref={canvasRef}
        className="terrain-canvas-mask absolute inset-0 block h-full w-full"
      />
      <p
        className={[
          "pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-small text-ink-faint transition-opacity duration-700",
          hintVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        drag to rotate
      </p>
    </div>
  );
}
