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
import type { IcosahedronVertexData } from "@/features/blob-scene/lib/geometry/perlinBlob";

export type BlobSceneContextValue = {
  vertices: IcosahedronVertexData;
  params: BlobVisualParams;
  pointRadius: number;
  liveVertices: ReadonlySet<number>;
  liveIndices: number[];
  deadIndices: number[];
  depthFadeUniforms: MarkerDepthFadeUniforms;
  blobGroupRef: RefObject<THREE.Group | null>;
  blobAnimTimeRef: MutableRefObject<number>;
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
