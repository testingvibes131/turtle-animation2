"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { BlobSceneContextValue } from "@/features/blob-scene/context/BlobSceneContext";
import { useBlobMobileZoneCarouselEnabled } from "@/features/blob-scene/context/BlobScrollProgressContext";
import type { CuratorZoneAssignment } from "@/features/blob-scene/lib/curators/zones";
import { MOBILE_ZONE_DWELL_SEC } from "@/features/blob-scene/lib/scroll/mobileZoneCarousel";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type UseMobileZoneCarouselArgs = Pick<
  BlobSceneContextValue,
  "zonesSnapshotRef" | "setActiveZone" | "zoneHighlightBlendRef"
>;

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

function shuffledZones(
  zones: readonly CuratorZoneAssignment[],
): CuratorZoneAssignment[] {
  const copy = [...zones];
  shuffleInPlace(copy);
  return copy;
}

export function useMobileZoneCarousel({
  zonesSnapshotRef,
  setActiveZone,
  zoneHighlightBlendRef,
}: UseMobileZoneCarouselArgs) {
  const carouselEnabled = useBlobMobileZoneCarouselEnabled();
  const carouselEnabledRef = useRef(carouselEnabled);
  carouselEnabledRef.current = carouselEnabled;
  const reducedMotionRef = useRef(false);
  const zoneIndexRef = useRef(0);
  const dwellElapsedRef = useRef(0);
  const wasEnabledRef = useRef(false);
  const orderedRef = useRef<CuratorZoneAssignment[]>([]);

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const sync = () => {
      reducedMotionRef.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useFrame((_, delta) => {
    const enabled = carouselEnabledRef.current;
    const wasEnabled = wasEnabledRef.current;
    wasEnabledRef.current = enabled;

    if (!enabled) {
      if (wasEnabled) {
        orderedRef.current = [];
        zoneHighlightBlendRef.current = 1;
        setActiveZone(null);
      }
      return;
    }

    if (document.visibilityState === "hidden") return;

    if (orderedRef.current.length === 0) {
      const next = shuffledZones(zonesSnapshotRef.current);
      if (next.length === 0) return;
      orderedRef.current = next;
    }

    const ordered = orderedRef.current;

    const applyAtIndex = (index: number) => {
      const zone = ordered[index % ordered.length]!;
      const snap =
        zonesSnapshotRef.current.find(
          (z) => z.curator.name === zone.curator.name,
        ) ?? zone;
      zoneHighlightBlendRef.current = 1;
      setActiveZone({ ...snap, edges: [] });
    };

    if (!wasEnabled) {
      zoneIndexRef.current = 0;
      dwellElapsedRef.current = 0;
      orderedRef.current = shuffledZones(zonesSnapshotRef.current);
      if (orderedRef.current.length === 0) return;
      applyAtIndex(0);
      return;
    }

    if (reducedMotionRef.current) return;

    dwellElapsedRef.current += delta;
    if (dwellElapsedRef.current < MOBILE_ZONE_DWELL_SEC) return;

    zoneIndexRef.current += 1;
    if (zoneIndexRef.current >= ordered.length) {
      zoneIndexRef.current = 0;
      orderedRef.current = shuffledZones(zonesSnapshotRef.current);
      if (orderedRef.current.length === 0) return;
    }
    dwellElapsedRef.current = 0;
    applyAtIndex(zoneIndexRef.current);
  });
}
