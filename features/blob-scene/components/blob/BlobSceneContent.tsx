"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
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
import {
  useBlobMotionProgressRef,
  useBlobZoneHighlightActive,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import { useMobileZoneCarousel } from "@/features/blob-scene/hooks/useMobileZoneCarousel";
import { BlobFrameGeometryCache } from "@/features/blob-scene/hooks/useBlobFrameGeometry";
import { useTowardCamera } from "@/features/blob-scene/hooks/useTowardCamera";
import {
  blobVisualExtent,
  computeBlobScrollMotion,
} from "@/features/blob-scene/lib/geometry/blobViewportOffset";
import { BLOB_SCROLL_EASE_RATE } from "@/features/blob-scene/lib/scroll/blobScrollInteraction";
import { createConnectedMarkerLayout } from "@/features/blob-scene/lib/geometry/connectedMarkerLayout";
import { createMarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";
import { zoneLayoutSignature } from "@/features/blob-scene/lib/curators/zoneOverlay";
import { mobileZoneLayoutSignature } from "@/features/blob-scene/lib/scroll/mobileHubLogo";
import { createHubAnchorRotationLagState } from "@/features/blob-scene/lib/geometry/hubAnchorRotationLag";

type BlobSceneContentProps = {
  params: BlobVisualParams;
};

export function BlobSceneContent({ params }: BlobSceneContentProps) {
  const blobGroupRef = useRef<THREE.Group>(null);
  // Scroll placement is eased per-frame (see useFrame below) toward a target
  // computed from the scroll-progress ref, so the blob tracks scroll smoothly
  // without any React re-render in the loop.
  const outerGroupRef = useRef<THREE.Group>(null);
  const motionProgressRef = useBlobMotionProgressRef();
  const layoutExtent = useMemo(() => blobVisualExtent(params), [params]);
  const motionReadyRef = useRef(false);
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
  const section1AmbientFadeRef = useRef(1);
  const zoneHighlightBlendRef = useRef(1);

  const { vertices, vertexIndices, pointRadius } = useBlobGeometry(params);

  const depthFadeUniforms = useMemo(
    () => createMarkerDepthFadeUniforms(),
    [],
  );

  const getTowardCamera = useTowardCamera(blobGroupRef);

  useLayoutEffect(() => {
    if (activeZone) {
      const sig =
        activeZone.edges.length === 0
          ? mobileZoneLayoutSignature(activeZone)
          : zoneLayoutSignature(activeZone);
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
      vertexIndices,
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
      section1AmbientFadeRef,
      zoneHighlightBlendRef,
      getTowardCamera,
      getHubLayoutAxis,
      hubAnchorRotationLagRef,
      connectedMarkerLayoutsRef,
      getBlobParamsAtTime,
    }),
    [
      activeZone,
      blobFrameCacheRef,
      depthFadeUniforms,
      getBlobParamsAtTime,
      getHubLayoutAxis,
      getTowardCamera,
      hubAnchorRotationLagRef,
      params,
      vertexIndices,
      pointRadius,
      vertices,
    ],
  );

  useBlobInteraction({
    vertices,
    params,
    pointRadius,
    blobGroupRef,
    blobAnimTimeRef,
    blobFrameCacheRef,
    zonesSnapshotRef,
    scalesRef,
    setActiveZone,
    getTowardCamera,
    frozenAnimTimeRef,
    frozenLayoutAxisRef,
  });

  useMobileZoneCarousel({
    zonesSnapshotRef,
    setActiveZone,
    zoneHighlightBlendRef,
    vertices,
    params,
    getTowardCamera,
  });

  const zoneHighlightActive = useBlobZoneHighlightActive();

  const { tickAnimationTime } = useBlobAnimationFreeze(
    activeZone,
    blobAnimTimeRef,
    frozenAnimTimeRef,
    params,
    zoneHighlightActive,
  );

  useFrame((state, delta) => {
    const g = outerGroupRef.current;
    if (!g) return;
    const m = computeBlobScrollMotion(
      state.camera as THREE.PerspectiveCamera,
      state.size.width / Math.max(state.size.height, 1),
      layoutExtent,
      motionProgressRef.current,
    );
    if (!motionReadyRef.current) {
      g.position.set(m.offsetX, m.offsetY, 0);
      g.scale.setScalar(m.scale);
      g.rotation.y = m.rotationY;
      motionReadyRef.current = true;
      return;
    }
    // Ease toward the scroll-driven target every frame. The target (motionProgress)
    // only creeps the final bit during the sticky hold, so the blob glides to its
    // resting spot and "lands" right as the section scrolls on — no hard wall.
    const k = 1 - Math.exp(-delta * BLOB_SCROLL_EASE_RATE);
    g.position.x += (m.offsetX - g.position.x) * k;
    g.position.y += (m.offsetY - g.position.y) * k;
    const s = g.scale.x + (m.scale - g.scale.x) * k;
    g.scale.set(s, s, s);
    g.rotation.y += (m.rotationY - g.rotation.y) * k;
  });

  return (
    <BlobSceneProvider value={contextValue}>
      <BlobFrameGeometryCache />
      <Section1CapWave />
      <group ref={outerGroupRef}>
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
