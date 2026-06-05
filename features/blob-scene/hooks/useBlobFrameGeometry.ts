"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  ensureBlobVertexFrameCache,
  updateBlobVertexFrameCache,
  type BlobVertexFrameCache,
} from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";

/** Runs before point/zone useFrame hooks — single displacement pass per frame. */
export function BlobFrameGeometryCache() {
  const { vertices, blobAnimTimeRef, getBlobParamsAtTime, blobFrameCacheRef } =
    useBlobScene();
  const cacheRef = useRef<BlobVertexFrameCache | null>(null);

  useFrame(() => {
    const cache = ensureBlobVertexFrameCache(
      cacheRef.current,
      vertices.count,
    );
    cacheRef.current = cache;
    blobFrameCacheRef.current = cache;

    updateBlobVertexFrameCache(
      vertices,
      getBlobParamsAtTime(blobAnimTimeRef.current),
      cache,
    );
  }, -100);

  return null;
}
