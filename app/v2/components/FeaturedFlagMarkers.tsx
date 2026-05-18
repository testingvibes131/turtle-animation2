"use client";

import { useFrame } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import * as THREE from "three";
import type { TerrainCell } from "@/app/v2/lib/gridLayout";
import { getFeaturedFlagPose } from "@/app/v2/lib/markerPosition";
import type { TerrainWaveSnapshot } from "@/app/v2/lib/terrainWave";

const STICK_GEO = new THREE.CylinderGeometry(1, 1, 1, 8);
const TOP_SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const COLOR_FEATURED = 0x73f36c;
const COLOR_STICK = 0x4a9a44;

type FeaturedFlagMarkersProps = {
  featured: TerrainCell[];
  cellPitch: number;
  stickRef: RefObject<THREE.InstancedMesh | null>;
  topRef: RefObject<THREE.InstancedMesh | null>;
  waveRef: RefObject<TerrainWaveSnapshot>;
};

export function FeaturedFlagMarkers({
  featured,
  stickRef,
  topRef,
  waveRef,
}: FeaturedFlagMarkersProps) {
  const count = featured.length;
  const dummy = useRef(new THREE.Object3D());

  const stickMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLOR_STICK }),
    [],
  );
  const topMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: COLOR_FEATURED }),
    [],
  );

  const write = useCallback(() => {
    const stickMesh = stickRef.current;
    const topMesh = topRef.current;
    const { prepared, elapsed } = waveRef.current;
    if (!stickMesh || !topMesh || !prepared || count === 0) return;

    const d = dummy.current;

    featured.forEach((cell, i) => {
      const flag = getFeaturedFlagPose(cell, prepared, elapsed);

      d.position.set(flag.x, flag.yStickCenter, flag.z);
      d.scale.set(flag.stickRadius, flag.stickHeight, flag.stickRadius);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      stickMesh.setMatrixAt(i, d.matrix);

      d.position.set(flag.x, flag.yTop, flag.z);
      d.scale.setScalar(flag.topRadius);
      d.updateMatrix();
      topMesh.setMatrixAt(i, d.matrix);
    });

    stickMesh.count = count;
    topMesh.count = count;
    stickMesh.instanceMatrix.needsUpdate = true;
    topMesh.instanceMatrix.needsUpdate = true;
  }, [count, featured, stickRef, topRef, waveRef]);

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
