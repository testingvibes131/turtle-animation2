"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  BlobSceneProvider,
  type BlobSceneContextValue,
} from "@/features/blob-scene/context/BlobSceneContext";
import { ActiveCuratorZones } from "@/features/blob-scene/components/curator/ActiveCuratorZones";
import { BlobPointCloud } from "@/features/blob-scene/components/blob/BlobPointCloud";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import { useBlobGeometry } from "@/features/blob-scene/hooks/useBlobGeometry";
import {
  useBlobAnimationFreeze,
  useBlobInteraction,
} from "@/features/blob-scene/hooks/useBlobInteraction";
import { useTowardCamera } from "@/features/blob-scene/hooks/useTowardCamera";
import { createMarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";

type BlobSceneContentProps = {
  params: BlobVisualParams;
  offsetX: number;
};

export function BlobSceneContent({ params, offsetX }: BlobSceneContentProps) {
  const blobGroupRef = useRef<THREE.Group>(null);
  const zoneUsedRef = useRef<Set<number>>(new Set());
  const zonesSnapshotRef = useRef<BlobSceneContextValue["zonesSnapshotRef"]["current"]>([]);
  const blobAnimTimeRef = useRef(0);
  const frozenAnimTimeRef = useRef<number | null>(null);
  const frozenLayoutAxisRef = useRef<THREE.Vector3 | null>(null);
  const frozenLayoutZoneRef = useRef<string | null>(null);
  const scalesRef = useRef<Float32Array>(new Float32Array(0));
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
      const name = activeZone.curator.name;
      if (frozenLayoutZoneRef.current !== name) {
        frozenLayoutAxisRef.current = getTowardCamera().clone();
        frozenLayoutZoneRef.current = name;
      }
    } else {
      frozenLayoutAxisRef.current = null;
      frozenLayoutZoneRef.current = null;
    }
  }, [activeZone, getTowardCamera]);

  const getHubLayoutAxis = useCallback(() => {
    return frozenLayoutAxisRef.current ?? getTowardCamera();
  }, [getTowardCamera]);

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
    }),
    [
      activeZone,
      deadIndices,
      depthFadeUniforms,
      getHubLayoutAxis,
      getTowardCamera,
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

  const { tickAnimationTime } = useBlobAnimationFreeze(
    activeZone,
    blobAnimTimeRef,
    frozenAnimTimeRef,
    params,
  );

  useLayoutEffect(() => {
    const group = blobGroupRef.current;
    if (group) group.position.x = offsetX;
  }, [offsetX]);

  return (
    <BlobSceneProvider value={contextValue}>
      <group ref={blobGroupRef} position={[offsetX, 0, 0]}>
        <BlobPointCloud
          blobGroupRef={blobGroupRef}
          tickAnimationTime={tickAnimationTime}
        />
        <ActiveCuratorZones />
      </group>
    </BlobSceneProvider>
  );
}
