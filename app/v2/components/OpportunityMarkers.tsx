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
import {
  markersMoveWithBelt,
  usesScrolledDnaAtCrossing,
  type MarkerMotionMode,
} from "@/app/v2/lib/markerMode";
import {
  getScrolledDnaSpherePose,
  getSphereMarkerPose,
} from "@/app/v2/lib/markerPosition";
import {
  buildCellLookup,
  sourceCellAtCrossing,
} from "@/app/v2/lib/scrolledCell";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";
import { FeaturedFlagMarkers } from "@/app/v2/components/FeaturedFlagMarkers";

const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const RADIUS_RATIO = 0.07;

const COLOR_REST = 0xffffff;
const COLOR_FEATURED = 0x73f36c;
const _instanceColor = new THREE.Color();

type OpportunityMarkersProps = {
  layout: GridLayout;
  waveRef: RefObject<TerrainWaveSnapshot>;
  markerMotion: MarkerMotionMode;
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
  markersMoveWithBelt,
  centerOnTerrain = false,
}: {
  cells: TerrainCell[];
  color: number;
  cellPitch: number;
  meshRef: RefObject<THREE.InstancedMesh | null>;
  waveRef: RefObject<TerrainWaveSnapshot>;
  markersMoveWithBelt: boolean;
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
        markersMoveWithBelt,
      );
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells, cellPitch, centerOnTerrain, count, markersMoveWithBelt, meshRef, waveRef]);

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

/** Fixed crossing; sphere stays put, scrolled opportunity DNA sets color + height. */
function ScrolledDnaMarkerSpheres({
  cells,
  cols,
  rows,
  cellPitch,
  meshRef,
  waveRef,
}: {
  cells: TerrainCell[];
  cols: number;
  rows: number;
  cellPitch: number;
  meshRef: RefObject<THREE.InstancedMesh | null>;
  waveRef: RefObject<TerrainWaveSnapshot>;
}) {
  const count = cells.length;
  const lookup = useMemo(
    () => buildCellLookup(cells, cols, rows),
    [cells, cols, rows],
  );

  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff }),
    [],
  );

  const write = useCallback(() => {
    const mesh = meshRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!mesh || !prepared || count === 0) return;

    const dummy = new THREE.Object3D();
    const radius = cellPitch * RADIUS_RATIO;

    cells.forEach((cell, i) => {
      const { x, y, z, featured } = getScrolledDnaSpherePose(
        cell,
        prepared,
        elapsed,
        lookup,
      );
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(
        i,
        _instanceColor.setHex(featured ? COLOR_FEATURED : COLOR_REST),
      );
    });

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [cells, cellPitch, count, lookup, meshRef, waveRef]);

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
  dnaMesh: THREE.InstancedMesh | null,
  restMesh: THREE.InstancedMesh | null,
  featuredMesh: THREE.InstancedMesh | null,
  stickMesh: THREE.InstancedMesh | null,
  topMesh: THREE.InstancedMesh | null,
  allCells: TerrainCell[],
  rest: TerrainCell[],
  featured: TerrainCell[],
  flagCells: TerrainCell[],
): TerrainCell | null {
  if (hit.instanceId === undefined) return null;
  const i = hit.instanceId;
  if (dnaMesh && hit.object === dnaMesh) {
    return allCells[i] ?? null;
  }
  if (featuredMesh && hit.object === featuredMesh) {
    return featured[i] ?? null;
  }
  if (stickMesh && hit.object === stickMesh) {
    return flagCells[i] ?? null;
  }
  if (topMesh && hit.object === topMesh) {
    return flagCells[i] ?? null;
  }
  if (restMesh && hit.object === restMesh) {
    return rest[i] ?? null;
  }
  return null;
}

function MarkerHover({
  markerMotion,
  waveRef,
  dnaMeshRef,
  restMeshRef,
  featuredMeshRef,
  stickRef,
  topRef,
  allCells,
  layout,
  rest,
  featured,
  flagCells,
}: {
  markerMotion: MarkerMotionMode;
  waveRef: RefObject<TerrainWaveSnapshot>;
  dnaMeshRef: RefObject<THREE.InstancedMesh | null>;
  restMeshRef: RefObject<THREE.InstancedMesh | null>;
  featuredMeshRef: RefObject<THREE.InstancedMesh | null>;
  stickRef: RefObject<THREE.InstancedMesh | null>;
  topRef: RefObject<THREE.InstancedMesh | null>;
  allCells: TerrainCell[];
  layout: GridLayout;
  rest: TerrainCell[];
  featured: TerrainCell[];
  flagCells: TerrainCell[];
}) {
  const { raycaster, pointer, camera, gl } = useThree();
  const lastIdRef = useRef<string | null>(null);
  const useScrolledDna = usesScrolledDnaAtCrossing(markerMotion);
  const lookup = useMemo(
    () => buildCellLookup(allCells, layout.cols, layout.rows),
    [allCells, layout.cols, layout.rows],
  );

  useFrame(() => {
    const dnaMesh = dnaMeshRef.current;
    const restMesh = restMeshRef.current;
    const featuredMesh = featuredMeshRef.current;
    const stickMesh = stickRef.current;
    const topMesh = topRef.current;
    if (!dnaMesh && !restMesh && !featuredMesh && !stickMesh && !topMesh) {
      return;
    }

    raycaster.setFromCamera(pointer, camera);
    const hits: THREE.Intersection[] = [];
    if (dnaMesh) hits.push(...raycaster.intersectObject(dnaMesh, false));
    if (restMesh) hits.push(...raycaster.intersectObject(restMesh, false));
    if (featuredMesh) hits.push(...raycaster.intersectObject(featuredMesh, false));
    if (stickMesh) hits.push(...raycaster.intersectObject(stickMesh, false));
    if (topMesh) hits.push(...raycaster.intersectObject(topMesh, false));
    hits.sort((a, b) => a.distance - b.distance);

    const peg =
      hits.length > 0
        ? cellFromHit(
            hits[0]!,
            dnaMesh,
            restMesh,
            featuredMesh,
            stickMesh,
            topMesh,
            allCells,
            rest,
            featured,
            flagCells,
          )
        : null;

    const { prepared, elapsed } = waveRef.current;
    const cell =
      peg && useScrolledDna && prepared
        ? (sourceCellAtCrossing(peg, elapsed, lookup) ?? peg)
        : peg;

    const nextId = cell?.id ?? null;
    gl.domElement.style.cursor = cell ? "pointer" : "";

    if (nextId === lastIdRef.current) return;
    lastIdRef.current = nextId;

    if (!cell) return;

    console.log({
      name: cell.name,
      curator: cell.curator,
      apr: cell.apr,
      featured: cell.featured,
    });
  });

  useEffect(() => {
    return () => {
      gl.domElement.style.cursor = "";
    };
  }, [gl]);

  return null;
}

export function OpportunityMarkers({
  layout,
  waveRef,
  markerMotion,
}: OpportunityMarkersProps) {
  const { cells, cellPitch } = layout;
  const moveWithBelt = markersMoveWithBelt(markerMotion);
  const useScrolledDna = usesScrolledDnaAtCrossing(markerMotion);
  const { featured, rest } = useMemo(() => splitByFeatured(cells), [cells]);
  const hasFeaturedOpps = featured.length > 0;
  /** Fixed-offsetting: one flag slot per crossing; visibility follows scrolled DNA. */
  const flagCells = useScrolledDna ? cells : featured;
  const dnaMeshRef = useRef<THREE.InstancedMesh>(null);
  const restMeshRef = useRef<THREE.InstancedMesh>(null);
  const featuredMeshRef = useRef<THREE.InstancedMesh>(null);
  const stickRef = useRef<THREE.InstancedMesh>(null);
  const topRef = useRef<THREE.InstancedMesh>(null);
  const dnaLookup = useMemo(
    () => buildCellLookup(cells, layout.cols, layout.rows),
    [cells, layout.cols, layout.rows],
  );

  if (cells.length === 0) return null;

  return (
    <>
      {useScrolledDna ? (
        <ScrolledDnaMarkerSpheres
          cells={cells}
          cols={layout.cols}
          rows={layout.rows}
          cellPitch={cellPitch}
          meshRef={dnaMeshRef}
          waveRef={waveRef}
        />
      ) : (
        <>
          <MarkerSpheres
            cells={rest}
            color={COLOR_REST}
            cellPitch={cellPitch}
            meshRef={restMeshRef}
            waveRef={waveRef}
            markersMoveWithBelt={moveWithBelt}
          />
          <MarkerSpheres
            cells={featured}
            color={COLOR_FEATURED}
            cellPitch={cellPitch}
            meshRef={featuredMeshRef}
            waveRef={waveRef}
            markersMoveWithBelt={moveWithBelt}
            centerOnTerrain
          />
        </>
      )}
      {hasFeaturedOpps ? (
        <FeaturedFlagMarkers
          featured={flagCells}
          cellPitch={cellPitch}
          stickRef={stickRef}
          topRef={topRef}
          waveRef={waveRef}
          markersMoveWithBelt={moveWithBelt}
          dnaLookup={useScrolledDna ? dnaLookup : undefined}
        />
      ) : null}
      <MarkerHover
        markerMotion={markerMotion}
        waveRef={waveRef}
        dnaMeshRef={dnaMeshRef}
        restMeshRef={restMeshRef}
        featuredMeshRef={featuredMeshRef}
        stickRef={stickRef}
        topRef={topRef}
        allCells={cells}
        layout={layout}
        rest={rest}
        featured={featured}
        flagCells={flagCells}
      />
    </>
  );
}
