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
  buildHorizonGridGeometry,
  buildTerrainWireframeGeometry,
  updateTerrainWireframePositions,
} from "@/app/v2/lib/terrainGeometry";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";
import { OpportunityMarkers } from "@/app/v2/components/OpportunityMarkers";

type TerrainSurfaceProps = {
  layout: GridLayout;
};

export function TerrainSurface({ layout }: TerrainSurfaceProps) {
  const baseField = useMemo(() => buildBaseSmoothedField(layout), [layout]);
  const waveRef = useRef<TerrainWaveSnapshot>({ prepared: null, elapsed: 0 });

  const terrainLines = useMemo(() => {
    const prepared = prepareAnimatedTerrain(layout, 0, baseField);
    if (!prepared) return null;
    waveRef.current = { prepared, elapsed: 0 };
    return buildTerrainWireframeGeometry(prepared);
  }, [layout, baseField]);

  const horizonLines = useMemo(
    () => buildHorizonGridGeometry(layout, 0),
    [layout],
  );

  const terrainMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0xf0f0f0,
        transparent: true,
        opacity: 0.92,
      }),
    [],
  );

  const terrainGlowMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
      }),
    [],
  );

  const horizonMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0x3a3a3a,
        transparent: true,
        opacity: 0.55,
      }),
    [],
  );

  useLayoutEffect(() => {
    const prepared = prepareAnimatedTerrain(layout, 0, baseField);
    if (!prepared || !terrainLines) return;
    updateTerrainWireframePositions(terrainLines, prepared);
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
      horizonLines?.dispose();
      terrainMat.dispose();
      terrainGlowMat.dispose();
      horizonMat.dispose();
    };
  }, [terrainLines, horizonLines, terrainMat, terrainGlowMat, horizonMat]);

  if (!terrainLines) return null;

  return (
    <group>
      {horizonLines ? (
        <lineSegments
          geometry={horizonLines}
          material={horizonMat}
          frustumCulled={false}
        />
      ) : null}
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
      <OpportunityMarkers layout={layout} waveRef={waveRef} />
    </group>
  );
}
