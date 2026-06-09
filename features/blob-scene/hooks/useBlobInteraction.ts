"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { BlobSceneContextValue } from "@/features/blob-scene/context/BlobSceneContext";
import {
  useBlobInteractionEnabled,
  useBlobLayoutMirrored,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import { zonesLayoutEqual } from "@/features/blob-scene/lib/curators/zoneOverlay";
import { blobVisualExtent } from "@/features/blob-scene/lib/geometry/blobViewportOffset";
import {
  buildZoneHubEdgesRandom,
  findZoneForMemberVertex,
  pickZoneAtCapRay,
  type CuratorZoneAssignment,
} from "@/features/blob-scene/lib/curators/zones";
import {
  pickZoneMemberNearRay,
  SPHERE_PICK_MIN_RADIUS_MUL,
} from "@/features/blob-scene/lib/geometry/pickSphereVertex";
import { readCachedVertexPosition } from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";

const _pointer = new THREE.Vector2();
const _pickRay = new THREE.Ray();
const _worldPos = new THREE.Vector3();
const ZONE_MEMBER_PICK_SCALE_MUL = 0.0;

type UseBlobInteractionArgs = Pick<
  BlobSceneContextValue,
  | "vertices"
  | "params"
  | "pointRadius"
  | "blobGroupRef"
  | "blobAnimTimeRef"
  | "blobFrameCacheRef"
  | "zonesSnapshotRef"
  | "scalesRef"
  | "setActiveZone"
  | "getTowardCamera"
> & {
  frozenAnimTimeRef: RefObject<number | null>;
  frozenLayoutAxisRef: RefObject<THREE.Vector3 | null>;
};

export function useBlobInteraction({
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
}: UseBlobInteractionArgs) {
  const { camera, gl } = useThree();
  const interactionEnabled = useBlobInteractionEnabled();
  const layoutMirrored = useBlobLayoutMirrored();
  const interactionEnabledRef = useRef(interactionEnabled);
  interactionEnabledRef.current = interactionEnabled;
  const layoutMirroredRef = useRef(layoutMirrored);
  layoutMirroredRef.current = layoutMirrored;
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  useEffect(() => {
    if (interactionEnabled) return;
    setActiveZone(null);
    frozenAnimTimeRef.current = null;
    frozenLayoutAxisRef.current = null;
  }, [
    interactionEnabled,
    frozenAnimTimeRef,
    frozenLayoutAxisRef,
    setActiveZone,
  ]);

  useEffect(() => {
    const canvas = gl.domElement;
    const minPickRadius = pointRadius * SPHERE_PICK_MIN_RADIUS_MUL;

    const pickAtClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      _pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_pointer, camera);
      _pickRay.copy(raycaster.ray);

      const group = blobGroupRef.current;
      const toward = getTowardCamera();
      const zones = zonesSnapshotRef.current;
      if (zones.length === 0) return null;

      const animTime = blobAnimTimeRef.current;
      const blobParams: PerlinBlobParams = { ...params, time: animTime };

      const capZone = pickZoneAtCapRay(
        _pickRay,
        group,
        toward,
        zones,
        blobVisualExtent(blobParams),
        params.frontMinDot,
        undefined,
        {
          frontMinDot: params.frontMinDot,
          zoneCenterOffsetRight: params.zoneCenterOffsetRight,
          blobCenterLean: params.blobCenterLean,
          layoutMirrored: layoutMirroredRef.current,
        },
      );
      if (capZone) return capZone;

      const scales = scalesRef.current;

      const getCenter = (index: number, target: THREE.Vector3) => {
        const frameCache = blobFrameCacheRef.current;
        if (frameCache) {
          readCachedVertexPosition(frameCache, index, target);
        } else {
          target.set(
            vertices.positions[index * 3]!,
            vertices.positions[index * 3 + 1]!,
            vertices.positions[index * 3 + 2]!,
          );
        }
        if (group) group.localToWorld(target);
      };

      const getRadius = (index: number) => {
        const base = scales[index] > 0 ? scales[index]! : pointRadius;
        return base * ZONE_MEMBER_PICK_SCALE_MUL;
      };

      const picked = pickZoneMemberNearRay(
        _pickRay,
        camera.position,
        zones,
        getCenter,
        getRadius,
        minPickRadius,
      );
      if (picked < 0) return null;

      return findZoneForMemberVertex(zones, picked);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!interactionEnabledRef.current) return;
      const zone = pickAtClient(e.clientX, e.clientY);
      setActiveZone((prev) => {
        if (!zone) return null;

        const snap =
          zonesSnapshotRef.current.find(
            (z) => z.curator.name === zone.curator.name,
          ) ?? zone;

        if (prev?.curator.name === zone.curator.name) {
          if (zonesLayoutEqual(prev, snap)) return prev;
          return { ...snap };
        }

        const toward = getTowardCamera();
        const targetCount = Math.max(
          1,
          Math.round(
            snap.curator.opportunities * (params.hubConnectionMul ?? 1),
          ),
        );
        const edges = buildZoneHubEdgesRandom(
          vertices.positions,
          snap.hub,
          snap.partners,
          snap.members,
          toward,
          targetCount,
          {
            frontMinDot: params.frontMinDot,
            maxAngleFromHubDeg: params.clusterMaxAngleDeg,
            blobCenterLean: params.blobCenterLean,
          },
        );
        return { ...snap, edges };
      });
    };

    const onPointerLeave = () => {
      if (!interactionEnabledRef.current) return;
      setActiveZone(null);
      frozenAnimTimeRef.current = null;
      frozenLayoutAxisRef.current = null;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [
    blobAnimTimeRef,
    blobFrameCacheRef,
    blobGroupRef,
    camera,
    frozenAnimTimeRef,
    frozenLayoutAxisRef,
    getTowardCamera,
    gl.domElement,
    params,
    pointRadius,
    raycaster,
    scalesRef,
    setActiveZone,
    vertices,
    zonesSnapshotRef,
  ]);
}

export function useBlobAnimationFreeze(
  activeZone: CuratorZoneAssignment | null,
  blobAnimTimeRef: RefObject<number>,
  frozenAnimTimeRef: RefObject<number | null>,
  params: BlobSceneContextValue["params"],
  /** Freeze Perlin time while hovered after interaction is enabled. */
  freezeTime: boolean,
) {
  const activeZoneRef = useRef(activeZone);
  activeZoneRef.current = activeZone;
  const freezeTimeRef = useRef(freezeTime);
  freezeTimeRef.current = freezeTime;

  return {
    activeZoneRef,
    tickAnimationTime: (clockTime: number) => {
      const zone = activeZoneRef.current;
      const shouldFreeze = zone != null && freezeTimeRef.current;
      if (shouldFreeze) {
        if (frozenAnimTimeRef.current === null) {
          frozenAnimTimeRef.current = clockTime;
        }
        blobAnimTimeRef.current = frozenAnimTimeRef.current;
      } else {
        frozenAnimTimeRef.current = null;
        blobAnimTimeRef.current = clockTime;
      }
      return params.rotationSpeed !== 0;
    },
  };
}
