"use client";

import { useEffect, useState } from "react";
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
import {
  orbitTargetsForZone,
  zonesLayoutEqual,
} from "@/features/blob-scene/lib/curators/zoneOverlay";
import { RENDER_PLEXUS_LINES } from "@/features/blob-scene/lib/rendering/renderOrder";

export function ActiveCuratorZones() {
  const {
    vertices,
    params,
    pointRadius,
    getHubLayoutAxis,
    blobAnimTimeRef,
    activeZone,
    setActiveZone,
  } = useBlobScene();

  const [zones, setZones] = useState<CuratorZoneAssignment[]>([]);

  const displayZone =
    activeZone &&
    zones.find((z) => z.curator.name === activeZone.curator.name);

  /** Keep hover snapshot aligned with live zone layout (hub/edges drift while rotating). */
  useEffect(() => {
    if (!activeZone || !displayZone) return;
    if (zonesLayoutEqual(activeZone, displayZone)) return;
    setActiveZone({ ...displayZone });
  }, [activeZone, displayZone, setActiveZone]);

  const zoneVisual = displayZone ?? activeZone;

  const orbitTargets = zoneVisual
    ? orbitTargetsForZone(zoneVisual, new Set(zoneVisual.partners))
    : [];

  const activeLineGroups = zoneVisual
    ? [{ color: zoneVisual.curator.color, edges: zoneVisual.edges }]
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
          getTowardCamera={getHubLayoutAxis}
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
      {activeLineGroups.length > 0 && zoneVisual ? (
        <group renderOrder={RENDER_PLEXUS_LINES}>
          <CuratorPlexusLines
            key={`plexus-${zoneVisual.curator.name}-${zoneVisual.hub}-${zoneVisual.edges.map(([a, b]) => `${a}-${b}`).join(",")}`}
            groups={activeLineGroups}
            vertices={vertices}
            params={params}
            hubIndex={zoneVisual.hub}
            hubZoneDeg={curatorZoneClockDeg(zoneVisual.curator.name)}
            hubPickOptions={
              {
                frontMinDot: params.frontMinDot,
                blobCenterLean: params.blobCenterLean,
                zoneCenterOffsetRight: params.zoneCenterOffsetRight,
                hubOffsetSpheres: params.hubOffsetSpheres,
                hubLogoOutsetSpheres: params.hubLogoOutsetSpheres,
                hubPickMesh: vertices,
              } satisfies HubAnchorOptions
            }
            getTowardCamera={getHubLayoutAxis}
            blobAnimTimeRef={blobAnimTimeRef}
          />
        </group>
      ) : null}
    </>
  );
}
