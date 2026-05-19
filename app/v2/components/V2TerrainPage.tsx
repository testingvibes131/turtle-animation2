"use client";

import Link from "next/link";
import { useState } from "react";
import { MarkerMotionDebugControls } from "@/app/v2/components/MarkerMotionDebugControls";
import { TerrainScene } from "@/app/v2/components/TerrainScene";
import type { MarkerMotionMode } from "@/app/v2/lib/markerMode";

export function V2TerrainPage() {
  const [markerMotion, setMarkerMotion] =
    useState<MarkerMotionMode>("fixed-offsetting");
  const [showDebugZone, setShowDebugZone] = useState(false);

  return (
    <main className="relative h-screen w-full bg-black text-[#f0f0f0]">
      <div className="absolute inset-0 z-0">
        <TerrainScene
          markerMotion={markerMotion}
          showDebugZone={showDebugZone}
        />
      </div>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#888]">
            v2 · APR terrain
          </p>
          <h1 className="mt-1 text-lg font-medium text-white">
            Opportunity grid
          </h1>
          <p className="mt-1 max-w-sm text-xs text-[#999]">
            Wireframe grid terrain — line height is estimated APR from{" "}
            <code className="text-[#ccc]">turtle-opportunities.csv</code>.
          </p>
        </div>
        <Link
          href="/"
          className="pointer-events-auto rounded-full border border-[#333] px-3 py-1.5 text-xs text-[#ccc] transition-colors hover:border-[#666] hover:text-white"
        >
          Home
        </Link>
      </header>
      <MarkerMotionDebugControls
        mode={markerMotion}
        onChange={setMarkerMotion}
        showDebugZone={showDebugZone}
        onShowDebugZoneChange={setShowDebugZone}
      />
    </main>
  );
}
