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
  useBlobSection1Tuning,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  blobVisualExtent,
  computeBlobScrollMotion,
} from "@/features/blob-scene/lib/geometry/blobViewportOffset";

const BG = "#141514";

export function BlobSceneShell({ params }: { params: BlobVisualParams }) {
  const { camera, size } = useThree();
  const scrollProgress = useBlobScrollProgress();
  const coloredToGrayMix = useBlobColoredToGrayMix();
  const section1Tuning = useBlobSection1Tuning();
  const rotationEnabled = useBlobInteractionEnabled();
  const scrollMotion = useMemo(() => {
    const layoutExtent = blobVisualExtent(params);
    return computeBlobScrollMotion(
      camera as THREE.PerspectiveCamera,
      size.width / Math.max(size.height, 1),
      layoutExtent,
      scrollProgress,
      rotationEnabled,
      coloredToGrayMix,
      section1Tuning,
    );
  }, [
    camera,
    coloredToGrayMix,
    params,
    rotationEnabled,
    scrollProgress,
    section1Tuning,
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
