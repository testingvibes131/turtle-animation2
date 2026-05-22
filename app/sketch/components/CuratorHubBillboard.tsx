"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PerlinBlobVisualParams } from "@/app/sketch/hooks/useNoiseSphereControls";
import { curatorLogoPath, CURATOR_LOGO_PATHS } from "@/app/sketch/lib/curatorLogo";
import {
  applySquareContainMap,
  getLogoDisplayScale,
} from "@/app/sketch/lib/logoContentScale";
import {
  curatorZoneClockDeg,
  displacedHubAnchorPosition,
} from "@/app/sketch/lib/curatorZones";
import {
  type IcosahedronVertexData,
  type PerlinBlobParams,
} from "@/app/sketch/lib/perlinBlob";
import { billboardToCamera } from "@/app/sketch/lib/billboardToCamera";
import { RENDER_HUB_LOGO } from "@/app/sketch/lib/sketchRenderOrder";
import { worldScaleForScreenPx } from "@/app/sketch/lib/screenSpaceScale";

for (const path of CURATOR_LOGO_PATHS) {
  useTexture.preload(path);
}

const _worldPos = new THREE.Vector3();
/** Half-width in CSS pixels; diameter ≈ 2× this × displayScale × HUB_LOGO_SIZE_MUL. */
const HUB_LOGO_RADIUS_PX = 44;
const HUB_LOGO_SIZE_MUL = 1.5 * 1.1;

type CuratorHubBillboardProps = {
  hubIndex: number;
  curatorName: string;
  vertices: IcosahedronVertexData;
  params: PerlinBlobVisualParams;
  getTowardCamera: () => THREE.Vector3;
  blobAnimTimeRef?: React.MutableRefObject<number>;
};

export function CuratorHubBillboard({
  hubIndex,
  curatorName,
  vertices,
  params,
  getTowardCamera,
  blobAnimTimeRef,
}: CuratorHubBillboardProps) {
  const texture = useTexture(curatorLogoPath(curatorName));
  const rootRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const displayScale = getLogoDisplayScale(curatorName);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    const syncMap = () => applySquareContainMap(texture);
    syncMap();
    const image = texture.image as HTMLImageElement | undefined;
    if (image && !image.complete) {
      image.addEventListener("load", syncMap);
      return () => image.removeEventListener("load", syncMap);
    }
  }, [texture]);

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

    displacedHubAnchorPosition(
      vertices,
      hubIndex,
      getTowardCamera(),
      curatorZoneClockDeg(curatorName),
      {
        frontMinDot: params.frontMinDot,
        blobCenterLean: params.blobCenterLean,
        zoneCenterOffsetRight: params.zoneCenterOffsetRight,
        hubOffsetSpheres: params.hubOffsetSpheres,
        hubPickMesh: vertices,
        hubPickBlob: blobParams,
      },
      blobParams,
      root.position,
    );
    root.rotation.set(0, 0, 0);

    const camera = state.camera;
    billboardToCamera(mesh, root, camera);
    root.getWorldPosition(_worldPos);

    const radiusPx =
      HUB_LOGO_RADIUS_PX * displayScale * HUB_LOGO_SIZE_MUL;
    const side = worldScaleForScreenPx(
      _worldPos,
      radiusPx,
      camera,
      state.size,
    );
    mesh.scale.set(side, side, 1);
  });

  return (
    <group ref={rootRef} renderOrder={RENDER_HUB_LOGO}>
      <mesh ref={meshRef} raycast={() => {}} renderOrder={RENDER_HUB_LOGO}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.06}
          toneMapped={false}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}
