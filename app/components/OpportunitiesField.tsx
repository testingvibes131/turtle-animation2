"use client";

import { Leva, useControls } from "leva";
import { TerrainScene } from "@/app/v2/components/TerrainScene";
import {
  MARKER_MOTION_OPTIONS,
  type MarkerMotionMode,
} from "@/app/lib/markerMode";
import { useTerrainVisualControls } from "@/app/v2/hooks/useTerrainVisualControls";

const MARKER_MOTION_VALUES = MARKER_MOTION_OPTIONS.map((o) => o.mode);

export default function OpportunitiesField() {
  const { mode: markerMotion } = useControls("Marker motion (debug)", {
    mode: {
      value: "belt" as MarkerMotionMode,
      options: MARKER_MOTION_VALUES,
    },
  });

  const { showBlueCircle: showDebugZone } = useControls("Zone (debug)", {
    showBlueCircle: { value: false, label: "Blue circle" },
  });

  const { enabled: orbitEnabled } = useControls("Orbit", {
    enabled: { value: true, label: "Orbit controls" },
  });

  const visuals = useTerrainVisualControls();

  return (
    <>
      <Leva collapsed />
      <div className="fixed inset-0 z-0 touch-none">
        <TerrainScene
          markerMotion={markerMotion}
          showDebugZone={showDebugZone}
          orbitEnabled={orbitEnabled}
          visuals={visuals}
        />
      </div>
    </>
  );
}
