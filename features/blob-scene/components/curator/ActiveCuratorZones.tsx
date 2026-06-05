"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { CuratorPlexusLines } from "@/features/blob-scene/components/curator/CuratorPlexusLines";
import { CuratorHubBillboard } from "@/features/blob-scene/components/curator/CuratorHubBillboard";
import { PartnerOrbitRings } from "@/features/blob-scene/components/curator/PartnerOrbitRings";
import { ZoneMemberInstances } from "@/features/blob-scene/components/curator/ZoneMemberInstances";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import {
  useBlobCuratorOverlayEnabled,
  useBlobHeroShowcaseActive,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
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
  HERO_SHOWCASE_LOGO_OUTSET_MUL,
  HERO_SHOWCASE_CONNECTED_MARKER_SCALE_MUL,
  SECTION_2_LOGO_OUTSET_MUL,
} from "@/features/blob-scene/lib/scroll/heroShowcase";
import { tickHubAnchorRotationLag } from "@/features/blob-scene/lib/geometry/hubAnchorRotationLag";
import { RENDER_PLEXUS_LINES } from "@/features/blob-scene/lib/rendering/renderOrder";

export function ActiveCuratorZones() {
  const {
    vertices,
    params,
    pointRadius,
    blobGroupRef,
    getTowardCamera,
    getHubLayoutAxis,
    blobAnimTimeRef,
    hubAnchorRotationLagRef,
    activeZone,
    setActiveZone,
  } = useBlobScene();

  const heroShowcaseActive = useBlobHeroShowcaseActive();
  const curatorOverlayEnabled = useBlobCuratorOverlayEnabled();
  const [zones, setZones] = useState<CuratorZoneAssignment[]>([]);
  const lagZoneNameRef = useRef<string | null>(null);

  const layoutZone =
    activeZone &&
    zones.find((z) => z.curator.name === activeZone.curator.name);

  /** Live zone mesh for drift sync; hero/hover snapshot stays on `activeZone`. */
  const zoneVisual = activeZone ?? layoutZone;

  /** Keep hover snapshot aligned with live zone layout (hub/edges drift while rotating). */
  useEffect(() => {
    if (heroShowcaseActive) return;
    if (!activeZone || !layoutZone) return;
    if (zonesLayoutEqual(activeZone, layoutZone)) return;
    setActiveZone({ ...layoutZone });
  }, [activeZone, layoutZone, heroShowcaseActive, setActiveZone]);

  const hubZoneDeg =
    zoneVisual && heroShowcaseActive
      ? HERO_SHOWCASE_CLOCK_DEG
      : zoneVisual
        ? curatorZoneClockDeg(zoneVisual.curator.name)
        : 90;

  const orbitTargets = zoneVisual
    ? orbitTargetsForZone(
        zoneVisual,
        heroShowcaseActive ? new Set<number>() : new Set(zoneVisual.partners),
      ).map((target) =>
        heroShowcaseActive
          ? {
              ...target,
              scaleMul:
                target.scaleMul * HERO_SHOWCASE_CONNECTED_MARKER_SCALE_MUL,
            }
          : target,
      )
    : [];

  const activeLineGroups = zoneVisual
    ? [{ color: zoneVisual.curator.color, edges: zoneVisual.edges }]
    : [];

  const hubPickOptions = {
    frontMinDot: heroShowcaseActive
      ? HERO_SHOWCASE_FRONT_MIN_DOT
      : params.frontMinDot,
    blobCenterLean: params.blobCenterLean,
    zoneCenterOffsetRight: params.zoneCenterOffsetRight,
    hubOffsetSpheres: params.hubOffsetSpheres,
    hubLogoOutsetSpheres: heroShowcaseActive
      ? params.hubLogoOutsetSpheres * HERO_SHOWCASE_LOGO_OUTSET_MUL
      : params.hubLogoOutsetSpheres * SECTION_2_LOGO_OUTSET_MUL,
    hubPickMesh: vertices,
  } satisfies HubAnchorOptions;

  const layoutTowardCamera = getHubLayoutAxis;

  useFrame(() => {
    const zoneName = zoneVisual?.curator.name ?? null;
    if (zoneName !== lagZoneNameRef.current) {
      lagZoneNameRef.current = zoneName;
      hubAnchorRotationLagRef.current.synced = false;
    }

    const lagEnabled = Boolean(
      curatorOverlayEnabled && zoneVisual && !heroShowcaseActive,
    );
    tickHubAnchorRotationLag(
      hubAnchorRotationLagRef.current,
      blobGroupRef.current?.rotation.y ?? 0,
      lagEnabled,
    );
  });

  return (
    <>
      <ZoneMemberInstances
        activeZone={activeZone}
        connectedOnly={heroShowcaseActive}
        onZonesChange={setZones}
      />
      {curatorOverlayEnabled && zoneVisual ? (
        <CuratorHubBillboard
          key={`logo-${zoneVisual.curator.name}`}
          hubIndex={zoneVisual.hub}
          curatorName={zoneVisual.curator.name}
          hubZoneDeg={hubZoneDeg}
          vertices={vertices}
          params={params}
          hubPickOptions={hubPickOptions}
          getTowardCamera={layoutTowardCamera}
          blobAnimTimeRef={blobAnimTimeRef}
        />
      ) : null}
      {curatorOverlayEnabled && zoneVisual && orbitTargets.length > 0 && (
          <PartnerOrbitRings
            key={`orbit-${zoneVisual.curator.name}-${orbitTargets.map((t) => t.vertexIndex).join(",")}`}
            targets={orbitTargets}
            color={zoneVisual.curator.color}
            vertices={vertices}
            params={params}
            pointRadius={pointRadius}
            blobAnimTimeRef={blobAnimTimeRef}
          />
        )}
      {curatorOverlayEnabled && activeLineGroups.length > 0 && zoneVisual ? (
        <group renderOrder={RENDER_PLEXUS_LINES}>
          <CuratorPlexusLines
            key={`plexus-${zoneVisual.curator.name}-${zoneVisual.hub}-${zoneVisual.edges.map(([a, b]) => `${a}-${b}`).join(",")}`}
            groups={activeLineGroups}
            vertices={vertices}
            params={params}
            hubIndex={zoneVisual.hub}
            hubZoneDeg={hubZoneDeg}
            hubPickOptions={hubPickOptions}
            getTowardCamera={layoutTowardCamera}
            blobAnimTimeRef={blobAnimTimeRef}
            lockDashDistances={heroShowcaseActive}
          />
        </group>
      ) : null}
    </>
  );
}
