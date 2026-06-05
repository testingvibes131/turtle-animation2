"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  BlobSceneProvider,
  type BlobSceneContextValue,
} from "@/features/blob-scene/context/BlobSceneContext";
import { ActiveCuratorZones } from "@/features/blob-scene/components/curator/ActiveCuratorZones";
import { CuratorLogoSatellites } from "@/features/blob-scene/components/curator/CuratorLogoSatellites";
import { BlobPointCloud } from "@/features/blob-scene/components/blob/BlobPointCloud";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { useBlobGeometry } from "@/features/blob-scene/hooks/useBlobGeometry";
import {
  useBlobAnimationFreeze,
  useBlobInteraction,
} from "@/features/blob-scene/hooks/useBlobInteraction";
import {
  useBlobColoredToGrayMix,
  useBlobInteractionEnabled,
  useBlobTransitionTuning,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import { applyTransitionDistort } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";
import { useHeroShowcase } from "@/features/blob-scene/hooks/useHeroShowcase";
import { useTowardCamera } from "@/features/blob-scene/hooks/useTowardCamera";
import type { BlobScrollMotion } from "@/features/blob-scene/lib/geometry/blobViewportOffset";
import { createConnectedMarkerLayout } from "@/features/blob-scene/lib/geometry/connectedMarkerLayout";
import { createMarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";
import { zoneLayoutSignature } from "@/features/blob-scene/lib/curators/zoneOverlay";

type BlobSceneContentProps = {
  params: BlobVisualParams;
  scrollMotion: BlobScrollMotion;
};

export function BlobSceneContent({
  params,
  scrollMotion,
}: BlobSceneContentProps) {
  const { offsetX, offsetY, scale, rotationY } = scrollMotion;
  const blobGroupRef = useRef<THREE.Group>(null);
  const zoneUsedRef = useRef<Set<number>>(new Set());
  const zonesSnapshotRef = useRef<BlobSceneContextValue["zonesSnapshotRef"]["current"]>([]);
  const blobAnimTimeRef = useRef(0);
  const frozenAnimTimeRef = useRef<number | null>(null);
  const frozenLayoutAxisRef = useRef<THREE.Vector3 | null>(null);
  const frozenLayoutZoneRef = useRef<string | null>(null);
  const scalesRef = useRef<Float32Array>(new Float32Array(0));
  const connectedMarkerLayoutsRef = useRef(
    new Map<number, ReturnType<typeof createConnectedMarkerLayout>>(),
  );
  const [activeZone, setActiveZone] = useState<BlobSceneContextValue["activeZone"]>(null);

  const { vertices, liveVertices, liveIndices, deadIndices, pointRadius } =
    useBlobGeometry(params);

  const depthFadeUniforms = useMemo(
    () => createMarkerDepthFadeUniforms(),
    [],
  );

  const getTowardCamera = useTowardCamera(blobGroupRef);

  useLayoutEffect(() => {
    if (activeZone) {
      const sig = zoneLayoutSignature(activeZone);
      if (frozenLayoutZoneRef.current !== sig) {
        frozenLayoutAxisRef.current = getTowardCamera().clone();
        frozenLayoutZoneRef.current = sig;
      }
    } else {
      frozenLayoutAxisRef.current = null;
      frozenLayoutZoneRef.current = null;
    }
  }, [activeZone, getTowardCamera]);

  const getHubLayoutAxis = useCallback(() => {
    return frozenLayoutAxisRef.current ?? getTowardCamera();
  }, [getTowardCamera]);

  const coloredToGrayMix = useBlobColoredToGrayMix();
  const transitionTuning = useBlobTransitionTuning();

  const getBlobParamsAtTime = useCallback(
    (time: number) =>
      applyTransitionDistort(
        { ...params, time },
        coloredToGrayMix,
        transitionTuning.distortPeakMul,
      ),
    [coloredToGrayMix, params, transitionTuning.distortPeakMul],
  );

  const contextValue = useMemo<BlobSceneContextValue>(
    () => ({
      vertices,
      params,
      pointRadius,
      liveVertices,
      liveIndices,
      deadIndices,
      depthFadeUniforms,
      blobGroupRef,
      blobAnimTimeRef,
      zoneUsedRef,
      zonesSnapshotRef,
      scalesRef,
      activeZone,
      setActiveZone,
      getTowardCamera,
      getHubLayoutAxis,
      connectedMarkerLayoutsRef,
      getBlobParamsAtTime,
    }),
    [
      activeZone,
      deadIndices,
      depthFadeUniforms,
      getBlobParamsAtTime,
      getHubLayoutAxis,
      getTowardCamera,
      liveIndices,
      liveVertices,
      params,
      pointRadius,
      vertices,
    ],
  );

  useHeroShowcase({
    vertices,
    params,
    blobAnimTimeRef,
    getHubLayoutAxis,
    setActiveZone,
  });

  useBlobInteraction({
    vertices,
    params,
    pointRadius,
    liveVertices,
    blobGroupRef,
    blobAnimTimeRef,
    zonesSnapshotRef,
    scalesRef,
    setActiveZone,
    getTowardCamera,
    frozenAnimTimeRef,
    frozenLayoutAxisRef,
  });

  const interactionEnabled = useBlobInteractionEnabled();

  const { tickAnimationTime } = useBlobAnimationFreeze(
    activeZone,
    blobAnimTimeRef,
    frozenAnimTimeRef,
    params,
    interactionEnabled,
  );

  return (
    <BlobSceneProvider value={contextValue}>
      <group
        position={[offsetX, offsetY, 0]}
        rotation={[0, rotationY, 0]}
        scale={[scale, scale, scale]}
      >
        <group ref={blobGroupRef}>
          <BlobPointCloud
            blobGroupRef={blobGroupRef}
            tickAnimationTime={tickAnimationTime}
          />
          <CuratorLogoSatellites params={params} />
          <ActiveCuratorZones />
        </group>
      </group>
    </BlobSceneProvider>
  );
}
