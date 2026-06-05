"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  useBlobColoredToGrayMix,
  useBlobHeroShowcaseActive,
  useBlobTransitionTuning,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import { applyTransitionDistort } from "@/features/blob-scene/lib/geometry/blobTransitionDistort";
import type { BlobSceneContextValue } from "@/features/blob-scene/context/BlobSceneContext";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import {
  pickCapVertexNearestHubAnchor,
  type HubAnchorOptions,
} from "@/features/blob-scene/lib/curators/zones";
import type { IcosahedronVertexData } from "@/features/blob-scene/lib/geometry/perlinBlob";
import {
  buildHeroShowcaseSpokeTargets,
  heroHubPassesCap,
  heroShowcaseEdgesFromTargets,
  heroShowcaseSpokeCandidateIndices,
  heroShowcaseSpokesEqual,
} from "@/features/blob-scene/lib/scroll/heroShowcaseEdges";
import {
  heroShowcaseConnectionCount,
  heroShowcaseCurator,
  heroShowcaseCuratorIndex,
  HERO_SHOWCASE_CLOCK_DEG,
  HERO_SHOWCASE_FRONT_MIN_DOT,
  HERO_SHOWCASE_LOGO_OUTSET_MUL,
} from "@/features/blob-scene/lib/scroll/heroShowcase";
import { heroShowcaseZoneAssignment } from "@/features/blob-scene/lib/scroll/heroShowcaseZone";

type Args = {
  vertices: IcosahedronVertexData;
  params: BlobVisualParams;
  blobAnimTimeRef: React.RefObject<number>;
  getHubLayoutAxis: () => THREE.Vector3;
  setActiveZone: BlobSceneContextValue["setActiveZone"];
};

function heroHubPickOptions(
  vertices: IcosahedronVertexData,
  params: BlobVisualParams,
  animTime: number,
  coloredToGrayMix: number,
  distortPeakMul: number,
): HubAnchorOptions {
  return {
    frontMinDot: HERO_SHOWCASE_FRONT_MIN_DOT,
    blobCenterLean: params.blobCenterLean,
    zoneCenterOffsetRight: params.zoneCenterOffsetRight,
    hubOffsetSpheres: params.hubOffsetSpheres,
    hubLogoOutsetSpheres:
      params.hubLogoOutsetSpheres * HERO_SHOWCASE_LOGO_OUTSET_MUL,
    hubPickMesh: vertices,
    hubPickBlob: applyTransitionDistort(
      { ...params, time: animTime },
      coloredToGrayMix,
      distortPeakMul,
    ),
  };
}

function pickHeroHub(
  vertices: IcosahedronVertexData,
  params: BlobVisualParams,
  animTime: number,
  getHubLayoutAxis: () => THREE.Vector3,
  coloredToGrayMix: number,
  distortPeakMul: number,
): number {
  const toward = getHubLayoutAxis();
  const hubPick = heroHubPickOptions(
    vertices,
    params,
    animTime,
    coloredToGrayMix,
    distortPeakMul,
  );
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

/** Hero: logo + spokes in the 45° cap wedge (not curator zone partitions). */
export function useHeroShowcase({
  vertices,
  params,
  blobAnimTimeRef,
  getHubLayoutAxis,
  setActiveZone,
}: Args) {
  const heroActive = useBlobHeroShowcaseActive();
  const coloredToGrayMix = useBlobColoredToGrayMix();
  const transitionTuning = useBlobTransitionTuning();
  const coloredToGrayMixRef = useRef(coloredToGrayMix);
  coloredToGrayMixRef.current = coloredToGrayMix;
  const distortPeakMulRef = useRef(transitionTuning.distortPeakMul);
  distortPeakMulRef.current = transitionTuning.distortPeakMul;
  const heroActiveRef = useRef(heroActive);
  heroActiveRef.current = heroActive;

  const heroHubRef = useRef(-1);
  const curatorIndexRef = useRef(0);
  const frozenCuratorRef = useRef<string | null>(null);
  const frozenSpokesRef = useRef<number[]>([]);
  const connectionCountRef = useRef(heroShowcaseConnectionCount());
  const heroEpochMsRef = useRef(0);
  const spokeCandidatesRef = useRef<number[]>([]);

  const resetSpokes = () => {
    frozenSpokesRef.current = [];
    frozenCuratorRef.current = null;
  };

  useEffect(() => {
    spokeCandidatesRef.current = heroShowcaseSpokeCandidateIndices(
      vertices.count,
    );
  }, [vertices.count]);

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
      getHubLayoutAxis,
      coloredToGrayMixRef.current,
      distortPeakMulRef.current,
    );
  }, [
    heroActive,
    vertices,
    params,
    blobAnimTimeRef,
    getHubLayoutAxis,
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

    const curator = heroShowcaseCurator(elapsedMs);
    const toward = getHubLayoutAxis();
    const animTime = blobAnimTimeRef.current;
    const hubPick = heroHubPickOptions(
      vertices,
      params,
      animTime,
      coloredToGrayMixRef.current,
      distortPeakMulRef.current,
    );

    let hub = heroHubRef.current;
    if (hub < 0 || !heroHubPassesCap(vertices.positions, hub, toward)) {
      hub = pickHeroHub(
        vertices,
        params,
        animTime,
        getHubLayoutAxis,
        coloredToGrayMixRef.current,
        distortPeakMulRef.current,
      );
      heroHubRef.current = hub;
      resetSpokes();
    }

    if (hub < 0) return;

    if (frozenCuratorRef.current !== curator.name) {
      frozenCuratorRef.current = curator.name;
      frozenSpokesRef.current = [];
    }

    if (frozenSpokesRef.current.length === 0) {
      frozenSpokesRef.current = buildHeroShowcaseSpokeTargets(
        vertices.positions,
        hub,
        spokeCandidatesRef.current,
        toward,
        hubPick,
        connectionCountRef.current,
      );
    }

    const edges = heroShowcaseEdgesFromTargets(hub, frozenSpokesRef.current);
    const heroZone = heroShowcaseZoneAssignment(
      curator,
      hub,
      frozenSpokesRef.current,
      edges,
    );

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
