"use client";

import { useFrame, useThree } from "@react-three/fiber";
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
  buildTerrainFloorGeometry,
  buildTerrainWireframeGeometry,
  computeTerrainLineDistancesXZ,
  computeTerrainWireframeVertexColors,
  updateTerrainFloorPositions,
  updateTerrainWireframePositions,
} from "@/app/v2/lib/terrainGeometry";
import { gridDepthFadeRange } from "@/app/v2/lib/markerDepthFade";
import { layoutTerrainPeak } from "@/app/v2/lib/terrainHeightSample";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";
import {
  gridDotSizesFromVisuals,
  type TerrainVisualParams,
} from "@/app/v2/lib/terrainVisuals";
import { OpportunityMarkers } from "@/app/v2/components/OpportunityMarkers";

type TerrainSurfaceProps = {
  layout: GridLayout;
  markerMotion: MarkerMotionMode;
  visuals: TerrainVisualParams;
};

export function TerrainSurface({
  layout,
  markerMotion,
  visuals,
}: TerrainSurfaceProps) {
  const camera = useThree((s) => s.camera);
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

  const showFloor = layout.cols * layout.rows <= 10_000;

  const terrainFloor = useMemo(() => {
    if (!showFloor) return null;
    const prepared = prepareAnimatedTerrain(layout, 0, baseField);
    if (!prepared) return null;
    return buildTerrainFloorGeometry(prepared, wireframeOptions);
  }, [layout, baseField, wireframeOptions, showFloor]);

  const { cellPitch } = layout;

  const floorMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const terrainMat = useMemo(() => {
    const { dotSize, dotGap } = gridDotSizesFromVisuals(cellPitch, visuals);
    return new THREE.LineDashedMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: visuals.gridOpacity,
      depthWrite: false,
      dashSize: dotSize,
      gapSize: dotGap,
    });
  }, [cellPitch, visuals]);

  useEffect(() => {
    const v = visuals;
    const { dotSize, dotGap } = gridDotSizesFromVisuals(cellPitch, v);
    terrainMat.opacity = v.gridOpacity;
    terrainMat.dashSize = dotSize;
    terrainMat.gapSize = dotGap;
    terrainMat.needsUpdate = true;
  }, [visuals, cellPitch, terrainMat]);

  const terrainPeak = useMemo(() => layoutTerrainPeak(layout), [layout]);

  const refreshGridColors = (
    geometry: THREE.BufferGeometry,
    camera: THREE.Camera,
    v: TerrainVisualParams,
  ) => {
    computeTerrainWireframeVertexColors(
      geometry,
      camera.position,
      gridDepthFadeRange(layout.extent, terrainPeak, v),
      v.depthFadeMinOpacity,
    );
  };

  useLayoutEffect(() => {
    const prepared = prepareAnimatedTerrain(layout, 0, baseField);
    if (!prepared || !terrainLines) return;
    updateTerrainWireframePositions(terrainLines, prepared, wireframeOptions);
    computeTerrainLineDistancesXZ(terrainLines);
    if (terrainFloor) {
      updateTerrainFloorPositions(terrainFloor, prepared, wireframeOptions);
    }
    refreshGridColors(terrainLines, camera, visualsRef.current);
    waveRef.current = { prepared, elapsed: 0 };
  }, [
    layout,
    baseField,
    terrainLines,
    terrainFloor,
    wireframeOptions,
    camera,
    layout.extent,
  ]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime;
    const prepared = prepareAnimatedTerrain(layout, elapsed, baseField);
    if (!prepared || !terrainLines) return;

    updateTerrainWireframePositions(terrainLines, prepared, wireframeOptions);
    if (terrainFloor) {
      updateTerrainFloorPositions(terrainFloor, prepared, {
        ...wireframeOptions,
        refreshColors: false,
      });
    }
    refreshGridColors(terrainLines, state.camera, visualsRef.current);
    waveRef.current = { prepared, elapsed };
  });

  useEffect(() => {
    return () => {
      terrainLines?.dispose();
      terrainFloor?.dispose();
      terrainMat.dispose();
      floorMat.dispose();
    };
  }, [terrainLines, terrainFloor, terrainMat, floorMat]);

  if (!terrainLines) return null;

  return (
    <group>
      {terrainFloor ? (
        <mesh
          geometry={terrainFloor}
          material={floorMat}
          frustumCulled={false}
          renderOrder={0}
        />
      ) : null}
      <lineSegments
        geometry={terrainLines}
        material={terrainMat}
        frustumCulled={false}
        dispose={null}
      />
      <OpportunityMarkers
        layout={layout}
        waveRef={waveRef}
        markerMotion={markerMotion}
        visuals={visuals}
      />
    </group>
  );
}
