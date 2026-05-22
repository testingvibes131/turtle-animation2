"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PerlinBlobVisualParams } from "@/app/sketch/hooks/useNoiseSphereControls";
import { billboardToCamera } from "@/app/sketch/lib/billboardToCamera";
import {
  type IcosahedronVertexData,
  type PerlinBlobParams,
} from "@/app/sketch/lib/perlinBlob";
import { RENDER_PARTNER_ORBIT } from "@/app/sketch/lib/sketchRenderOrder";
import { worldScaleForScreenPx } from "@/app/sketch/lib/screenSpaceScale";
import { computeZoneMarkerLayout } from "@/app/sketch/lib/zoneMarkerTransform";

const _worldPos = new THREE.Vector3();

/** Outer ring diameter vs highlighted partner sphere diameter (screen px). */
const ORBIT_SIZE_VS_SPHERE = 1.9;

export type OrbitRingTarget = {
  vertexIndex: number;
  scaleMul: number;
};

type PartnerOrbitRingProps = {
  target: OrbitRingTarget;
  color: number;
  vertices: IcosahedronVertexData;
  params: PerlinBlobVisualParams;
  pointRadius: number;
  blobAnimTimeRef?: React.MutableRefObject<number>;
};

function PartnerOrbitRing({
  target,
  color,
  vertices,
  params,
  pointRadius,
  blobAnimTimeRef,
}: PartnerOrbitRingProps) {
  const rootRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        toneMapped: false,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
      }),
    [color],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const root = rootRef.current;
    const mesh = meshRef.current;
    if (!root || !mesh) return;

    const blobParams: PerlinBlobParams = {
      ...params,
      time:
        blobAnimTimeRef?.current ??
        state.clock.elapsedTime * params.timeSpeed,
    };

    const maxDisp =
      (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
    const extent = params.radius + maxDisp;
    const layout = computeZoneMarkerLayout(
      vertices,
      target.vertexIndex,
      blobParams,
      pointRadius,
      target.scaleMul,
      state.camera,
      root.parent,
      extent,
      params.depthSizeNearOffset,
      params.depthSizeFarOffset,
      params.depthSizeMinMul,
      params.depthSizeMaxMul,
    );

    root.position.copy(layout.localPosition);
    root.rotation.set(0, 0, 0);
    billboardToCamera(mesh, root, state.camera);

    _worldPos.copy(layout.worldPosition);
    const sphereWorld = layout.sphereScale;

    const refPx = 16;
    const refWorld = worldScaleForScreenPx(
      _worldPos,
      refPx,
      state.camera,
      state.size,
    );
    const sphereHalfPx =
      refPx * (sphereWorld / Math.max(refWorld, 1e-8));
    const orbitHalfPx = sphereHalfPx * ORBIT_SIZE_VS_SPHERE;
    const side = worldScaleForScreenPx(
      _worldPos,
      orbitHalfPx,
      state.camera,
      state.size,
    );
    mesh.scale.set(side, side, 1);
  });

  return (
    <group ref={rootRef} renderOrder={RENDER_PARTNER_ORBIT}>
      <mesh ref={meshRef} raycast={() => {}} renderOrder={RENDER_PARTNER_ORBIT}>
        <ringGeometry args={[0.9, 1, 64]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  );
}

export function PartnerOrbitRings({
  targets,
  color,
  vertices,
  params,
  pointRadius,
  blobAnimTimeRef,
}: {
  targets: OrbitRingTarget[];
  color: number;
  vertices: IcosahedronVertexData;
  params: PerlinBlobVisualParams;
  pointRadius: number;
  blobAnimTimeRef?: React.MutableRefObject<number>;
}) {
  return (
    <>
      {targets.map((target) => (
        <PartnerOrbitRing
          key={target.vertexIndex}
          target={target}
          color={color}
          vertices={vertices}
          params={params}
          pointRadius={pointRadius}
          blobAnimTimeRef={blobAnimTimeRef}
        />
      ))}
    </>
  );
}
