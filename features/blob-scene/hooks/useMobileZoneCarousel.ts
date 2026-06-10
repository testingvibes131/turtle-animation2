"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { BlobSceneContextValue } from "@/features/blob-scene/context/BlobSceneContext";
import { useBlobMobileZoneCarouselEnabled } from "@/features/blob-scene/context/BlobScrollProgressContext";
import { buildActiveZoneWithEdges } from "@/features/blob-scene/lib/curators/activateZone";
import type { CuratorZoneAssignment } from "@/features/blob-scene/lib/curators/zones";
import { MOBILE_ZONE_DWELL_SEC } from "@/features/blob-scene/lib/scroll/mobileZoneCarousel";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type UseMobileZoneCarouselArgs = Pick<
  BlobSceneContextValue,
  | "zonesSnapshotRef"
  | "setActiveZone"
  | "zoneHighlightBlendRef"
  | "vertices"
  | "params"
  | "getTowardCamera"
>;

/** Min camera-facing dot for a zone's hub to be eligible — keeps the active logo
 *  in the central front area of the globe (never the edge, off-screen, or back). */
const MOBILE_ZONE_CENTER_MIN_DOT = 0.15;

/** Above this blob angular speed (rad/s) the highlight is held off — it only
 *  appears once the blob is fully in place. The finishing spin-in keeps the logo
 *  centred while the lit vectors swing around (reads as "breaking"), so we show
 *  nothing until the turn has settled to the slow ambient spin (~0.04 rad/s). */
const MOBILE_ZONE_SETTLE_ANG_VEL = 0.08;

/** The blob must stay settled (below the angular-speed gate) for this long before
 *  the first partner appears — prevents a flash during the finishing spin's tail. */
const MOBILE_ZONE_SETTLE_HOLD_SEC = 0.45;

export function useMobileZoneCarousel({
  zonesSnapshotRef,
  setActiveZone,
  zoneHighlightBlendRef,
  vertices,
  params,
  getTowardCamera,
}: UseMobileZoneCarouselArgs) {
  const carouselEnabled = useBlobMobileZoneCarouselEnabled();
  const carouselEnabledRef = useRef(carouselEnabled);
  carouselEnabledRef.current = carouselEnabled;
  const reducedMotionRef = useRef(false);
  const dwellElapsedRef = useRef(0);
  const wasEnabledRef = useRef(false);
  const currentNameRef = useRef<string | null>(null);
  const shownRef = useRef<Set<string>>(new Set());
  const prevTowardRef = useRef<THREE.Vector3 | null>(null);
  const settledTimeRef = useRef(0);

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
        currentNameRef.current = null;
        dwellElapsedRef.current = 0;
        settledTimeRef.current = 0;
        zoneHighlightBlendRef.current = 1;
        setActiveZone(null);
      }
      return;
    }

    if (document.visibilityState === "hidden") return;
    const zones = zonesSnapshotRef.current;
    if (zones.length === 0) return;

    const toward = getTowardCamera();

    // Hold the highlight off until the blob settles into place. While it's still
    // spinning in (faster turn), the lagged logo + lines separate and read as
    // breaking — so only show once the angular speed has dropped.
    let angVel = 0;
    const prev = prevTowardRef.current;
    if (prev) {
      const cos = Math.min(
        1,
        Math.max(-1, toward.x * prev.x + toward.y * prev.y + toward.z * prev.z),
      );
      angVel = Math.acos(cos) / Math.max(delta, 1e-4);
    }
    if (!prevTowardRef.current) prevTowardRef.current = new THREE.Vector3();
    prevTowardRef.current.copy(toward);

    if (angVel > MOBILE_ZONE_SETTLE_ANG_VEL) {
      settledTimeRef.current = 0;
      if (currentNameRef.current !== null) {
        currentNameRef.current = null;
        dwellElapsedRef.current = 0;
        setActiveZone(null);
      }
      return;
    }
    settledTimeRef.current += delta;
    // Require a sustained settle before the first partner appears, so a brief dip
    // in spin speed during the finishing turn can't flash one on early.
    if (
      currentNameRef.current === null &&
      settledTimeRef.current < MOBILE_ZONE_SETTLE_HOLD_SEC
    ) {
      return;
    }

    // How directly a zone's hub faces the camera (1 = dead centre, <= 0 = back).
    const pos = vertices.positions;
    const centrality = (zone: CuratorZoneAssignment) => {
      const i = zone.hub * 3;
      const x = pos[i]!;
      const y = pos[i + 1]!;
      const z = pos[i + 2]!;
      const len = Math.hypot(x, y, z) || 1;
      return (x * toward.x + y * toward.y + z * toward.z) / len;
    };

    const activate = (zone: CuratorZoneAssignment) => {
      currentNameRef.current = zone.curator.name;
      dwellElapsedRef.current = 0;
      shownRef.current.add(zone.curator.name);
      zoneHighlightBlendRef.current = 1;
      // Same edge-building as desktop hover so the logo is wired to the globe.
      setActiveZone(
        buildActiveZoneWithEdges(zone, zones, vertices, params, getTowardCamera),
      );
    };

    // Advance to the most-central partner NOT yet shown this round, so every
    // partner loops; reset the round once all have appeared. Skips anything
    // toward the edge/back so the logo + lines stay in the central front.
    const advance = () => {
      const pickUnshown = () => {
        let best: CuratorZoneAssignment | null = null;
        let bestDot = MOBILE_ZONE_CENTER_MIN_DOT;
        for (const zone of zones) {
          if (zone.curator.name === currentNameRef.current) continue;
          if (shownRef.current.has(zone.curator.name)) continue;
          const dot = centrality(zone);
          if (dot > bestDot) {
            bestDot = dot;
            best = zone;
          }
        }
        return best;
      };
      let next = pickUnshown();
      if (!next && shownRef.current.size >= zones.length - 1) {
        // Whole round shown — start over with the next one to rotate into view.
        shownRef.current.clear();
        next = pickUnshown();
      }
      if (next) activate(next);
    };

    if (currentNameRef.current === null) {
      advance();
      return;
    }

    if (reducedMotionRef.current) return;

    const current = zones.find(
      (zone) => zone.curator.name === currentNameRef.current,
    );
    const driftedOff =
      !current || centrality(current) < MOBILE_ZONE_CENTER_MIN_DOT;
    dwellElapsedRef.current += delta;
    if (!driftedOff && dwellElapsedRef.current < MOBILE_ZONE_DWELL_SEC) return;

    advance();
  });
}
