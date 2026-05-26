"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { BlobSceneShell } from "@/features/blob-scene/components/blob/BlobSceneShell";
import {
  useBlobControls,
  type BlobVisualParams,
} from "@/features/blob-scene/hooks/useBlobControls";
import { preloadLogoDisplayScales } from "@/features/blob-scene/lib/curators/logoContentScale";

export function BlobScene({ params }: { params: BlobVisualParams }) {
  return (
    <Canvas
      className="h-full w-full touch-none"
      camera={{ position: [0, 0.15, 3], fov: 50, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
    >
      <BlobSceneShell params={params} />
    </Canvas>
  );
}

export function BlobExperience() {
  const params = useBlobControls();

  useEffect(() => {
    void preloadLogoDisplayScales();
  }, []);

  return <BlobScene params={params} />;
}
