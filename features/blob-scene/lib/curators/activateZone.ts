import * as THREE from "three";
import type { BlobVisualParams } from "@/features/blob-scene/hooks/useBlobControls";
import {
  buildZoneHubEdgesRandom,
  type CuratorZoneAssignment,
  zoneClockDegForLayout,
} from "@/features/blob-scene/lib/curators/zones";
import type { IcosahedronVertexData } from "@/features/blob-scene/lib/geometry/perlinBlob";

export function sortZonesByClockDeg(
  zones: readonly CuratorZoneAssignment[],
  layoutMirrored: boolean,
): CuratorZoneAssignment[] {
  return [...zones].sort(
    (a, b) =>
      zoneClockDegForLayout(a.curator.name, layoutMirrored) -
      zoneClockDegForLayout(b.curator.name, layoutMirrored),
  );
}

export function buildActiveZoneWithEdges(
  zone: CuratorZoneAssignment,
  zonesSnapshot: readonly CuratorZoneAssignment[],
  vertices: IcosahedronVertexData,
  params: Pick<
    BlobVisualParams,
    "hubConnectionMul" | "frontMinDot" | "clusterMaxAngleDeg" | "blobCenterLean"
  >,
  getTowardCamera: () => THREE.Vector3,
): CuratorZoneAssignment {
  const snap =
    zonesSnapshot.find((z) => z.curator.name === zone.curator.name) ?? zone;
  const toward = getTowardCamera();
  const targetCount = Math.max(
    1,
    Math.round(snap.curator.opportunities * (params.hubConnectionMul ?? 1)),
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
}
