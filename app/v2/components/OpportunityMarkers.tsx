"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import * as THREE from "three";
import type { GridLayout, TerrainCell } from "@/app/v2/lib/gridLayout";
import { getSphereMarkerPose } from "@/app/v2/lib/markerPosition";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";
import { FeaturedFlagMarkers } from "@/app/v2/components/FeaturedFlagMarkers";

const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const RADIUS_RATIO = 0.07;

const COLOR_REST = 0xffffff;
const COLOR_FEATURED = 0x73f36c;

type OpportunityMarkersProps = {
  layout: GridLayout;
  waveRef: RefObject<TerrainWaveSnapshot>;
};

function splitByFeatured(cells: TerrainCell[]) {
  const featured: TerrainCell[] = [];
  const rest: TerrainCell[] = [];
  for (const cell of cells) {
    (cell.featured ? featured : rest).push(cell);
  }
  return { featured, rest };
}

function MarkerSpheres({
  cells,
  color,
  cellPitch,
  meshRef,
  waveRef,
  centerOnTerrain = false,
}: {
  cells: TerrainCell[];
  color: number;
  cellPitch: number;
  meshRef: RefObject<THREE.InstancedMesh | null>;
  waveRef: RefObject<TerrainWaveSnapshot>;
  centerOnTerrain?: boolean;
}) {
  const count = cells.length;

  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color }),
    [color],
  );

  const write = useCallback(() => {
    const mesh = meshRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!mesh || !prepared || count === 0) return;

    const dummy = new THREE.Object3D();
    const radius = cellPitch * RADIUS_RATIO;

    cells.forEach((cell, i) => {
      const { x, y, z } = getSphereMarkerPose(
        cell,
        prepared,
        elapsed,
        centerOnTerrain,
      );
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells, cellPitch, centerOnTerrain, count, meshRef, waveRef]);

  useLayoutEffect(() => {
    write();
  }, [write]);

  useFrame(() => {
    write();
  });

  useEffect(() => () => material.dispose(), [material]);

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[SPHERE_GEO, material, count]}
      frustumCulled={false}
    />
  );
}

function cellFromHit(
  hit: THREE.Intersection,
  restMesh: THREE.InstancedMesh | null,
  featuredMesh: THREE.InstancedMesh | null,
  stickMesh: THREE.InstancedMesh | null,
  topMesh: THREE.InstancedMesh | null,
  rest: TerrainCell[],
  featured: TerrainCell[],
): TerrainCell | null {
  if (hit.instanceId === undefined) return null;
  const i = hit.instanceId;
  if (featuredMesh && hit.object === featuredMesh) {
    return featured[i] ?? null;
  }
  if (stickMesh && hit.object === stickMesh) {
    return featured[i] ?? null;
  }
  if (topMesh && hit.object === topMesh) {
    return featured[i] ?? null;
  }
  if (restMesh && hit.object === restMesh) {
    return rest[i] ?? null;
  }
  return null;
}

function MarkerHover({
  restMeshRef,
  featuredMeshRef,
  stickRef,
  topRef,
  rest,
  featured,
}: {
  restMeshRef: RefObject<THREE.InstancedMesh | null>;
  featuredMeshRef: RefObject<THREE.InstancedMesh | null>;
  stickRef: RefObject<THREE.InstancedMesh | null>;
  topRef: RefObject<THREE.InstancedMesh | null>;
  rest: TerrainCell[];
  featured: TerrainCell[];
}) {
  const { raycaster, pointer, camera, gl } = useThree();
  const lastIdRef = useRef<string | null>(null);

  useFrame(() => {
    const restMesh = restMeshRef.current;
    const featuredMesh = featuredMeshRef.current;
    const stickMesh = stickRef.current;
    const topMesh = topRef.current;
    if (!restMesh && !featuredMesh && !stickMesh && !topMesh) return;

    raycaster.setFromCamera(pointer, camera);
    const hits: THREE.Intersection[] = [];
    if (restMesh) hits.push(...raycaster.intersectObject(restMesh, false));
    if (featuredMesh) hits.push(...raycaster.intersectObject(featuredMesh, false));
    if (stickMesh) hits.push(...raycaster.intersectObject(stickMesh, false));
    if (topMesh) hits.push(...raycaster.intersectObject(topMesh, false));
    hits.sort((a, b) => a.distance - b.distance);

    const cell =
      hits.length > 0
        ? cellFromHit(
            hits[0]!,
            restMesh,
            featuredMesh,
            stickMesh,
            topMesh,
            rest,
            featured,
          )
        : null;

    const nextId = cell?.id ?? null;
    gl.domElement.style.cursor = cell ? "pointer" : "";

    if (nextId === lastIdRef.current) return;
    lastIdRef.current = nextId;

    if (!cell) return;

    console.log({
      name: cell.name,
      curator: cell.curator,
      apr: cell.apr,
    });
  });

  useEffect(() => {
    return () => {
      gl.domElement.style.cursor = "";
    };
  }, [gl]);

  return null;
}

export function OpportunityMarkers({ layout, waveRef }: OpportunityMarkersProps) {
  const { cells, cellPitch } = layout;
  const { featured, rest } = useMemo(() => splitByFeatured(cells), [cells]);
  const restMeshRef = useRef<THREE.InstancedMesh>(null);
  const featuredMeshRef = useRef<THREE.InstancedMesh>(null);
  const stickRef = useRef<THREE.InstancedMesh>(null);
  const topRef = useRef<THREE.InstancedMesh>(null);

  if (cells.length === 0) return null;

  return (
    <>
      <MarkerSpheres
        cells={rest}
        color={COLOR_REST}
        cellPitch={cellPitch}
        meshRef={restMeshRef}
        waveRef={waveRef}
      />
      <MarkerSpheres
        cells={featured}
        color={COLOR_FEATURED}
        cellPitch={cellPitch}
        meshRef={featuredMeshRef}
        waveRef={waveRef}
        centerOnTerrain
      />
      <FeaturedFlagMarkers
        featured={featured}
        cellPitch={cellPitch}
        stickRef={stickRef}
        topRef={topRef}
        waveRef={waveRef}
      />
      <MarkerHover
        restMeshRef={restMeshRef}
        featuredMeshRef={featuredMeshRef}
        stickRef={stickRef}
        topRef={topRef}
        rest={rest}
        featured={featured}
      />
    </>
  );
}
