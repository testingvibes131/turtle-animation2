"use client";

import { useState } from "react";
import { CuratorPlexusLines } from "@/features/blob-scene/components/curator/CuratorPlexusLines";
import { CuratorHubBillboard } from "@/features/blob-scene/components/curator/CuratorHubBillboard";
import { PartnerOrbitRings } from "@/features/blob-scene/components/curator/PartnerOrbitRings";
import { ZoneMemberInstances } from "@/features/blob-scene/components/curator/ZoneMemberInstances";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  curatorZoneClockDeg,
  type CuratorZoneAssignment,
  type HubAnchorOptions,
} from "@/features/blob-scene/lib/curators/zones";
import { orbitTargetsForZone } from "@/features/blob-scene/lib/curators/zoneOverlay";
import { RENDER_PLEXUS_LINES } from "@/features/blob-scene/lib/rendering/renderOrder";

export function ActiveCuratorZones() {
  const {
    vertices,
    params,
    pointRadius,
    getTowardCamera,
    blobAnimTimeRef,
    activeZone,
  } = useBlobScene();

  const [zones, setZones] = useState<CuratorZoneAssignment[]>([]);

  const displayZone =
    activeZone &&
    zones.find((z) => z.curator.name === activeZone.curator.name);

  const orbitTargets =
    activeZone && displayZone
      ? orbitTargetsForZone(activeZone, new Set(displayZone.partners))
      : [];

  const activeLineGroups =
    activeZone != null
      ? [{ color: activeZone.curator.color, edges: activeZone.edges }]
      : [];

  return (
    <>
      <ZoneMemberInstances activeZone={activeZone} onZonesChange={setZones} />
      {displayZone ? (
        <CuratorHubBillboard
          key={`logo-${displayZone.curator.name}`}
          hubIndex={displayZone.hub}
          curatorName={displayZone.curator.name}
          vertices={vertices}
          params={params}
          getTowardCamera={getTowardCamera}
          blobAnimTimeRef={blobAnimTimeRef}
        />
      ) : null}
      {activeZone &&
        displayZone &&
        orbitTargets.length > 0 &&
        displayZone.curator.name === activeZone.curator.name && (
          <PartnerOrbitRings
            key={`orbit-${activeZone.curator.name}-${orbitTargets.map((t) => t.vertexIndex).join(",")}`}
            targets={orbitTargets}
            color={displayZone.curator.color}
            vertices={vertices}
            params={params}
            pointRadius={pointRadius}
            blobAnimTimeRef={blobAnimTimeRef}
          />
        )}
      {activeLineGroups.length > 0 && displayZone && activeZone ? (
        <group renderOrder={RENDER_PLEXUS_LINES}>
          <CuratorPlexusLines
            key={`plexus-${activeZone.curator.name}-${activeZone.edges.map(([a, b]) => `${a}-${b}`).join(",")}`}
            groups={activeLineGroups}
            vertices={vertices}
            params={params}
            hubIndex={displayZone.hub}
            hubZoneDeg={curatorZoneClockDeg(displayZone.curator.name)}
            hubPickOptions={
              {
                frontMinDot: params.frontMinDot,
                blobCenterLean: params.blobCenterLean,
                zoneCenterOffsetRight: params.zoneCenterOffsetRight,
                hubOffsetSpheres: params.hubOffsetSpheres,
                hubPickMesh: vertices,
              } satisfies HubAnchorOptions
            }
            getTowardCamera={getTowardCamera}
            blobAnimTimeRef={blobAnimTimeRef}
          />
        </group>
      ) : null}
    </>
  );
}
