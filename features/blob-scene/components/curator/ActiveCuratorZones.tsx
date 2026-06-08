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
  useBlobLayoutMirrored,
} from "@/features/blob-scene/context/BlobScrollProgressContext";
import {
  type CuratorZoneAssignment,
  type HubAnchorOptions,
  zoneClockDegForLayout,
} from "@/features/blob-scene/lib/curators/zones";
import {
  orbitTargetsForZone,
  zonesLayoutEqual,
} from "@/features/blob-scene/lib/curators/zoneOverlay";
import { tickHubAnchorRotationLag } from "@/features/blob-scene/lib/geometry/hubAnchorRotationLag";
import { RENDER_PLEXUS_LINES } from "@/features/blob-scene/lib/rendering/renderOrder";

const HUB_LOGO_OUTSET_MUL = 1.5;

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

  const layoutMirrored = useBlobLayoutMirrored();
  const curatorOverlayEnabled = useBlobCuratorOverlayEnabled();
  const [zones, setZones] = useState<CuratorZoneAssignment[]>([]);
  const lagZoneNameRef = useRef<string | null>(null);

  const layoutZone =
    activeZone &&
    zones.find((z) => z.curator.name === activeZone.curator.name);

  useEffect(() => {
    if (!activeZone || !layoutZone) return;
    if (zonesLayoutEqual(activeZone, layoutZone)) return;
    setActiveZone({ ...layoutZone });
  }, [activeZone, layoutZone, setActiveZone]);

  const hubZoneDeg = activeZone
    ? zoneClockDegForLayout(activeZone.curator.name, layoutMirrored)
    : 90;

  const orbitTargets =
    activeZone
      ? orbitTargetsForZone(activeZone, new Set(activeZone.partners))
      : [];

  const activeLineGroups = activeZone
    ? [{ color: activeZone.curator.color, edges: activeZone.edges }]
    : [];

  const hubPickOptions = {
    frontMinDot: params.frontMinDot,
    blobCenterLean: params.blobCenterLean,
    zoneCenterOffsetRight: params.zoneCenterOffsetRight,
    layoutMirrored,
    hubOffsetSpheres: params.hubOffsetSpheres,
    hubLogoOutsetSpheres: params.hubLogoOutsetSpheres * HUB_LOGO_OUTSET_MUL,
    hubPickMesh: vertices,
  } satisfies HubAnchorOptions;

  const layoutTowardCamera = activeZone ? getHubLayoutAxis : getTowardCamera;

  useFrame(() => {
    const zoneName = activeZone?.curator.name ?? null;
    if (zoneName !== lagZoneNameRef.current) {
      lagZoneNameRef.current = zoneName;
      hubAnchorRotationLagRef.current.synced = false;
    }

    const lagEnabled = Boolean(curatorOverlayEnabled && activeZone);
    tickHubAnchorRotationLag(
      hubAnchorRotationLagRef.current,
      blobGroupRef.current?.rotation.y ?? 0,
      lagEnabled,
    );
  });

  return (
    <>
      <ZoneMemberInstances activeZone={activeZone} onZonesChange={setZones} />
      {curatorOverlayEnabled && activeZone ? (
        <CuratorHubBillboard
          key={`logo-${activeZone.curator.name}`}
          hubIndex={activeZone.hub}
          curatorName={activeZone.curator.name}
          hubZoneDeg={hubZoneDeg}
          vertices={vertices}
          params={params}
          hubPickOptions={hubPickOptions}
          getTowardCamera={layoutTowardCamera}
          blobAnimTimeRef={blobAnimTimeRef}
        />
      ) : null}
      {curatorOverlayEnabled && activeZone && orbitTargets.length > 0 && (
        <PartnerOrbitRings
          key={`orbit-${activeZone.curator.name}-${orbitTargets.map((t) => t.vertexIndex).join(",")}`}
          targets={orbitTargets}
          color={activeZone.curator.color}
          vertices={vertices}
          params={params}
          pointRadius={pointRadius}
          blobAnimTimeRef={blobAnimTimeRef}
        />
      )}
      {curatorOverlayEnabled && activeLineGroups.length > 0 && activeZone ? (
        <group renderOrder={RENDER_PLEXUS_LINES}>
          <CuratorPlexusLines
            key={`plexus-${activeZone.curator.name}-${activeZone.hub}-${activeZone.edges.map(([a, b]) => `${a}-${b}`).join(",")}`}
            groups={activeLineGroups}
            vertices={vertices}
            params={params}
            hubIndex={activeZone.hub}
            hubZoneDeg={hubZoneDeg}
            hubPickOptions={hubPickOptions}
            getTowardCamera={layoutTowardCamera}
            blobAnimTimeRef={blobAnimTimeRef}
          />
        </group>
      ) : null}
    </>
  );
}
