"use client";

import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { BlobSceneContent } from "@/features/blob-scene/components/blob/BlobSceneContent";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import {
  useBlobColoredToGrayMix,
  useBlobInteractionEnabled,
  useBlobScrollProgress,
  useBlobTransitionTuning,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import { applyTransitionDistort } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";
import {
  blobVisualExtent,
  computeBlobScrollMotion,
} from "@/features/blob-scene/lib/geometry/blobViewportOffset";

const BG = "#141514";

export function BlobSceneShell({ params }: { params: BlobVisualParams }) {
  const { camera, size } = useThree();
  const scrollProgress = useBlobScrollProgress();
  const coloredToGrayMix = useBlobColoredToGrayMix();
  const transitionTuning = useBlobTransitionTuning();
  const rotationEnabled = useBlobInteractionEnabled();
  const scrollMotion = useMemo(() => {
    const extent = blobVisualExtent(
      applyTransitionDistort(
        { ...params, time: 0 },
        coloredToGrayMix,
        transitionTuning.distortPeakMul,
      ),
    );
    return computeBlobScrollMotion(
      camera as THREE.PerspectiveCamera,
      size.width / Math.max(size.height, 1),
      extent,
      scrollProgress,
      rotationEnabled,
    );
  }, [
    camera,
    coloredToGrayMix,
    params,
    rotationEnabled,
    scrollProgress,
    transitionTuning.distortPeakMul,
    size.height,
    size.width,
  ]);

  return (
    <>
      <color attach="background" args={[BG]} />
      <BlobSceneContent params={params} scrollMotion={scrollMotion} />
    </>
  );
}
