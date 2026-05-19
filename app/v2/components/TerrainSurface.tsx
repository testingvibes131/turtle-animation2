"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  buildBaseSmoothedField,
  prepareAnimatedTerrain,
} from "@/app/v2/lib/animatedField";
import type { GridLayout } from "@/app/v2/lib/gridLayout";
import {
  markersMoveWithBelt,
  type MarkerMotionMode,
} from "@/app/lib/markerMode";
import {
  buildTerrainWireframeGeometry,
  computeTerrainLineDistancesXZ,
  computeTerrainWireframeVertexColors,
  updateTerrainWireframePositions,
} from "@/app/v2/lib/terrainGeometry";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";
import type { TerrainVisualParams } from "@/app/v2/lib/terrainVisuals";
import { DebugZoneCircle } from "@/app/v2/components/DebugZoneCircle";
import { OpportunityMarkers } from "@/app/v2/components/OpportunityMarkers";
import { buildDebugZone } from "@/app/v2/lib/debugZone";

type TerrainSurfaceProps = {
  layout: GridLayout;
  markerMotion: MarkerMotionMode;
  showDebugZone: boolean;
  visuals: TerrainVisualParams;
};

export function TerrainSurface({
  layout,
  markerMotion,
  showDebugZone,
  visuals,
}: TerrainSurfaceProps) {
  const debugZone = useMemo(() => buildDebugZone(layout), [layout]);
  const baseField = useMemo(() => buildBaseSmoothedField(layout), [layout]);
  const waveRef = useRef<TerrainWaveSnapshot>({ prepared: null, elapsed: 0 });
  const visualsRef = useRef(visuals);
  visualsRef.current = visuals;

  const beltDiagonals = markersMoveWithBelt(markerMotion);
  const wireframeOptions = useMemo(
    () => ({ beltDiagonals }),
    [beltDiagonals],
  );

  const terrainLines = useMemo(() => {
    const prepared = prepareAnimatedTerrain(layout, 0, baseField);
    if (!prepared) return null;
    waveRef.current = { prepared, elapsed: 0 };
    return buildTerrainWireframeGeometry(prepared, wireframeOptions);
  }, [layout, baseField, wireframeOptions]);

  const { cellPitch } = layout;

  const terrainMat = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: visuals.gridOpacity,
        depthWrite: false,
        dashSize: Math.max(visuals.gridDashMin, cellPitch * visuals.gridDashMul),
        gapSize: Math.max(visuals.gridGapMin, cellPitch * visuals.gridGapMul),
      }),
    [cellPitch],
  );

  const terrainGlowMat = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: visuals.gridGlowOpacity,
        depthWrite: false,
        dashSize: Math.max(
          visuals.gridGlowDashMin,
          cellPitch * visuals.gridGlowDashMul,
        ),
        gapSize: Math.max(
          visuals.gridGlowGapMin,
          cellPitch * visuals.gridGlowGapMul,
        ),
      }),
    [cellPitch],
  );

  useEffect(() => {
    const v = visuals;
    terrainMat.opacity = v.gridOpacity;
    terrainMat.dashSize = Math.max(v.gridDashMin, cellPitch * v.gridDashMul);
    terrainMat.gapSize = Math.max(v.gridGapMin, cellPitch * v.gridGapMul);
    terrainMat.needsUpdate = true;

    terrainGlowMat.opacity = v.gridGlowOpacity;
    terrainGlowMat.dashSize = Math.max(
      v.gridGlowDashMin,
      cellPitch * v.gridGlowDashMul,
    );
    terrainGlowMat.gapSize = Math.max(
      v.gridGlowGapMin,
      cellPitch * v.gridGlowGapMul,
    );
    terrainGlowMat.needsUpdate = true;
  }, [visuals, cellPitch, terrainMat, terrainGlowMat]);

  useLayoutEffect(() => {
    const prepared = prepareAnimatedTerrain(layout, 0, baseField);
    if (!prepared || !terrainLines) return;
    updateTerrainWireframePositions(terrainLines, prepared, wireframeOptions);
    computeTerrainLineDistancesXZ(terrainLines);
    computeTerrainWireframeVertexColors(terrainLines, prepared, visualsRef.current);
    waveRef.current = { prepared, elapsed: 0 };
  }, [layout, baseField, terrainLines, wireframeOptions]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const prepared = prepareAnimatedTerrain(layout, elapsed, baseField);
    if (!prepared || !terrainLines) return;
    updateTerrainWireframePositions(terrainLines, prepared, wireframeOptions);
    computeTerrainWireframeVertexColors(terrainLines, prepared, visualsRef.current);
    waveRef.current = { prepared, elapsed };
  });

  useEffect(() => {
    return () => {
      terrainLines?.dispose();
      terrainMat.dispose();
      terrainGlowMat.dispose();
    };
  }, [terrainLines, terrainMat, terrainGlowMat]);

  if (!terrainLines) return null;

  return (
    <group>
      <lineSegments
        geometry={terrainLines}
        material={terrainGlowMat}
        frustumCulled={false}
        dispose={null}
      />
      <lineSegments
        geometry={terrainLines}
        material={terrainMat}
        frustumCulled={false}
        dispose={null}
      />
      <DebugZoneCircle zone={debugZone} visible={showDebugZone} />
      <OpportunityMarkers
        layout={layout}
        waveRef={waveRef}
        markerMotion={markerMotion}
        debugZone={debugZone}
        visuals={visuals}
      />
    </group>
  );
}
