"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PerlinBlobVisualParams } from "@/app/sketch/hooks/useNoiseSphereControls";
import { billboardToCamera } from "@/app/sketch/lib/billboardToCamera";
import {
  displacedVertexPosition,
  type IcosahedronVertexData,
  type PerlinBlobParams,
} from "@/app/sketch/lib/perlinBlob";
import { RENDER_PARTNER_ORBIT } from "@/app/sketch/lib/sketchRenderOrder";
import { worldScaleForScreenPx } from "@/app/sketch/lib/screenSpaceScale";
import { depthSizeMultiplier } from "@/app/sketch/lib/sphereDepthSize";

const _worldPos = new THREE.Vector3();

/** Outer ring diameter vs highlighted partner sphere diameter (screen px). */
const ORBIT_SIZE_VS_SPHERE = 1.9;

type PartnerOrbitRingProps = {
  vertexIndex: number;
  color: number;
  vertices: IcosahedronVertexData;
  params: PerlinBlobVisualParams;
  pointRadius: number;
  partnerScaleMul: number;
};

function PartnerOrbitRing({
  vertexIndex,
  color,
  vertices,
  params,
  pointRadius,
  partnerScaleMul,
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
      time: state.clock.elapsedTime * params.timeSpeed,
    };

    displacedVertexPosition(vertices, vertexIndex, blobParams, root.position);
    root.rotation.set(0, 0, 0);
    billboardToCamera(mesh, root, state.camera);

    root.updateMatrixWorld(true);
    root.getWorldPosition(_worldPos);

    const maxDisp =
      (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
    const extent = params.radius + maxDisp;
    const camDist = state.camera.position.length();
    const sizeNear = camDist - extent * params.depthSizeNearOffset;
    const sizeFar = camDist + extent * params.depthSizeFarOffset;
    const dist = state.camera.position.distanceTo(_worldPos);

    const sphereWorld =
      pointRadius *
      partnerScaleMul *
      depthSizeMultiplier(
        dist,
        sizeNear,
        sizeFar,
        params.depthSizeMinMul,
        params.depthSizeMaxMul,
      );

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
  partnerIndices,
  color,
  vertices,
  params,
  pointRadius,
  partnerScaleMul,
}: {
  partnerIndices: number[];
  color: number;
  vertices: IcosahedronVertexData;
  params: PerlinBlobVisualParams;
  pointRadius: number;
  partnerScaleMul: number;
}) {
  return (
    <>
      {partnerIndices.map((index) => (
        <PartnerOrbitRing
          key={index}
          vertexIndex={index}
          color={color}
          vertices={vertices}
          params={params}
          pointRadius={pointRadius}
          partnerScaleMul={partnerScaleMul}
        />
      ))}
    </>
  );
}
