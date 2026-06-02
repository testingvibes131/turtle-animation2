"use client";

import { useEffect, useState } from "react";
import { CuratorPlexusLines } from "@/features/blob-scene/components/curator/CuratorPlexusLines";
import { CuratorHubBillboard } from "@/features/blob-scene/components/curator/CuratorHubBillboard";
import { PartnerOrbitRings } from "@/features/blob-scene/components/curator/PartnerOrbitRings";
import { ZoneMemberInstances } from "@/features/blob-scene/components/curator/ZoneMemberInstances";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import { useBlobHeroShowcaseActive } from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  curatorZoneClockDeg,
  type CuratorZoneAssignment,
  type HubAnchorOptions,
} from "@/features/blob-scene/lib/curators/zones";
import {
  orbitTargetsForZone,
  zonesLayoutEqual,
} from "@/features/blob-scene/lib/curators/zoneOverlay";
import {
  HERO_SHOWCASE_CLOCK_DEG,
  HERO_SHOWCASE_FRONT_MIN_DOT,
} from "@/features/blob-scene/lib/scroll/heroShowcase";
import { RENDER_PLEXUS_LINES } from "@/features/blob-scene/lib/rendering/renderOrder";

export function ActiveCuratorZones() {
  const {
    vertices,
    params,
    pointRadius,
    getTowardCamera,
    getHubLayoutAxis,
    blobAnimTimeRef,
    activeZone,
    setActiveZone,
  } = useBlobScene();

  const heroShowcaseActive = useBlobHeroShowcaseActive();
  const [zones, setZones] = useState<CuratorZoneAssignment[]>([]);

  const displayZone =
    activeZone &&
    zones.find((z) => z.curator.name === activeZone.curator.name);

  /** Keep hover snapshot aligned with live zone layout (hub/edges drift while rotating). */
  useEffect(() => {
    if (heroShowcaseActive) return;
    if (!activeZone || !displayZone) return;
    if (zonesLayoutEqual(activeZone, displayZone)) return;
    setActiveZone({ ...displayZone });
  }, [activeZone, displayZone, heroShowcaseActive, setActiveZone]);

  const zoneVisual = displayZone ?? activeZone;

  const hubZoneDeg =
    zoneVisual && heroShowcaseActive
      ? HERO_SHOWCASE_CLOCK_DEG
      : zoneVisual
        ? curatorZoneClockDeg(zoneVisual.curator.name)
        : 90;

  const orbitTargets = zoneVisual
    ? orbitTargetsForZone(zoneVisual, new Set(zoneVisual.partners))
    : [];

  const activeLineGroups = zoneVisual
    ? [{ color: zoneVisual.curator.color, edges: zoneVisual.edges }]
    : [];

  const showHeroOnly = heroShowcaseActive && activeZone != null;

  return (
    <>
      <ZoneMemberInstances
        activeZone={activeZone}
        connectedOnly={heroShowcaseActive}
        onZonesChange={setZones}
      />
      {showHeroOnly ? (
        <>
          <CuratorHubBillboard
            key={`hero-${activeZone.curator.name}`}
            hubIndex={activeZone.hub}
            curatorName={activeZone.curator.name}
            hubZoneDeg={HERO_SHOWCASE_CLOCK_DEG}
            vertices={vertices}
            params={params}
            getTowardCamera={getTowardCamera}
            blobAnimTimeRef={blobAnimTimeRef}
          />
          {activeZone.edges.length > 0 ? (
            <group renderOrder={RENDER_PLEXUS_LINES}>
              <CuratorPlexusLines
                key={`hero-plexus-${activeZone.curator.name}-${activeZone.hub}-${activeZone.edges.map(([a, b]) => `${a}-${b}`).join(",")}`}
                groups={[
                  { color: activeZone.curator.color, edges: activeZone.edges },
                ]}
                vertices={vertices}
                params={params}
                hubIndex={activeZone.hub}
                hubZoneDeg={HERO_SHOWCASE_CLOCK_DEG}
                hubPickOptions={
                  {
                    frontMinDot: HERO_SHOWCASE_FRONT_MIN_DOT,
                    blobCenterLean: params.blobCenterLean,
                    zoneCenterOffsetRight: params.zoneCenterOffsetRight,
                    hubOffsetSpheres: params.hubOffsetSpheres,
                    hubLogoOutsetSpheres: params.hubLogoOutsetSpheres,
                    hubPickMesh: vertices,
                    hubPickBlob: {
                      ...params,
                      time: blobAnimTimeRef.current,
                    },
                  } satisfies HubAnchorOptions
                }
                getTowardCamera={getTowardCamera}
                blobAnimTimeRef={blobAnimTimeRef}
              />
            </group>
          ) : null}
        </>
      ) : null}
      {!heroShowcaseActive && displayZone ? (
        <CuratorHubBillboard
          key={`logo-${displayZone.curator.name}`}
          hubIndex={displayZone.hub}
          curatorName={displayZone.curator.name}
          hubZoneDeg={hubZoneDeg}
          vertices={vertices}
          params={params}
          getTowardCamera={getHubLayoutAxis}
          blobAnimTimeRef={blobAnimTimeRef}
        />
      ) : null}
      {!heroShowcaseActive &&
        activeZone &&
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
      {!heroShowcaseActive && activeLineGroups.length > 0 && zoneVisual ? (
        <group renderOrder={RENDER_PLEXUS_LINES}>
          <CuratorPlexusLines
            key={`plexus-${zoneVisual.curator.name}-${zoneVisual.hub}-${zoneVisual.edges.map(([a, b]) => `${a}-${b}`).join(",")}`}
            groups={activeLineGroups}
            vertices={vertices}
            params={params}
            hubIndex={zoneVisual.hub}
            hubZoneDeg={hubZoneDeg}
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
