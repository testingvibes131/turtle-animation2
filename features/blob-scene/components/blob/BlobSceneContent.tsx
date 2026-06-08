"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  BlobSceneProvider,
  type BlobSceneContextValue,
} from "@/features/blob-scene/context/BlobSceneContext";
import { ActiveCuratorZones } from "@/features/blob-scene/components/curator/ActiveCuratorZones";
import { Section1CapWave } from "@/features/blob-scene/components/curator/Section1CapWave";
import { BlobPointCloud } from "@/features/blob-scene/components/blob/BlobPointCloud";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { useBlobGeometry } from "@/features/blob-scene/hooks/useBlobGeometry";
import {
  useBlobAnimationFreeze,
  useBlobInteraction,
} from "@/features/blob-scene/hooks/useBlobInteraction";
import { useBlobInteractionEnabled } from "@/features/blob-scene/context/BlobScrollProgressContext";
import { BlobFrameGeometryCache } from "@/features/blob-scene/hooks/useBlobFrameGeometry";
import { useTowardCamera } from "@/features/blob-scene/hooks/useTowardCamera";
import type { BlobScrollMotion } from "@/features/blob-scene/lib/geometry/blobViewportOffset";
import { createConnectedMarkerLayout } from "@/features/blob-scene/lib/geometry/connectedMarkerLayout";
import { createMarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";
import { zoneLayoutSignature } from "@/features/blob-scene/lib/curators/zoneOverlay";
import { createHubAnchorRotationLagState } from "@/features/blob-scene/lib/geometry/hubAnchorRotationLag";

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
  const blobFrameCacheRef = useRef<BlobSceneContextValue["blobFrameCacheRef"]["current"]>(null);
  const connectedMarkerLayoutsRef = useRef(
    new Map<number, ReturnType<typeof createConnectedMarkerLayout>>(),
  );
  const hubAnchorRotationLagRef = useRef(createHubAnchorRotationLagState());
  const [activeZone, setActiveZone] = useState<BlobSceneContextValue["activeZone"]>(null);
  const waveZoneRef = useRef<BlobSceneContextValue["waveZoneRef"]["current"]>(null);
  const waveStrengthRef = useRef(0);

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

  const getBlobParamsAtTime = useCallback(
    (time: number) => ({ ...params, time }),
    [params],
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
      blobFrameCacheRef,
      zoneUsedRef,
      zonesSnapshotRef,
      scalesRef,
      activeZone,
      setActiveZone,
      waveZoneRef,
      waveStrengthRef,
      getTowardCamera,
      getHubLayoutAxis,
      hubAnchorRotationLagRef,
      connectedMarkerLayoutsRef,
      getBlobParamsAtTime,
    }),
    [
      activeZone,
      blobFrameCacheRef,
      deadIndices,
      depthFadeUniforms,
      getBlobParamsAtTime,
      getHubLayoutAxis,
      getTowardCamera,
      hubAnchorRotationLagRef,
      liveIndices,
      liveVertices,
      params,
      pointRadius,
      vertices,
    ],
  );

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
      <BlobFrameGeometryCache />
      <Section1CapWave />
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
          <ActiveCuratorZones />
        </group>
      </group>
    </BlobSceneProvider>
  );
}
