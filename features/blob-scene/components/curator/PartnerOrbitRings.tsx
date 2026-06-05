"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import { billboardToCamera } from "@/features/blob-scene/lib/geometry/billboardToCamera";
import {
  type IcosahedronVertexData,
  type PerlinBlobParams,
} from "@/features/blob-scene/lib/geometry/perlinBlob";
import { RENDER_PARTNER_ORBIT } from "@/features/blob-scene/lib/rendering/renderOrder";
import { orbitRingBillboardScale } from "@/features/blob-scene/lib/geometry/screenSpaceScale";
import { computeZoneMarkerLayout } from "@/features/blob-scene/lib/geometry/zoneMarkerTransform";

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
  params: BlobVisualParams;
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
  const { connectedMarkerLayoutsRef, getBlobParamsAtTime } = useBlobScene();
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

    const published = connectedMarkerLayoutsRef.current.get(
      target.vertexIndex,
    );

    let localPosition: THREE.Vector3;
    let worldPosition: THREE.Vector3;
    let sphereScale: number;

    if (published) {
      localPosition = published.localPosition;
      worldPosition = published.worldPosition;
      sphereScale = published.sphereScale;
    } else {
      const blobParams: PerlinBlobParams = getBlobParamsAtTime(
        blobAnimTimeRef?.current ??
          state.clock.elapsedTime * params.timeSpeed,
      );
      const maxDisp =
        (blobParams.noiseScale * 1.2) /
        Math.max(blobParams.displacementDivisor, 0.001);
      const extent = blobParams.radius + maxDisp;
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
      localPosition = layout.localPosition;
      worldPosition = layout.worldPosition;
      sphereScale = layout.sphereScale;
    }

    root.position.copy(localPosition);
    billboardToCamera(mesh, root, state.camera);

    const ringScale = orbitRingBillboardScale(
      worldPosition,
      sphereScale,
      state.camera,
      state.size,
      ORBIT_SIZE_VS_SPHERE,
    );
    mesh.scale.set(ringScale, ringScale, 1);
    mesh.visible = ringScale > 0;
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
  params: BlobVisualParams;
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
