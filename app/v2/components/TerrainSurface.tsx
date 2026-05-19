"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  buildBaseSmoothedField,
  prepareAnimatedTerrain,
} from "@/app/v2/lib/animatedField";
import type { GridLayout } from "@/app/v2/lib/gridLayout";
import type { MarkerMotionMode } from "@/app/v2/lib/markerMode";
import {
  buildTerrainWireframeGeometry,
  computeTerrainLineDistancesXZ,
  updateTerrainWireframePositions,
} from "@/app/v2/lib/terrainGeometry";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";
import { DebugZoneCircle } from "@/app/v2/components/DebugZoneCircle";
import { OpportunityMarkers } from "@/app/v2/components/OpportunityMarkers";
import { buildDebugZone } from "@/app/v2/lib/debugZone";

type TerrainSurfaceProps = {
  layout: GridLayout;
  markerMotion: MarkerMotionMode;
  showDebugZone: boolean;
};

export function TerrainSurface({
  layout,
  markerMotion,
  showDebugZone,
}: TerrainSurfaceProps) {
  const debugZone = useMemo(() => buildDebugZone(layout), [layout]);
  const baseField = useMemo(() => buildBaseSmoothedField(layout), [layout]);
  const waveRef = useRef<TerrainWaveSnapshot>({ prepared: null, elapsed: 0 });

  const terrainLines = useMemo(() => {
    const prepared = prepareAnimatedTerrain(layout, 0, baseField);
    if (!prepared) return null;
    waveRef.current = { prepared, elapsed: 0 };
    return buildTerrainWireframeGeometry(prepared);
  }, [layout, baseField]);

  const { cellPitch } = layout;

  const terrainMat = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        dashSize: Math.max(0.04, cellPitch * 0.14),
        gapSize: Math.max(0.028, cellPitch * 0.09),
      }),
    [cellPitch],
  );

  const terrainGlowMat = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        dashSize: Math.max(0.05, cellPitch * 0.18),
        gapSize: Math.max(0.032, cellPitch * 0.11),
      }),
    [cellPitch],
  );

  useLayoutEffect(() => {
    const prepared = prepareAnimatedTerrain(layout, 0, baseField);
    if (!prepared || !terrainLines) return;
    updateTerrainWireframePositions(terrainLines, prepared);
    computeTerrainLineDistancesXZ(terrainLines);
    waveRef.current = { prepared, elapsed: 0 };
  }, [layout, baseField, terrainLines]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const prepared = prepareAnimatedTerrain(layout, elapsed, baseField);
    if (!prepared || !terrainLines) return;
    updateTerrainWireframePositions(terrainLines, prepared);
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
      />
    </group>
  );
}
