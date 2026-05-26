"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { BlobSceneContent } from "@/features/blob-scene/components/blob/BlobSceneContent";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import {
  blobVisualExtent,
  computeBlobOffsetX,
} from "@/features/blob-scene/lib/geometry/blobViewportOffset";

const BG = "#141514";

export function BlobSceneShell({ params }: { params: BlobVisualParams }) {
  const { camera, size } = useThree();
  const blobOffsetX = useMemo(() => {
    const extent = blobVisualExtent(params);
    return computeBlobOffsetX(
      camera as THREE.PerspectiveCamera,
      size.width / Math.max(size.height, 1),
      extent,
    );
  }, [camera, params, size.height, size.width]);

  return (
    <>
      <color attach="background" args={[BG]} />
      <BlobSceneContent params={params} offsetX={blobOffsetX} />
      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        enabled={params.orbitEnabled}
      />
    </>
  );
}
