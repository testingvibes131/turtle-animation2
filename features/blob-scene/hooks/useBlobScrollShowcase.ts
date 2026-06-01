"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import {
  useBlobScrollShowcaseActive,
  useBlobScrollShowcaseProgress,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";
import { zonesLayoutEqual } from "@/features/blob-scene/lib/curators/zoneOverlay";
import type { CuratorZoneAssignment } from "@/features/blob-scene/lib/curators/zones";
import { curatorIndexForShowcaseProgress } from "@/features/blob-scene/lib/scroll/blobShowcase";

type Args = {
  zonesSnapshotRef: RefObject<readonly CuratorZoneAssignment[]>;
  setActiveZone: React.Dispatch<
    React.SetStateAction<CuratorZoneAssignment | null>
  >;
};

/** Cycles curator zones from scroll until hover interaction takes over. */
export function useBlobScrollShowcase({
  zonesSnapshotRef,
  setActiveZone,
}: Args) {
  const showcaseActive = useBlobScrollShowcaseActive();
  const showcaseProgress = useBlobScrollShowcaseProgress();
  const showcaseActiveRef = useRef(showcaseActive);
  const showcaseProgressRef = useRef(showcaseProgress);
  showcaseActiveRef.current = showcaseActive;
  showcaseProgressRef.current = showcaseProgress;

  useEffect(() => {
    if (showcaseActive) return;
    setActiveZone(null);
  }, [showcaseActive, setActiveZone]);

  useFrame(() => {
    if (!showcaseActiveRef.current) return;

    const index = curatorIndexForShowcaseProgress(showcaseProgressRef.current);
    const name = CURATORS[index]?.name;
    if (!name) return;

    const zone = zonesSnapshotRef.current.find((z) => z.curator.name === name);
    if (!zone) {
      setActiveZone((prev) => (prev === null ? prev : null));
      return;
    }

    setActiveZone((prev) => {
      if (prev?.curator.name === name && zonesLayoutEqual(prev, zone)) {
        return prev;
      }
      return { ...zone };
    });
  });
}
