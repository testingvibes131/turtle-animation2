"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { BlobSceneShell } from "@/features/blob-scene/components/blob/BlobSceneShell";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { preloadLogoDisplayScales } from "@/features/blob-scene/lib/curators/logoContentScale";
import {
  BLOB_CAMERA_FOV,
  BLOB_CAMERA_POSITION,
} from "@/features/blob-scene/lib/geometry/blobViewportOffset";

export function BlobScene({ params }: { params: BlobVisualParams }) {
  return (
    <Canvas
      className="h-full w-full touch-none"
      camera={{
        position: BLOB_CAMERA_POSITION,
        fov: BLOB_CAMERA_FOV,
        near: 0.1,
        far: 100,
      }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <BlobSceneShell params={params} />
    </Canvas>
  );
}

export function BlobExperience({ params }: { params: BlobVisualParams }) {
  useEffect(() => {
    void preloadLogoDisplayScales();
  }, []);

  return <BlobScene params={params} />;
}
