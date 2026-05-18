"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { sampleHeightAt } from "@/app/v2/lib/heightField";
import type { PreparedTerrain } from "@/app/v2/lib/terrainGeometry";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";

const BASE_SPHERE_RADIUS_RATIO = 0.07;
const TOP_SPHERE_RADIUS_RATIO = 0.045;
const STICK_GEO = new THREE.CylinderGeometry(1, 1, 1, 8);
const TOP_SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);

/** Pole height above the base sphere (scales with cell pitch). */
const FLAG_POLE_HEIGHT_RATIO = 0.95;
const STICK_RADIUS_RATIO = 0.014;
const STICK_MIN_HEIGHT = 0.15;
const COLOR_FEATURED = 0x73f36c;
const COLOR_STICK = 0x4a9a44;

type FeaturedFlagMarkersProps = {
  featured: TerrainCell[];
  prepared: PreparedTerrain;
  cellPitch: number;
  stickRef: RefObject<THREE.InstancedMesh | null>;
  topRef: RefObject<THREE.InstancedMesh | null>;
};

export function FeaturedFlagMarkers({
  featured,
  prepared,
  cellPitch,
  stickRef,
  topRef,
}: FeaturedFlagMarkersProps) {
  const { field, cols, rows } = prepared;
  const count = featured.length;

  const stickMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLOR_STICK }),
    [],
  );
  const topMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLOR_FEATURED }),
    [],
  );

  useLayoutEffect(() => {
    const stickMesh = stickRef.current;
    const topMesh = topRef.current;
    if (!stickMesh || !topMesh || count === 0) return;

    const dummy = new THREE.Object3D();
    const baseR = cellPitch * BASE_SPHERE_RADIUS_RATIO;
    const topR = cellPitch * TOP_SPHERE_RADIUS_RATIO;
    const stickR = cellPitch * STICK_RADIUS_RATIO;
    const poleH = cellPitch * FLAG_POLE_HEIGHT_RATIO;

    featured.forEach((cell, i) => {
      const terrainY = sampleHeightAt(field, cols, rows, cell.col, cell.row);
      /** Match base sphere center in `OpportunityMarkers`. */
      const yBaseCenter = terrainY;
      /** Top of base sphere (stick foot). */
      const yBaseTop = yBaseCenter + baseR;
      const poleHeight = Math.max(STICK_MIN_HEIGHT, poleH);
      const yStickCenter = yBaseTop + poleHeight * 0.5;
      const yTop = yBaseTop + poleHeight + topR;

      dummy.position.set(cell.x, yStickCenter, cell.z);
      dummy.scale.set(stickR, poleHeight, stickR);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      stickMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(cell.x, yTop, cell.z);
      dummy.scale.setScalar(topR);
      dummy.updateMatrix();
      topMesh.setMatrixAt(i, dummy.matrix);
    });

    stickMesh.count = count;
    topMesh.count = count;
    stickMesh.instanceMatrix.needsUpdate = true;
    topMesh.instanceMatrix.needsUpdate = true;
  }, [featured, cellPitch, count, field, cols, rows, stickRef, topRef]);

  useEffect(() => {
    return () => {
      stickMat.dispose();
      topMat.dispose();
    };
  }, [stickMat, topMat]);

  if (count === 0) return null;

  return (
    <>
      <instancedMesh
        ref={stickRef}
        args={[STICK_GEO, stickMat, count]}
        frustumCulled={false}
        renderOrder={2}
      />
      <instancedMesh
        ref={topRef}
        args={[TOP_SPHERE_GEO, topMat, count]}
        frustumCulled={false}
        renderOrder={3}
      />
    </>
  );
}
