"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  buildHorizonGridGeometry,
  buildTerrainWireframeGeometry,
  prepareTerrain,
} from "@/app/v2/lib/terrainGeometry";
import type { GridLayout } from "@/app/v2/lib/gridLayout";
import { OpportunityMarkers } from "@/app/v2/components/OpportunityMarkers";

type TerrainSurfaceProps = {
  layout: GridLayout;
};

export function TerrainSurface({ layout }: TerrainSurfaceProps) {
  const prepared = useMemo(() => prepareTerrain(layout), [layout]);

  const terrainLines = useMemo(
    () => (prepared ? buildTerrainWireframeGeometry(prepared) : null),
    [prepared],
  );

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

  useEffect(() => {
    return () => {
      terrainLines?.dispose();
      horizonLines?.dispose();
      terrainMat.dispose();
      terrainGlowMat.dispose();
      horizonMat.dispose();
    };
  }, [terrainLines, horizonLines, terrainMat, terrainGlowMat, horizonMat]);

  if (!prepared || !terrainLines) return null;

  return (
    <group>
      {horizonLines ? (
        <lineSegments geometry={horizonLines} material={horizonMat} />
      ) : null}
      <lineSegments geometry={terrainLines} material={terrainGlowMat} />
      <lineSegments geometry={terrainLines} material={terrainMat} />
      <OpportunityMarkers layout={layout} prepared={prepared} />
    </group>
  );
}
