"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import { useBlobScrollWobbleStrengthRef } from "@/features/blob-scene/context/BlobScrollProgressContext";
import { applyScrollWobble } from "@/features/blob-scene/lib/geometry/blobScrollWobble";
import {
  ensureBlobVertexFrameCache,
  updateBlobVertexFrameCache,
  type BlobVertexFrameCache,
} from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";

/** Runs before point/zone useFrame hooks — single displacement pass per frame. */
export function BlobFrameGeometryCache() {
  const { vertices, blobAnimTimeRef, getBlobParamsAtTime, blobFrameCacheRef } =
    useBlobScene();
  const scrollWobbleStrengthRef = useBlobScrollWobbleStrengthRef();
  const cacheRef = useRef<BlobVertexFrameCache | null>(null);
  const wobblePhaseRef = useRef(0);

  useFrame(() => {
    const cache = ensureBlobVertexFrameCache(
      cacheRef.current,
      vertices.count,
    );
    cacheRef.current = cache;
    blobFrameCacheRef.current = cache;

    scrollWobbleStrengthRef.current *= 0.9;
    let blobParams = getBlobParamsAtTime(blobAnimTimeRef.current);
    const wobbleStrength = scrollWobbleStrengthRef.current;
    if (wobbleStrength > 0.001) {
      const wobbled = applyScrollWobble(
        blobParams,
        wobbleStrength,
        wobblePhaseRef.current,
      );
      wobblePhaseRef.current = wobbled.phase;
      blobParams = wobbled.params;
    }

    updateBlobVertexFrameCache(vertices, blobParams, cache);
  }, -100);

  return null;
}
