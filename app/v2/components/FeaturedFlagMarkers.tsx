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
import {
  LineMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from "three-stdlib";
import type { DebugZone } from "@/app/v2/lib/debugZone";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import { getFeaturedFlagPose } from "@/app/v2/lib/markerPosition";
import { isFeaturedAtCrossing } from "@/app/v2/lib/scrolledCell";
import {
  COLOR_FEATURED,
  COLOR_STICK,
  stickDashSizes,
} from "@/app/v2/lib/markerVisuals";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";

const TOP_SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);

type FeaturedFlagMarkersProps = {
  featured: TerrainCell[];
  cellPitch: number;
  stickRef: RefObject<LineSegments2 | null>;
  topRef: RefObject<THREE.InstancedMesh | null>;
  waveRef: RefObject<TerrainWaveSnapshot>;
  markersMoveWithBelt: boolean;
  debugZone: DebugZone;
  /** When set, show a flag on any crossing whose scrolled DNA is featured. */
  dnaLookup?: (TerrainCell | undefined)[][];
};

export function FeaturedFlagMarkers({
  featured,
  cellPitch,
  stickRef,
  topRef,
  waveRef,
  markersMoveWithBelt,
  debugZone,
  dnaLookup,
}: FeaturedFlagMarkersProps) {
  const count = featured.length;
  const dummy = useRef(new THREE.Object3D());
  const size = useThree((s) => s.size);

  const positions = useMemo(
    () => new Float32Array(Math.max(count, 1) * 6),
    [count],
  );

  const lineGeo = useMemo(() => {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(positions);
    return geo;
  }, [positions]);

  const { dashSize, gapSize, lineWidth } = useMemo(
    () => stickDashSizes(cellPitch),
    [cellPitch],
  );

  const stickMat = useMemo(() => {
    const mat = new LineMaterial({
      color: COLOR_STICK,
      linewidth: lineWidth,
      dashed: true,
      dashSize,
      gapSize,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    mat.defines.USE_DASH = "";
    return mat;
  }, [dashSize, gapSize, lineWidth]);

  useLayoutEffect(() => {
    stickMat.resolution.set(size.width, size.height);
  }, [size.height, size.width, stickMat]);

  const topMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLOR_FEATURED }),
    [],
  );

  const stickLines = useMemo(() => {
    const lines = new LineSegments2();
    lines.geometry = lineGeo;
    lines.material = stickMat;
    return lines;
  }, [lineGeo, stickMat]);

  const aliveRef = useRef(true);

  useLayoutEffect(() => {
    aliveRef.current = true;
    stickRef.current = stickLines;
    return () => {
      aliveRef.current = false;
      if (stickRef.current === stickLines) {
        stickRef.current = null;
      }
    };
  }, [stickLines, stickRef]);

  const write = useCallback(() => {
    if (!aliveRef.current) return;

    const topMesh = topRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!topMesh || !prepared || count === 0) {
      return;
    }

    const d = dummy.current;

    featured.forEach((cell, i) => {
      const base = i * 6;
      const show =
        !dnaLookup || isFeaturedAtCrossing(cell, elapsed, dnaLookup);

      if (!show) {
        positions[base] = cell.x;
        positions[base + 1] = 0;
        positions[base + 2] = cell.z;
        positions[base + 3] = cell.x;
        positions[base + 4] = 0;
        positions[base + 5] = cell.z;
        d.position.set(cell.x, 0, cell.z);
        d.scale.setScalar(0);
        d.updateMatrix();
        topMesh.setMatrixAt(i, d.matrix);
        return;
      }

      const flag = getFeaturedFlagPose(
        cell,
        prepared,
        elapsed,
        markersMoveWithBelt,
        debugZone,
      );
      const yBottom = flag.yStickCenter - flag.stickHeight * 0.5;
      const yTop = flag.yStickCenter + flag.stickHeight * 0.5;

      positions[base] = flag.x;
      positions[base + 1] = yBottom;
      positions[base + 2] = flag.z;
      positions[base + 3] = flag.x;
      positions[base + 4] = yTop;
      positions[base + 5] = flag.z;

      d.position.set(flag.x, flag.yTop, flag.z);
      d.scale.setScalar(flag.topRadius);
      d.updateMatrix();
      topMesh.setMatrixAt(i, d.matrix);
    });

    const slice = positions.subarray(0, count * 6);
    let geo = stickLines.geometry as LineSegmentsGeometry | null;
    if (!geo || geo !== lineGeo) {
      stickLines.geometry = lineGeo;
      geo = lineGeo;
    }

    const instanceStart = geo.attributes?.instanceStart;
    const instanceBuf =
      instanceStart instanceof THREE.InterleavedBufferAttribute
        ? instanceStart.data
        : undefined;
    if (instanceBuf?.array) {
      instanceBuf.array.set(slice);
      instanceBuf.needsUpdate = true;
    } else {
      geo.setPositions(slice);
    }

    if (stickLines.geometry) {
      stickLines.computeLineDistances();
    }

    topMesh.count = count;
    topMesh.instanceMatrix.needsUpdate = true;
  }, [
    count,
    dnaLookup,
    debugZone,
    featured,
    lineGeo,
    markersMoveWithBelt,
    positions,
    stickLines,
    topRef,
    waveRef,
  ]);

  useLayoutEffect(() => {
    write();
  }, [write]);

  useFrame(() => {
    write();
  });

  useEffect(() => {
    return () => {
      stickMat.dispose();
      topMat.dispose();
      lineGeo.dispose();
    };
  }, [lineGeo, stickMat, topMat]);

  if (count === 0) return null;

  return (
    <>
      <primitive object={stickLines} frustumCulled={false} renderOrder={2} />
      <instancedMesh
        ref={topRef}
        args={[TOP_SPHERE_GEO, topMat, count]}
        frustumCulled={false}
        renderOrder={3}
      />
    </>
  );
}
