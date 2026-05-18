"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { parseOpportunityRows } from "@/app/lib/opportunitiesCsv";
import { getAprRange } from "@/app/v2/lib/apr";
import { layoutOpportunitiesOnGrid, type GridLayout } from "@/app/v2/lib/gridLayout";
import {
  DEFAULT_SMOOTH_PASSES,
  getTerrainMaxHeight,
} from "@/app/v2/lib/terrainGeometry";
import { TerrainSurface } from "@/app/v2/components/TerrainSurface";
import type { MarkerMotionMode } from "@/app/v2/lib/markerMode";

const CSV_PATH = "/data/turtle-opportunities.csv";

function CameraRig({ layout }: { layout: GridLayout }) {
  const { camera } = useThree();
  const maxH = useMemo(
    () => getTerrainMaxHeight(layout, DEFAULT_SMOOTH_PASSES),
    [layout],
  );
  const targetY = maxH * 0.35;
  const { extent } = layout;

  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.position.set(0, extent * 0.55, extent * 1.05);
    camera.fov = 50;
    camera.near = 0.1;
    camera.far = extent * 20;
    camera.lookAt(0, targetY * 0.65, 0);
    camera.updateProjectionMatrix();
  }, [camera, extent, targetY]);

  return (
    <OrbitControls
      makeDefault
      target={[0, targetY, 0]}
      minDistance={extent * 0.3}
      maxDistance={extent * 4}
    />
  );
}

function SceneContent({ markerMotion }: { markerMotion: MarkerMotionMode }) {
  const { width, height } = useThree((s) => s.size);
  const [rows, setRows] = useState<ReturnType<typeof parseOpportunityRows> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void fetch(CSV_PATH)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setRows(parseOpportunityRows(text));
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

  const aspect = width > 1 && height > 1 ? width / height : 16 / 9;
  const layout = useMemo(
    () =>
      rows ? layoutOpportunitiesOnGrid(rows, aprRange, { aspect }) : null,
    [rows, aprRange, aspect],
  );

  if (!layout || layout.cells.length === 0) return null;

  return (
    <>
      <color attach="background" args={["#0a0a0a"]} />
      <ambientLight intensity={1} />
      <CameraRig layout={layout} />
      <TerrainSurface layout={layout} markerMotion={markerMotion} />
    </>
  );
}

type TerrainSceneProps = {
  markerMotion: MarkerMotionMode;
};

export function TerrainScene({ markerMotion }: TerrainSceneProps) {
  return (
    <Canvas
      className="h-full w-full touch-none"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
    >
      <SceneContent markerMotion={markerMotion} />
    </Canvas>
  );
}
