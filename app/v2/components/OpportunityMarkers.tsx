"use client";

import { useFrame, useThree } from "@react-three/fiber";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import * as THREE from "three";
import { sampleHeightAt } from "@/app/v2/lib/heightField";
import type { PreparedTerrain } from "@/app/v2/lib/terrainGeometry";
import type { GridLayout, TerrainCell } from "@/app/v2/lib/gridLayout";
import { FeaturedFlagMarkers } from "@/app/v2/components/FeaturedFlagMarkers";

const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const RADIUS_RATIO = 0.07;
const SURFACE_PAD = 1.04;

const COLOR_REST = 0xffffff;
const COLOR_FEATURED = 0x73f36c;

type OpportunityMarkersProps = {
  layout: GridLayout;
  prepared: PreparedTerrain;
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
  prepared,
  cellPitch,
  meshRef,
  centerOnTerrain = false,
}: {
  cells: TerrainCell[];
  color: number;
  prepared: PreparedTerrain;
  cellPitch: number;
  meshRef: RefObject<THREE.InstancedMesh | null>;
  /** Featured: sphere center on terrain Y; others float slightly above. */
  centerOnTerrain?: boolean;
}) {
  const { field, cols, rows } = prepared;
  const count = cells.length;

  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color }),
    [color],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    const dummy = new THREE.Object3D();
    const radius = cellPitch * RADIUS_RATIO;

    cells.forEach((cell, i) => {
      const terrainY = sampleHeightAt(field, cols, rows, cell.col, cell.row);
      const y = centerOnTerrain ? terrainY : terrainY + radius * SURFACE_PAD;
      dummy.position.set(cell.x, y, cell.z);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells, cellPitch, centerOnTerrain, count, field, cols, rows, meshRef]);

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

export function OpportunityMarkers({ layout, prepared }: OpportunityMarkersProps) {
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
        prepared={prepared}
        cellPitch={cellPitch}
        meshRef={restMeshRef}
      />
      <MarkerSpheres
        cells={featured}
        color={COLOR_FEATURED}
        prepared={prepared}
        cellPitch={cellPitch}
        meshRef={featuredMeshRef}
        centerOnTerrain
      />
      <FeaturedFlagMarkers
        featured={featured}
        prepared={prepared}
        cellPitch={cellPitch}
        stickRef={stickRef}
        topRef={topRef}
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
