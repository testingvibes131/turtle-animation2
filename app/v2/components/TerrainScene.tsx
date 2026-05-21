"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { OpportunityCameraRig } from "@/app/components/OpportunityCameraRig";
import {
  parseOpportunityRows,
  thinNonFeaturedOpportunities,
} from "@/app/lib/opportunitiesCsv";
import {
  DEFAULT_CAMERA_POSITION,
  DEFAULT_OPPORTUNITY_FOV,
} from "@/app/lib/opportunityCamera";
import { getAprRange } from "@/app/v2/lib/apr";
import { layoutOpportunitiesOnGrid } from "@/app/v2/lib/gridLayout";
import { TerrainSurface } from "@/app/v2/components/TerrainSurface";
import type { MarkerMotionMode } from "@/app/lib/markerMode";
import type { TerrainVisualParams } from "@/app/v2/lib/terrainVisuals";

const CSV_PATH = "/data/turtle-opportunities.csv";
const FOG_COLOR = "#0a0a0a";

function fogRangeForExtent(
  extent: number,
  visuals: TerrainVisualParams,
): [number, number] {
  return [extent * visuals.fogNearMul, extent * visuals.fogFarMul];
}

function SceneContent({
  markerMotion,
  orbitEnabled,
  visuals,
}: {
  markerMotion: MarkerMotionMode;
  orbitEnabled: boolean;
  visuals: TerrainVisualParams;
}) {
  const [rows, setRows] = useState<ReturnType<typeof parseOpportunityRows> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void fetch(CSV_PATH)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) {
          setRows(thinNonFeaturedOpportunities(parseOpportunityRows(text)));
        }
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const aprRange = useMemo(
    () => (rows ? getAprRange(rows) : { min: 0, max: 1 }),
    [rows],
  );

  const layout = useMemo(
    () =>
      rows
        ? layoutOpportunitiesOnGrid(rows, aprRange, {
            layoutAspect: visuals.gridLayoutAspect,
            subdiv: visuals.gridSubdiv,
            featuredSpread: visuals.featuredSpread,
          })
        : null,
    [
      rows,
      aprRange,
      visuals.gridLayoutAspect,
      visuals.gridSubdiv,
      visuals.featuredSpread,
    ],
  );

  if (!layout || layout.cells.length === 0) return null;

  return (
    <>
      <color attach="background" args={[FOG_COLOR]} />
      <fog
        attach="fog"
        args={[FOG_COLOR, ...fogRangeForExtent(layout.extent, visuals)]}
      />
      <ambientLight intensity={1} />
      <OpportunityCameraRig extent={layout.extent} orbitEnabled={orbitEnabled} />
      <TerrainSurface
        layout={layout}
        markerMotion={markerMotion}
        visuals={visuals}
      />
    </>
  );
}

type TerrainSceneProps = {
  markerMotion: MarkerMotionMode;
  orbitEnabled?: boolean;
  visuals: TerrainVisualParams;
};

export function TerrainScene({
  markerMotion,
  orbitEnabled = true,
  visuals,
}: TerrainSceneProps) {
  return (
    <Canvas
      className="h-full w-full touch-none"
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
      <SceneContent
        markerMotion={markerMotion}
        orbitEnabled={orbitEnabled}
        visuals={visuals}
      />
    </Canvas>
  );
}
