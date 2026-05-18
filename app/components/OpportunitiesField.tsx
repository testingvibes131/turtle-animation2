"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_OPPORTUNITY_FOV,
  OpportunityDebugControls,
} from "@/app/components/OpportunityDebugControls";
import { OpportunityGridTopographyLand } from "@/app/components/OpportunityGridTopographyLand";
import { parseOpportunityRows, type OpportunityRow } from "@/app/lib/opportunitiesCsv";
import { opportunitiesCsvPath } from "@/app/lib/opportunitiesCsvSource";
import { layoutOpportunitiesGridTopography } from "@/app/lib/opportunityGridTopographyLayout";
import { Leva } from "leva";

const HOVER_PORTAL_Z = 180_000_000;

function SceneGrid({
  rows,
  hoverPortalEl,
}: {
  rows: OpportunityRow[];
  hoverPortalEl: HTMLDivElement | null;
}) {
  const { width, height } = useThree((s) => s.size);
  const layoutAspect =
    width > 1 && height > 1 ? width / height : 16 / 9;
  const layout = useMemo(
    () => layoutOpportunitiesGridTopography(rows, layoutAspect),
    [rows, layoutAspect],
  );

  return (
    <>
      <OpportunityDebugControls extent={layout.extent} />
      <OpportunityGridTopographyLand
        layout={layout}
        hoverPortalEl={hoverPortalEl}
      />
    </>
  );
}

export default function OpportunitiesField() {
  const [rows, setRows] = useState<OpportunityRow[] | null>(null);
  const [hoverPortalEl, setHoverPortalEl] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void fetch(opportunitiesCsvPath())
      .then((r) => r.text())
      .then((raw) => {
        if (cancelled) return;
        setRows(parseOpportunityRows(raw));
      })
      .catch(() => setRows([]));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Leva collapsed />
      <div className="fixed inset-0 z-0">
        {rows && rows.length > 0 ? (
          <>
            <Canvas
              className="absolute inset-0 h-full w-full touch-none"
              camera={{
                position: DEFAULT_CAMERA_POSITION,
                fov: DEFAULT_OPPORTUNITY_FOV,
                near: 0.1,
                far: 12000,
              }}
              dpr={[1, 1.5]}
              gl={{
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
                preserveDrawingBuffer: false,
              }}
            >
              <color attach="background" args={["#0a0a0a"]} />
              <SceneGrid rows={rows} hoverPortalEl={hoverPortalEl} />
            </Canvas>
            <div
              ref={setHoverPortalEl}
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: HOVER_PORTAL_Z }}
              aria-hidden
            />
            {/*
              Hero uses pointer-events-none on the outer section, so without this
              the full-screen canvas would steal clicks above the fold.
            */}
            <div
              className="pointer-events-auto fixed inset-x-0 top-0 z-1 h-1/2 touch-none"
              aria-hidden
            />
          </>
        ) : null}
      </div>
    </>
  );
}
