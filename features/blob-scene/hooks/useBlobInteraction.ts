"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { BlobSceneContextValue } from "@/features/blob-scene/context/BlobSceneContext";
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
import {
  displacedVertexPosition,
  type PerlinBlobParams,
} from "@/features/blob-scene/lib/geometry/perlinBlob";

const _pointer = new THREE.Vector2();
const _pickRay = new THREE.Ray();
const _worldPos = new THREE.Vector3();
const ZONE_MEMBER_PICK_SCALE_MUL = 0.0;

type UseBlobInteractionArgs = Pick<
  BlobSceneContextValue,
  | "vertices"
  | "params"
  | "pointRadius"
  | "liveVertices"
  | "blobGroupRef"
  | "blobAnimTimeRef"
  | "zonesSnapshotRef"
  | "scalesRef"
  | "setActiveZone"
  | "getTowardCamera"
> & {
  frozenAnimTimeRef: RefObject<number | null>;
};

export function useBlobInteraction({
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
}: UseBlobInteractionArgs) {
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

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
        blobVisualExtent(params),
        params.frontMinDot,
        undefined,
        {
          frontMinDot: params.frontMinDot,
          zoneCenterOffsetRight: params.zoneCenterOffsetRight,
          blobCenterLean: params.blobCenterLean,
        },
      );
      if (capZone) return capZone;

      const scales = scalesRef.current;

      const getCenter = (index: number, target: THREE.Vector3) => {
        displacedVertexPosition(vertices, index, blobParams, target);
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
      const zone = pickAtClient(e.clientX, e.clientY);
      setActiveZone((prev) => {
        if (!zone) return null;
        if (prev?.curator.name === zone.curator.name) return prev;

        const snap =
          zonesSnapshotRef.current.find(
            (z) => z.curator.name === zone.curator.name,
          ) ?? zone;
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
            liveVertices,
            blobCenterLean: params.blobCenterLean,
          },
        );
        return { ...snap, edges };
      });
    };

    const onPointerLeave = () => {
      setActiveZone(null);
      frozenAnimTimeRef.current = null;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    return () => {
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [
    blobAnimTimeRef,
    blobGroupRef,
    camera,
    frozenAnimTimeRef,
    getTowardCamera,
    gl.domElement,
    liveVertices,
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
) {
  const activeZoneRef = useRef(activeZone);
  activeZoneRef.current = activeZone;

  return {
    activeZoneRef,
    tickAnimationTime: (clockTime: number) => {
      const hovered = activeZoneRef.current;
      if (hovered) {
        if (frozenAnimTimeRef.current === null) {
          frozenAnimTimeRef.current = clockTime;
        }
        blobAnimTimeRef.current = frozenAnimTimeRef.current;
      } else {
        frozenAnimTimeRef.current = null;
        blobAnimTimeRef.current = clockTime;
      }
      return params.rotationSpeed !== 0 && !hovered;
    },
  };
}
