"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  useBlobColoredDotsMix,
  useBlobScrollVelocityRef,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import { satelliteOrbitBoostFromScroll } from "@/features/blob-scene/lib/scroll/blobScrollVelocity";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { CURATORS, type CuratorDef } from "@/features/blob-scene/lib/curators/catalog";
import { curatorLogoPath } from "@/features/blob-scene/lib/curators/logo";
import {
  applySquareContainMap,
  getLogoDisplayScale,
} from "@/features/blob-scene/lib/curators/logoContentScale";
import {
  CURATOR_SATELLITE_ORBITS,
  type SatelliteOrbitParams,
} from "@/features/blob-scene/lib/curators/satelliteOrbits";
import { billboardToCamera } from "@/features/blob-scene/lib/geometry/billboardToCamera";
import { blobVisualExtent } from "@/features/blob-scene/lib/geometry/blobViewportOffset";
import { worldScaleForScreenPx } from "@/features/blob-scene/lib/geometry/screenSpaceScale";
import { RENDER_SATELLITE_LOGO } from "@/features/blob-scene/lib/rendering/renderOrder";

const _worldPos = new THREE.Vector3();
/** Half-width in CSS pixels — slightly smaller than hub logos. */
const SATELLITE_LOGO_RADIUS_PX = 45;
const SATELLITE_LOGO_SIZE_MUL = 1.15;
const SATELLITE_LOGO_OPACITY = 0.88;

type CuratorLogoSatelliteProps = {
  curator: CuratorDef;
  orbit: SatelliteOrbitParams;
  extent: number;
};

function CuratorLogoSatellite({
  curator,
  orbit,
  extent,
}: CuratorLogoSatelliteProps) {
  const texture = useTexture(curatorLogoPath(curator.name));
  const orbitRef = useRef<THREE.Group>(null);
  const anchorRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const displayScale = getLogoDisplayScale(curator.name);
  const radius = extent * orbit.radiusMul;
  const scrollVelocityRef = useBlobScrollVelocityRef();
  const coloredMix = useBlobColoredDotsMix();
  const orbitAngleRef = useRef(orbit.phase);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

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

  useFrame((state, delta) => {
    const orbitGroup = orbitRef.current;
    const anchor = anchorRef.current;
    const mesh = meshRef.current;
    if (!orbitGroup || !anchor || !mesh) return;

    const boost = satelliteOrbitBoostFromScroll(scrollVelocityRef.current);
    const direction = Math.sign(orbit.speed) || 1;
    const angularSpeed = orbit.speed + direction * boost;
    orbitAngleRef.current += angularSpeed * delta;
    orbitGroup.rotation.y = orbitAngleRef.current;

    billboardToCamera(mesh, anchor, state.camera);
    anchor.getWorldPosition(_worldPos);

    const radiusPx =
      SATELLITE_LOGO_RADIUS_PX * displayScale * SATELLITE_LOGO_SIZE_MUL;
    const side = worldScaleForScreenPx(
      _worldPos,
      radiusPx,
      state.camera,
      state.size,
    );
    mesh.scale.set(side, side, 1);

    const material = materialRef.current;
    if (material) {
      material.opacity = SATELLITE_LOGO_OPACITY * coloredMix;
    }
  });

  return (
    <group
      ref={orbitRef}
      rotation={[orbit.tiltX, 0, orbit.tiltZ]}
      renderOrder={RENDER_SATELLITE_LOGO}
    >
      <group ref={anchorRef} position={[radius, 0, 0]}>
        <mesh ref={meshRef} raycast={() => {}} renderOrder={RENDER_SATELLITE_LOGO}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            transparent
            opacity={SATELLITE_LOGO_OPACITY}
            alphaTest={0.06}
            toneMapped={false}
            depthWrite={false}
            depthTest={true}
          />
        </mesh>
      </group>
    </group>
  );
}

type CuratorLogoSatellitesProps = {
  params: BlobVisualParams;
};

/** Option 2 S1 — curator PNGs orbiting the blob as satellites. */
export function CuratorLogoSatellites({ params }: CuratorLogoSatellitesProps) {
  const coloredMix = useBlobColoredDotsMix();
  const extent = useMemo(() => blobVisualExtent(params), [params]);

  if (coloredMix <= 0.001) return null;

  return (
    <>
      {CURATORS.map((curator, index) => (
        <CuratorLogoSatellite
          key={curator.name}
          curator={curator}
          orbit={CURATOR_SATELLITE_ORBITS[index]!}
          extent={extent}
        />
      ))}
    </>
  );
}
