"use client";

import {
  createContext,
  useContext,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import type { MarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";
import type { CuratorZoneAssignment } from "@/features/blob-scene/lib/curators/zones";
import type { ConnectedMarkerLayout } from "@/features/blob-scene/lib/geometry/connectedMarkerLayout";
import type { BlobVertexFrameCache } from "@/features/blob-scene/lib/geometry/blobVertexFrameCache";
import type {
  IcosahedronVertexData,
  PerlinBlobParams,
} from "@/features/blob-scene/lib/geometry/perlinBlob";
import type { HubAnchorRotationLagState } from "@/features/blob-scene/lib/geometry/hubAnchorRotationLag";

export type BlobSceneContextValue = {
  vertices: IcosahedronVertexData;
  params: BlobVisualParams;
  /** Perlin params with optional transition distortion applied. */
  getBlobParamsAtTime: (time: number) => PerlinBlobParams;
  pointRadius: number;
  liveVertices: ReadonlySet<number>;
  liveIndices: number[];
  deadIndices: number[];
  depthFadeUniforms: MarkerDepthFadeUniforms;
  blobGroupRef: RefObject<THREE.Group | null>;
  blobAnimTimeRef: MutableRefObject<number>;
  /** Filled each frame by useBlobFrameGeometry (priority -100). */
  blobFrameCacheRef: MutableRefObject<BlobVertexFrameCache | null>;
  zoneUsedRef: MutableRefObject<Set<number>>;
  zonesSnapshotRef: MutableRefObject<CuratorZoneAssignment[]>;
  scalesRef: MutableRefObject<Float32Array>;
  activeZone: CuratorZoneAssignment | null;
  setActiveZone: React.Dispatch<
    React.SetStateAction<CuratorZoneAssignment | null>
  >;
  getTowardCamera: () => THREE.Vector3;
  /** Camera-facing layout axis; frozen for the active hover zone. */
  getHubLayoutAxis: () => THREE.Vector3;
  /** Section 2: smoothed blob Y rotation for lagging hub logo + plexus origin. */
  hubAnchorRotationLagRef: MutableRefObject<HubAnchorRotationLagState>;
  /** Per-frame layouts for connected dots (orbit rings read after zone write). */
  connectedMarkerLayoutsRef: MutableRefObject<
    Map<number, ConnectedMarkerLayout>
  >;
};

const BlobSceneContext = createContext<BlobSceneContextValue | null>(null);

export function BlobSceneProvider({
  value,
  children,
}: {
  value: BlobSceneContextValue;
  children: ReactNode;
}) {
  return (
    <BlobSceneContext.Provider value={value}>{children}</BlobSceneContext.Provider>
  );
}

export function useBlobScene(): BlobSceneContextValue {
  const ctx = useContext(BlobSceneContext);
  if (!ctx) {
    throw new Error("useBlobScene must be used within BlobSceneProvider");
  }
  return ctx;
}
