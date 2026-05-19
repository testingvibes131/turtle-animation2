"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import * as THREE from "three";
import type { LineSegments2 } from "three-stdlib";
import type { GridLayout, TerrainCell } from "@/app/v2/lib/gridLayout";
import {
  markersMoveWithBelt,
  usesScrolledDnaAtCrossing,
  type MarkerMotionMode,
} from "@/app/lib/markerMode";
import {
  getScrolledDnaSpherePose,
  getSphereMarkerPose,
} from "@/app/v2/lib/markerPosition";
import {
  buildCellLookup,
  sourceCellAtCrossing,
} from "@/app/v2/lib/scrolledCell";
import type { DebugZone } from "@/app/v2/lib/debugZone";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";
import { FeaturedFlagMarkers } from "@/app/v2/components/FeaturedFlagMarkers";
import { FeaturedPinLabels } from "@/app/v2/components/FeaturedPinLabels";
import {
  colorFromFeaturedBlend,
  updateScrolledDnaBlends,
} from "@/app/v2/lib/scrolledDnaBlend";
import {
  attachMeshBasicDepthFade,
  createMarkerDepthFadeUniforms,
  markerDepthFadeRange,
  updateMarkerDepthFadeUniforms,
  type MarkerDepthFadeUniforms,
} from "@/app/v2/lib/markerDepthFade";
import type { TerrainVisualParams } from "@/app/v2/lib/terrainVisuals";

const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const _instanceColor = new THREE.Color();
/** Highlight tint for all spheres sharing the hovered curator. */
const CURATOR_HOVER_COLOR = 0x5b9cf5;
const CURATOR_HOVER_SCALE = 2;
const LABEL_GAP_RATIO = 0.18;
/** Inflated pick radius vs rendered sphere (small spheres + belt motion). */
const SPHERE_PICK_RADIUS_MUL = 5;
const SPHERE_PICK_MIN_RATIO = 0.11;

const _pickCenter = new THREE.Vector3();
const _pickClosest = new THREE.Vector3();

const curatorLabelWrap: CSSProperties = {
  pointerEvents: "none",
  userSelect: "none",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  textAlign: "center",
  whiteSpace: "nowrap",
  lineHeight: 1.2,
  color: "#5b9cf5",
  fontSize: 18,
  fontWeight: 600,
  transform: "translate(-50%, -100%)",
  textShadow: "0 1px 10px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.95)",
};

export type CuratorHoverState = {
  curator: string | null;
  /** Grid peg under the pointer (label tracks this, not scrolled source cell). */
  anchorCell: TerrainCell | null;
};

function getSphereHoverStyle(
  cell: TerrainCell,
  hover: CuratorHoverState,
  elapsed: number,
  options: {
    useCrossingCurator: boolean;
    dnaLookup: (TerrainCell | undefined)[][] | null;
  },
): boolean {
  const isAnchor =
    hover.anchorCell !== null && hover.anchorCell.id === cell.id;
  if (!hover.curator) {
    return false;
  }
  if (isAnchor) {
    return true;
  }
  let matchesCurator = cell.curator === hover.curator;
  if (options.useCrossingCurator && options.dnaLookup) {
    const atCrossing = sourceCellAtCrossing(cell, elapsed, options.dnaLookup);
    matchesCurator = atCrossing?.curator === hover.curator;
  }
  return matchesCurator;
}

type OpportunityMarkersProps = {
  layout: GridLayout;
  waveRef: RefObject<TerrainWaveSnapshot>;
  markerMotion: MarkerMotionMode;
  debugZone: DebugZone;
  visuals: TerrainVisualParams;
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
  sphereRadiusRatio,
  meshRef,
  waveRef,
  markersMoveWithBelt,
  debugZone,
  hoverRef,
  useCrossingCurator,
  dnaLookup,
  centerOnTerrain = false,
  depthFadeUniforms,
}: {
  cells: TerrainCell[];
  color: number;
  cellPitch: number;
  sphereRadiusRatio: number;
  meshRef: RefObject<THREE.InstancedMesh | null>;
  waveRef: RefObject<TerrainWaveSnapshot>;
  markersMoveWithBelt: boolean;
  debugZone: DebugZone;
  hoverRef: RefObject<CuratorHoverState>;
  useCrossingCurator: boolean;
  dnaLookup: (TerrainCell | undefined)[][] | null;
  centerOnTerrain?: boolean;
  depthFadeUniforms: MarkerDepthFadeUniforms;
}) {
  const count = cells.length;

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    attachMeshBasicDepthFade(mat, depthFadeUniforms);
    return mat;
  }, [depthFadeUniforms]);

  const write = useCallback(() => {
    const mesh = meshRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!mesh || !prepared || count === 0) return;

    const hover = hoverRef.current;
    const dummy = new THREE.Object3D();

    cells.forEach((cell, i) => {
      const { x, y, z, zoneScale } = getSphereMarkerPose(
        cell,
        prepared,
        elapsed,
        centerOnTerrain,
        markersMoveWithBelt,
        debugZone,
        sphereRadiusRatio,
      );
      const highlighted = getSphereHoverStyle(
        cell,
        hover,
        elapsed,
        { useCrossingCurator, dnaLookup },
      );
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(
        cellPitch *
          sphereRadiusRatio *
          zoneScale *
          (highlighted ? CURATOR_HOVER_SCALE : 1),
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(
        i,
        _instanceColor.setHex(highlighted ? CURATOR_HOVER_COLOR : color),
      );
    });

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [
    cells,
    cellPitch,
    centerOnTerrain,
    color,
    count,
    debugZone,
    dnaLookup,
    hoverRef,
    markersMoveWithBelt,
    meshRef,
    sphereRadiusRatio,
    useCrossingCurator,
    waveRef,
  ]);

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
  cellPitch,
  sphereRadiusRatio,
  restColor,
  featuredColor,
  meshRef,
  waveRef,
  debugZone,
  dnaBlendsRef,
  hoverRef,
  dnaLookup,
  depthFadeUniforms,
}: {
  cells: TerrainCell[];
  cellPitch: number;
  sphereRadiusRatio: number;
  restColor: number;
  featuredColor: number;
  meshRef: RefObject<THREE.InstancedMesh | null>;
  waveRef: RefObject<TerrainWaveSnapshot>;
  debugZone: DebugZone;
  dnaBlendsRef: RefObject<Float32Array>;
  hoverRef: RefObject<CuratorHoverState>;
  dnaLookup: (TerrainCell | undefined)[][];
  depthFadeUniforms: MarkerDepthFadeUniforms;
}) {
  const count = cells.length;

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    attachMeshBasicDepthFade(mat, depthFadeUniforms);
    return mat;
  }, [depthFadeUniforms]);

  const write = useCallback(() => {
    const mesh = meshRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!mesh || !prepared || count === 0) return;

    const dummy = new THREE.Object3D();

    const blends = dnaBlendsRef.current;
    const hover = hoverRef.current;
    const hoverCurator = hover.curator;

    cells.forEach((cell, i) => {
      const blend = blends[i] ?? 0;
      const { x, y, z, zoneScale } = getScrolledDnaSpherePose(
        cell,
        prepared,
        blend,
        debugZone,
        sphereRadiusRatio,
      );
      const highlighted =
        hoverCurator !== null &&
        getSphereHoverStyle(cell, hover, elapsed, {
          useCrossingCurator: true,
          dnaLookup,
        });
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(
        cellPitch *
          sphereRadiusRatio *
          zoneScale *
          (highlighted ? CURATOR_HOVER_SCALE : 1),
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(
        i,
        _instanceColor.setHex(
          highlighted
            ? CURATOR_HOVER_COLOR
            : colorFromFeaturedBlend(blend, restColor, featuredColor),
        ),
      );
    });

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [
    cells,
    cellPitch,
    count,
    debugZone,
    dnaBlendsRef,
    dnaLookup,
    featuredColor,
    hoverRef,
    meshRef,
    restColor,
    sphereRadiusRatio,
    waveRef,
  ]);

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

type SpherePickPose = { x: number; y: number; z: number; radius: number };

function pickSphereCellNearRay(
  ray: THREE.Ray,
  cameraPosition: THREE.Vector3,
  cells: TerrainCell[],
  cellPitch: number,
  getPose: (cell: TerrainCell, index: number) => SpherePickPose,
): TerrainCell | null {
  const minPickRadius = cellPitch * SPHERE_PICK_MIN_RATIO;
  let bestCell: TerrainCell | null = null;
  let bestDepth = Infinity;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    const { x, y, z, radius } = getPose(cell, i);
    const pickRadius = Math.max(radius * SPHERE_PICK_RADIUS_MUL, minPickRadius);

    _pickCenter.set(x, y, z);
    ray.closestPointToPoint(_pickCenter, _pickClosest);
    if (_pickClosest.distanceTo(_pickCenter) > pickRadius) continue;

    const depth = _pickClosest.distanceTo(cameraPosition);
    if (depth < bestDepth) {
      bestDepth = depth;
      bestCell = cell;
    }
  }

  return bestCell;
}

function CuratorHoverLabel({
  hoverRef,
  waveRef,
  markerMotion,
  debugZone,
  allCells,
  cellPitch,
  sphereRadiusRatio,
  dnaBlendsRef,
}: {
  hoverRef: RefObject<CuratorHoverState>;
  waveRef: RefObject<TerrainWaveSnapshot>;
  markerMotion: MarkerMotionMode;
  debugZone: DebugZone;
  allCells: TerrainCell[];
  cellPitch: number;
  sphereRadiusRatio: number;
  dnaBlendsRef: RefObject<Float32Array>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const moveWithBelt = markersMoveWithBelt(markerMotion);
  const useScrolledDna = usesScrolledDnaAtCrossing(markerMotion);
  const [label, setLabel] = useState<string | null>(null);

  useFrame(() => {
    const g = groupRef.current;
    const { curator, anchorCell } = hoverRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!g || !prepared) return;

    if (!curator || !anchorCell) {
      if (label !== null) setLabel(null);
      return;
    }

    if (label !== curator) setLabel(curator);

    const gap = cellPitch * LABEL_GAP_RATIO;
    const cellIndex = allCells.findIndex((c) => c.id === anchorCell.id);
    let x: number;
    let y: number;
    let z: number;
    let radius: number;

    if (useScrolledDna) {
      const blend =
        cellIndex >= 0 ? (dnaBlendsRef.current[cellIndex] ?? 0) : 0;
      const pose = getScrolledDnaSpherePose(
        anchorCell,
        prepared,
        blend,
        debugZone,
        sphereRadiusRatio,
      );
      x = pose.x;
      y = pose.y;
      z = pose.z;
      radius =
        cellPitch * sphereRadiusRatio * pose.zoneScale * CURATOR_HOVER_SCALE;
    } else {
      const pose = getSphereMarkerPose(
        anchorCell,
        prepared,
        elapsed,
        anchorCell.featured,
        moveWithBelt,
        debugZone,
        sphereRadiusRatio,
      );
      x = pose.x;
      y = pose.y;
      z = pose.z;
      radius =
        cellPitch * sphereRadiusRatio * pose.zoneScale * CURATOR_HOVER_SCALE;
    }

    g.position.set(x, y + radius + gap, z);
  });

  if (!label) return <group ref={groupRef} />;

  return (
    <group ref={groupRef}>
      <Html
        occlude={false}
        pointerEvents="none"
        distanceFactor={10}
        zIndexRange={[30, 40]}
        style={curatorLabelWrap}
      >
        <span title={label}>{label}</span>
      </Html>
    </group>
  );
}

function MarkerHover({
  markerMotion,
  waveRef,
  hoverRef,
  allCells,
  layout,
  debugZone,
  cellPitch,
  sphereRadiusRatio,
  dnaBlendsRef,
}: {
  markerMotion: MarkerMotionMode;
  waveRef: RefObject<TerrainWaveSnapshot>;
  hoverRef: RefObject<CuratorHoverState>;
  allCells: TerrainCell[];
  layout: GridLayout;
  debugZone: DebugZone;
  cellPitch: number;
  sphereRadiusRatio: number;
  dnaBlendsRef: RefObject<Float32Array>;
}) {
  const { raycaster, pointer, camera, gl } = useThree();
  const moveWithBelt = markersMoveWithBelt(markerMotion);
  const useScrolledDna = usesScrolledDnaAtCrossing(markerMotion);
  const lookup = useMemo(
    () => buildCellLookup(allCells, layout.cols, layout.rows),
    [allCells, layout.cols, layout.rows],
  );
  const pickFrameRef = useRef(0);

  useFrame(() => {
    pickFrameRef.current += 1;
    if (pickFrameRef.current % 2 !== 0) return;

    const { prepared, elapsed } = waveRef.current;
    if (!prepared || allCells.length === 0) return;

    raycaster.setFromCamera(pointer, camera);

    const getPose = (cell: TerrainCell, index: number): SpherePickPose => {
      if (useScrolledDna) {
        const blend = dnaBlendsRef.current[index] ?? 0;
        const { x, y, z, zoneScale } = getScrolledDnaSpherePose(
          cell,
          prepared,
          blend,
          debugZone,
          sphereRadiusRatio,
        );
        return {
          x,
          y,
          z,
          radius: cellPitch * sphereRadiusRatio * zoneScale,
        };
      }
      const { x, y, z, zoneScale } = getSphereMarkerPose(
        cell,
        prepared,
        elapsed,
        cell.featured,
        moveWithBelt,
        debugZone,
        sphereRadiusRatio,
      );
      return {
        x,
        y,
        z,
        radius: cellPitch * sphereRadiusRatio * zoneScale,
      };
    };

    const peg = pickSphereCellNearRay(
      raycaster.ray,
      camera.position,
      allCells,
      cellPitch,
      getPose,
    );
    const cell =
      peg && useScrolledDna && prepared
        ? (sourceCellAtCrossing(peg, elapsed, lookup) ?? peg)
        : peg;

    gl.domElement.style.cursor = cell ? "pointer" : "";

    const nextCurator = cell?.curator ?? null;
    const prev = hoverRef.current;
    if (
      prev.curator === nextCurator &&
      prev.anchorCell?.id === peg?.id
    ) {
      return;
    }

    hoverRef.current = {
      curator: nextCurator,
      anchorCell: peg,
    };
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
  debugZone,
  visuals,
}: OpportunityMarkersProps) {
  const { cells, cellPitch, extent } = layout;
  const camera = useThree((s) => s.camera);
  const depthFadeUniforms = useMemo(() => createMarkerDepthFadeUniforms(), []);
  const depthFadeRange = useMemo(
    () => markerDepthFadeRange(extent, visuals),
    [extent, visuals],
  );
  const moveWithBelt = markersMoveWithBelt(markerMotion);
  const useScrolledDna = usesScrolledDnaAtCrossing(markerMotion);
  const { featured, rest } = useMemo(() => splitByFeatured(cells), [cells]);
  const hasFeaturedOpps = featured.length > 0;
  /** Fixed-offsetting: one flag slot per crossing; visibility follows scrolled DNA. */
  const flagCells = useScrolledDna ? cells : featured;
  const dnaMeshRef = useRef<THREE.InstancedMesh>(null);
  const restMeshRef = useRef<THREE.InstancedMesh>(null);
  const featuredMeshRef = useRef<THREE.InstancedMesh>(null);
  const stickRef = useRef<LineSegments2>(null);
  const topRef = useRef<THREE.InstancedMesh>(null);
  const dnaLookup = useMemo(
    () => buildCellLookup(cells, layout.cols, layout.rows),
    [cells, layout.cols, layout.rows],
  );

  const dnaBlendsRef = useRef<Float32Array>(new Float32Array(0));
  const hoverRef = useRef<CuratorHoverState>({
    curator: null,
    anchorCell: null,
  });

  useLayoutEffect(() => {
    dnaBlendsRef.current = new Float32Array(cells.length);
  }, [cells.length]);

  useFrame((_, delta) => {
    updateMarkerDepthFadeUniforms(depthFadeUniforms, camera, depthFadeRange);

    if (!useScrolledDna || cells.length === 0) return;
    const { elapsed } = waveRef.current;
    if (dnaBlendsRef.current.length !== cells.length) {
      dnaBlendsRef.current = new Float32Array(cells.length);
    }
    updateScrolledDnaBlends(
      dnaBlendsRef.current,
      cells,
      elapsed,
      dnaLookup,
      layout.cols,
      layout.rows,
      delta,
    );
  });

  if (cells.length === 0) return null;

  return (
    <>
      {useScrolledDna ? (
        <ScrolledDnaMarkerSpheres
          cells={cells}
          cellPitch={cellPitch}
          sphereRadiusRatio={visuals.sphereRadiusRatio}
          restColor={visuals.sphereRestColor}
          featuredColor={visuals.stickColor}
          meshRef={dnaMeshRef}
          waveRef={waveRef}
          debugZone={debugZone}
          dnaBlendsRef={dnaBlendsRef}
          hoverRef={hoverRef}
          dnaLookup={dnaLookup}
          depthFadeUniforms={depthFadeUniforms}
        />
      ) : (
        <>
          <MarkerSpheres
            cells={rest}
            color={visuals.sphereRestColor}
            cellPitch={cellPitch}
            sphereRadiusRatio={visuals.sphereRadiusRatio}
            meshRef={restMeshRef}
            waveRef={waveRef}
            markersMoveWithBelt={moveWithBelt}
            debugZone={debugZone}
            hoverRef={hoverRef}
            useCrossingCurator={false}
            dnaLookup={null}
            depthFadeUniforms={depthFadeUniforms}
          />
          <MarkerSpheres
            cells={featured}
            color={visuals.stickColor}
            cellPitch={cellPitch}
            sphereRadiusRatio={visuals.sphereRadiusRatio}
            meshRef={featuredMeshRef}
            waveRef={waveRef}
            markersMoveWithBelt={moveWithBelt}
            debugZone={debugZone}
            hoverRef={hoverRef}
            useCrossingCurator={false}
            dnaLookup={null}
            centerOnTerrain
            depthFadeUniforms={depthFadeUniforms}
          />
        </>
      )}
      {hasFeaturedOpps ? (
        <>
          <FeaturedFlagMarkers
            featured={flagCells}
            cellPitch={cellPitch}
            visuals={visuals}
            stickRef={stickRef}
            topRef={topRef}
            waveRef={waveRef}
            markersMoveWithBelt={moveWithBelt}
            debugZone={debugZone}
            depthFadeUniforms={depthFadeUniforms}
            depthFadeRange={depthFadeRange}
            dnaLookup={useScrolledDna ? dnaLookup : undefined}
            dnaBlendsRef={useScrolledDna ? dnaBlendsRef : undefined}
          />
          <FeaturedPinLabels
            featured={flagCells}
            cellPitch={cellPitch}
            waveRef={waveRef}
            markersMoveWithBelt={moveWithBelt}
            debugZone={debugZone}
            sphereRadiusRatio={visuals.sphereRadiusRatio}
            depthFadeRange={depthFadeRange}
            dnaLookup={useScrolledDna ? dnaLookup : undefined}
            dnaBlendsRef={useScrolledDna ? dnaBlendsRef : undefined}
          />
        </>
      ) : null}
      <CuratorHoverLabel
        hoverRef={hoverRef}
        waveRef={waveRef}
        markerMotion={markerMotion}
        debugZone={debugZone}
        allCells={cells}
        cellPitch={cellPitch}
        sphereRadiusRatio={visuals.sphereRadiusRatio}
        dnaBlendsRef={dnaBlendsRef}
      />
      <MarkerHover
        markerMotion={markerMotion}
        waveRef={waveRef}
        hoverRef={hoverRef}
        allCells={cells}
        layout={layout}
        debugZone={debugZone}
        cellPitch={cellPitch}
        sphereRadiusRatio={visuals.sphereRadiusRatio}
        dnaBlendsRef={dnaBlendsRef}
      />
    </>
  );
}
