"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import type * as THREE from "three";
import { useBlobHeroShowcaseActive } from "@/features/blob-scene/context/BlobScrollProgressContext";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import {
  pickCapVertexNearestHubAnchor,
  type CuratorZoneAssignment,
  type HubAnchorOptions,
} from "@/features/blob-scene/lib/curators/zones";
import type { IcosahedronVertexData } from "@/features/blob-scene/lib/geometry/perlinBlob";
import {
  buildHeroShowcaseSpokeTargets,
  heroHubPassesCap,
  heroShowcaseEdgesFromTargets,
  heroShowcaseSpokesEqual,
} from "@/features/blob-scene/lib/scroll/heroShowcaseEdges";
import {
  heroShowcaseCuratorIndex,
  heroShowcaseCuratorName,
  HERO_SHOWCASE_CLOCK_DEG,
  heroShowcaseConnectionCount,
  HERO_SHOWCASE_FRONT_MIN_DOT,
} from "@/features/blob-scene/lib/scroll/heroShowcase";

type Args = {
  vertices: IcosahedronVertexData;
  params: BlobVisualParams;
  zonesSnapshotRef: RefObject<readonly CuratorZoneAssignment[]>;
  blobAnimTimeRef: RefObject<number>;
  getTowardCamera: () => THREE.Vector3;
  setActiveZone: React.Dispatch<
    React.SetStateAction<CuratorZoneAssignment | null>
  >;
};

function heroHubPickOptions(
  vertices: IcosahedronVertexData,
  params: BlobVisualParams,
  animTime: number,
): HubAnchorOptions {
  return {
    frontMinDot: HERO_SHOWCASE_FRONT_MIN_DOT,
    blobCenterLean: params.blobCenterLean,
    zoneCenterOffsetRight: params.zoneCenterOffsetRight,
    hubOffsetSpheres: params.hubOffsetSpheres,
    hubLogoOutsetSpheres: params.hubLogoOutsetSpheres,
    hubPickMesh: vertices,
    hubPickBlob: { ...params, time: animTime },
  };
}

function pickHeroHub(
  vertices: IcosahedronVertexData,
  params: BlobVisualParams,
  animTime: number,
  getTowardCamera: () => THREE.Vector3,
): number {
  const toward = getTowardCamera();
  const hubPick = heroHubPickOptions(vertices, params, animTime);
  return pickCapVertexNearestHubAnchor(
    vertices,
    vertices.positions,
    toward,
    HERO_SHOWCASE_CLOCK_DEG,
    hubPick,
    hubPick.hubPickBlob!,
    toward,
  );
}

/** Hero: logo + 3–5 spokes at 45°; frozen targets so lines don’t blink off while animating. */
export function useHeroShowcase({
  vertices,
  params,
  zonesSnapshotRef,
  blobAnimTimeRef,
  getTowardCamera,
  setActiveZone,
}: Args) {
  const heroActive = useBlobHeroShowcaseActive();
  const heroActiveRef = useRef(heroActive);
  heroActiveRef.current = heroActive;

  const heroHubRef = useRef(-1);
  const curatorIndexRef = useRef(0);
  const frozenCuratorRef = useRef<string | null>(null);
  const frozenSpokesRef = useRef<number[]>([]);
  const connectionCountRef = useRef(heroShowcaseConnectionCount());
  const heroEpochMsRef = useRef(0);

  const resetSpokes = () => {
    frozenSpokesRef.current = [];
    frozenCuratorRef.current = null;
  };

  useEffect(() => {
    if (!heroActive) {
      heroHubRef.current = -1;
      resetSpokes();
      setActiveZone(null);
      return;
    }

    curatorIndexRef.current = 0;
    heroEpochMsRef.current = performance.now();
    connectionCountRef.current = heroShowcaseConnectionCount();
    resetSpokes();
    heroHubRef.current = pickHeroHub(
      vertices,
      params,
      blobAnimTimeRef.current,
      getTowardCamera,
    );
  }, [
    heroActive,
    vertices,
    params,
    blobAnimTimeRef,
    getTowardCamera,
    setActiveZone,
  ]);

  useFrame(() => {
    if (!heroActiveRef.current) return;

    const elapsedMs = performance.now() - heroEpochMsRef.current;
    const curatorIndex = heroShowcaseCuratorIndex(elapsedMs);
    if (curatorIndex !== curatorIndexRef.current) {
      curatorIndexRef.current = curatorIndex;
      connectionCountRef.current = heroShowcaseConnectionCount();
      resetSpokes();
    }

    const toward = getTowardCamera();
    const animTime = blobAnimTimeRef.current;
    const hubPick = heroHubPickOptions(vertices, params, animTime);

    let hub = heroHubRef.current;
    if (
      hub < 0 ||
      !heroHubPassesCap(vertices.positions, hub, toward)
    ) {
      hub = pickHeroHub(vertices, params, animTime, getTowardCamera);
      heroHubRef.current = hub;
      resetSpokes();
    }

    if (hub < 0) return;

    const curatorName = heroShowcaseCuratorName(elapsedMs);
    const zone = zonesSnapshotRef.current.find(
      (z) => z.curator.name === curatorName,
    );
    if (!zone) {
      setActiveZone((prev) => (prev === null ? prev : null));
      return;
    }

    if (frozenCuratorRef.current !== curatorName) {
      frozenCuratorRef.current = curatorName;
      frozenSpokesRef.current = [];
    }

    if (frozenSpokesRef.current.length === 0) {
      frozenSpokesRef.current = buildHeroShowcaseSpokeTargets(
        vertices.positions,
        hub,
        zone.members,
        toward,
        hubPick,
        connectionCountRef.current,
      );
    }

    const edges = heroShowcaseEdgesFromTargets(hub, frozenSpokesRef.current);
    const heroZone: CuratorZoneAssignment = { ...zone, hub, edges };

    setActiveZone((prev) => {
      if (!prev) return heroZone;
      if (prev.curator.name !== heroZone.curator.name) return heroZone;
      if (heroShowcaseSpokesEqual(prev.edges, heroZone.edges)) {
        if (prev.hub === hub) return prev;
        return { ...prev, hub, edges };
      }
      return heroZone;
    });
  });
}
