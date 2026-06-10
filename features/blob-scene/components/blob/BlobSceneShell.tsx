"use client";

import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { BlobSceneContent } from "@/features/blob-scene/components/blob/BlobSceneContent";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { useBlobMotionProgress } from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  blobVisualExtent,
  computeBlobScrollMotion,
} from "@/features/blob-scene/lib/geometry/blobViewportOffset";

export function BlobSceneShell({ params }: { params: BlobVisualParams }) {
  const { camera, size } = useThree();
  const motionProgress = useBlobMotionProgress();
  const scrollMotion = useMemo(() => {
    const layoutExtent = blobVisualExtent(params);
    return computeBlobScrollMotion(
      camera as THREE.PerspectiveCamera,
      size.width / Math.max(size.height, 1),
      layoutExtent,
      motionProgress,
    );
  }, [camera, params, motionProgress, size.height, size.width]);

  return (
    <>
      <BlobSceneContent params={params} scrollMotion={scrollMotion} />
    </>
  );
}
