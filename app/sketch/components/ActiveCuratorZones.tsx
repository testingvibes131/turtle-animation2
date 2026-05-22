"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CuratorPlexusLines } from "@/app/sketch/components/CuratorPlexusLines";
import { CuratorHubBillboard } from "@/app/sketch/components/CuratorHubBillboard";
import {
  PartnerOrbitRings,
  type OrbitRingTarget,
} from "@/app/sketch/components/PartnerOrbitRings";
import { CURATORS } from "@/app/sketch/lib/curatorCatalog";
import {
  assignStableCuratorZones,
  curatorZoneClockDeg,
  type CuratorZoneAssignment,
  type StableZoneSlot,
  type HubAnchorOptions,
} from "@/app/sketch/lib/curatorZones";
import type { PerlinBlobVisualParams } from "@/app/sketch/hooks/useNoiseSphereControls";
import {
  type IcosahedronVertexData,
  type PerlinBlobParams,
} from "@/app/sketch/lib/perlinBlob";
import {
  attachBlobPointFade,
  ensureInstanceOpacityBuffer,
  setInstanceOpacityAt,
} from "@/app/sketch/lib/blobPointFade";
import { noiseSlopeOpacityMul } from "@/app/sketch/lib/noiseSlopeOpacity";
import { RENDER_PARTNER_SPHERE, RENDER_PLEXUS_LINES } from "@/app/sketch/lib/sketchRenderOrder";
import { computeZoneMarkerLayout } from "@/app/sketch/lib/zoneMarkerTransform";
import {
  updateMarkerDepthFadeUniforms,
  type MarkerDepthFadeUniforms,
} from "@/app/v2/lib/markerDepthFade";

const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const _dummy = new THREE.Object3D();

const ZONE_MEMBER_SCALE_MUL = 1.25;
const ZONE_PARTNER_SCALE_MUL = 1.4 * 1.15;
/** Flat cap overlay (matches blob points). */
const ZONE_CAP_GRAY = 0x2c2d2b;
/** Faint zone-color wash on gray base (in-zone unconnected while hovered). */
const ZONE_INNER_TINT_OPACITY = 0.1;

function connectedMemberSet(zone: CuratorZoneAssignment): Set<number> {
  const set = new Set<number>([zone.hub]);
  for (const [, target] of zone.edges) set.add(target);
  return set;
}

function orbitTargetsForZone(
  zone: CuratorZoneAssignment,
  partners: ReadonlySet<number>,
): OrbitRingTarget[] {
  const targets: OrbitRingTarget[] = [];
  for (const vi of connectedMemberSet(zone)) {
    if (vi === zone.hub) continue;
    targets.push({
      vertexIndex: vi,
      scaleMul: partners.has(vi)
        ? ZONE_PARTNER_SCALE_MUL
        : ZONE_MEMBER_SCALE_MUL,
    });
  }
  return targets;
}

type ActiveCuratorZonesProps = {
  vertices: IcosahedronVertexData;
  params: PerlinBlobVisualParams;
  pointRadius: number;
  liveVertices: ReadonlySet<number>;
  getTowardCamera: () => THREE.Vector3;
  zoneUsedRef: React.MutableRefObject<Set<number>>;
  zonesSnapshotRef: React.MutableRefObject<CuratorZoneAssignment[]>;
  activeZone: CuratorZoneAssignment | null;
  blobAnimTimeRef: React.MutableRefObject<number>;
  depthFadeUniforms: MarkerDepthFadeUniforms;
};

export function ActiveCuratorZones({
  vertices,
  params,
  pointRadius,
  liveVertices,
  getTowardCamera,
  zoneUsedRef,
  zonesSnapshotRef,
  activeZone,
  blobAnimTimeRef,
  depthFadeUniforms,
}: ActiveCuratorZonesProps) {
  const meshRefs = useRef<Map<string, THREE.InstancedMesh>>(new Map());
  const capGrayMeshRef = useRef<THREE.InstancedMesh>(null);
  const zoneInnerDimMeshRef = useRef<THREE.InstancedMesh>(null);
  const slotCacheRef = useRef<Map<string, StableZoneSlot>>(new Map());
  const vertexCountRef = useRef(vertices.count);
  const layoutParamsRef = useRef("");
  const [zones, setZones] = useState<CuratorZoneAssignment[]>([]);
  const zonesSigRef = useRef("");
  const activeZoneRef = useRef(activeZone);
  activeZoneRef.current = activeZone;

  const maxInstances = vertices.count;

  const { capGrayMaterial, zoneInnerDimMaterial, highlightMaterials } =
    useMemo(() => {
    const capGray = new THREE.MeshBasicMaterial({
      color: ZONE_CAP_GRAY,
      toneMapped: false,
    });
    attachBlobPointFade(capGray, depthFadeUniforms);
    const zoneInnerDim = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      toneMapped: false,
      transparent: true,
      opacity: ZONE_INNER_TINT_OPACITY,
    });
    attachBlobPointFade(zoneInnerDim, depthFadeUniforms);
    const highlight = new Map<string, THREE.MeshBasicMaterial>();
    for (const c of CURATORS) {
      highlight.set(
        c.name,
        new THREE.MeshBasicMaterial({
          color: c.color,
          toneMapped: false,
          transparent: true,
          opacity: 1,
          depthWrite: false,
          depthTest: true,
        }),
      );
    }
    return {
      capGrayMaterial: capGray,
      zoneInnerDimMaterial: zoneInnerDim,
      highlightMaterials: highlight,
    };
  }, [depthFadeUniforms]);

  useEffect(() => {
    return () => {
      capGrayMaterial.dispose();
      zoneInnerDimMaterial.dispose();
      for (const m of highlightMaterials.values()) m.dispose();
    };
  }, [capGrayMaterial, zoneInnerDimMaterial, highlightMaterials]);

  const setMeshRef = (key: string, mesh: THREE.InstancedMesh | null) => {
    if (mesh) meshRefs.current.set(key, mesh);
    else meshRefs.current.delete(key);
  };

  useFrame((state) => {
    if (vertexCountRef.current !== vertices.count) {
      slotCacheRef.current.clear();
      vertexCountRef.current = vertices.count;
    }

    const layoutKey = `v18-zonehub:${params.frontMinDot}:${params.clusterMaxAngleDeg}:${params.blobCenterLean}:${params.hubConnectionMul}:${params.zoneCenterOffsetRight}:${params.hubOffsetSpheres}`;
    if (layoutParamsRef.current !== layoutKey) {
      layoutParamsRef.current = layoutKey;
      slotCacheRef.current.clear();
    }

    const toward = getTowardCamera();
    const nextZones = assignStableCuratorZones(
      vertices.positions,
      vertices.count,
      CURATORS,
      toward,
      {
        frontMinDot: params.frontMinDot,
        liveVertices,
        maxAngleFromHubDeg: params.clusterMaxAngleDeg,
        blobCenterLean: params.blobCenterLean,
        hubConnectionMul: params.hubConnectionMul,
        zoneCenterOffsetRight: params.zoneCenterOffsetRight,
        hubOffsetSpheres: params.hubOffsetSpheres,
        hubPickMesh: vertices,
        hubPickBlob: {
          ...params,
          time: blobAnimTimeRef.current,
        },
      },
      slotCacheRef.current,
    );

    const used = new Set<number>();
    for (const z of nextZones) {
      for (const m of z.members) used.add(m);
    }
    zoneUsedRef.current = used;
    zonesSnapshotRef.current = nextZones;

    const sig = nextZones
      .map(
        (z) =>
          `${z.curator.name}:${z.hub}:${z.partners.join(",")}:${z.members.length}`,
      )
      .join("|");
    if (sig !== zonesSigRef.current) {
      zonesSigRef.current = sig;
      setZones(nextZones);
    }

    const activeName = activeZone?.curator.name ?? null;
    const activeCurator = activeName
      ? CURATORS.find((c) => c.name === activeName)
      : undefined;
    if (activeCurator) {
      zoneInnerDimMaterial.color.setHex(activeCurator.color);
      zoneInnerDimMaterial.opacity = ZONE_INNER_TINT_OPACITY;
    }
    for (const c of CURATORS) {
      const mat = highlightMaterials.get(c.name);
      if (mat) mat.opacity = activeName === c.name ? 1 : 0;
    }

    const blobParams: PerlinBlobParams = {
      ...params,
      time: blobAnimTimeRef.current,
    };

    const maxDisp =
      (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
    const extent = params.radius + maxDisp;
    const camDist = state.camera.position.length();
    updateMarkerDepthFadeUniforms(
      depthFadeUniforms,
      state.camera,
      {
        near: camDist - extent * 0.55,
        far: camDist + extent * 0.75,
        closeNear: 0,
        closeFar: 0,
      },
      params.depthFadeMinOpacity,
    );

    const capGrayMesh = capGrayMeshRef.current;
    const zoneInnerDimMesh = zoneInnerDimMeshRef.current;
    let graySlot = 0;
    let innerDimSlot = 0;
    if (capGrayMesh) {
      capGrayMesh.count = 0;
      ensureInstanceOpacityBuffer(capGrayMesh, maxInstances);
    }
    if (zoneInnerDimMesh) {
      zoneInnerDimMesh.count = 0;
      if (activeName) ensureInstanceOpacityBuffer(zoneInnerDimMesh, maxInstances);
    }

    for (const c of CURATORS) {
      const fullMesh = meshRefs.current.get(c.name);
      if (fullMesh) fullMesh.count = 0;
    }

    const noiseOpacity = (vertexIndex: number) =>
      noiseSlopeOpacityMul(
        vertices,
        vertexIndex,
        blobParams,
        params.noiseSlopeMinOpacity,
        params.noiseSlopeMaxOpacity,
      );

    const write = (
      mesh: THREE.InstancedMesh,
      slot: number,
      vertexIndex: number,
      scaleMul: number,
      opacityMul = 1,
    ) => {
      const layout = computeZoneMarkerLayout(
        vertices,
        vertexIndex,
        blobParams,
        pointRadius,
        scaleMul,
        state.camera,
        mesh.parent,
        extent,
        params.depthSizeNearOffset,
        params.depthSizeFarOffset,
        params.depthSizeMinMul,
        params.depthSizeMaxMul,
      );
      _dummy.position.copy(layout.localPosition);
      _dummy.scale.setScalar(layout.sphereScale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(slot, _dummy.matrix);
      if (mesh.geometry.getAttribute("instanceOpacity")) {
        setInstanceOpacityAt(mesh, slot, opacityMul);
      }
    };

    for (const zone of nextZones) {
      const fullMesh = meshRefs.current.get(zone.curator.name);
      if (!fullMesh || !capGrayMesh) continue;
      const needsInnerDim = Boolean(activeName && zoneInnerDimMesh);

      const partners = new Set(zone.partners);
      const isSelected = activeName === zone.curator.name;
      const hovered = activeZoneRef.current;
      const connected =
        isSelected && hovered?.curator.name === zone.curator.name
          ? connectedMemberSet(hovered)
          : connectedMemberSet(zone);
      let fullSlot = 0;

      for (const vi of zone.members) {
        if (vi === zone.hub) continue;
        if (isSelected && connected.has(vi)) {
          const scaleMul = partners.has(vi)
            ? ZONE_PARTNER_SCALE_MUL
            : ZONE_MEMBER_SCALE_MUL;
          write(fullMesh, fullSlot, vi, scaleMul, 1);
          fullSlot++;
        } else if (isSelected && needsInnerDim && activeCurator) {
          const op = noiseOpacity(vi);
          write(capGrayMesh, graySlot, vi, ZONE_MEMBER_SCALE_MUL, op);
          graySlot++;
          write(zoneInnerDimMesh!, innerDimSlot, vi, ZONE_MEMBER_SCALE_MUL, op);
          innerDimSlot++;
        } else {
          write(capGrayMesh, graySlot, vi, ZONE_MEMBER_SCALE_MUL, noiseOpacity(vi));
          graySlot++;
        }
      }

      fullMesh.count = fullSlot;
      fullMesh.instanceMatrix.needsUpdate = true;
    }

    if (capGrayMesh) {
      capGrayMesh.count = graySlot;
      capGrayMesh.instanceMatrix.needsUpdate = true;
    }
    if (zoneInnerDimMesh) {
      zoneInnerDimMesh.count = innerDimSlot;
      zoneInnerDimMesh.instanceMatrix.needsUpdate = true;
    }
  });

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
      <instancedMesh
        ref={capGrayMeshRef}
        args={[SPHERE_GEO, capGrayMaterial, maxInstances]}
        frustumCulled={false}
        renderOrder={RENDER_PARTNER_SPHERE}
      />
      <instancedMesh
        ref={zoneInnerDimMeshRef}
        args={[SPHERE_GEO, zoneInnerDimMaterial, maxInstances]}
        frustumCulled={false}
        renderOrder={RENDER_PARTNER_SPHERE + 1}
      />
      {CURATORS.map((c) => (
        <group key={c.name}>
          <instancedMesh
            ref={(m) => setMeshRef(c.name, m)}
            args={[SPHERE_GEO, highlightMaterials.get(c.name)!, maxInstances]}
            frustumCulled={false}
            renderOrder={RENDER_PARTNER_SPHERE + 2}
          />
          {displayZone?.curator.name === c.name &&
          activeZone &&
          orbitTargets.length > 0 ? (
            <PartnerOrbitRings
              key={`orbit-${activeZone.curator.name}-${orbitTargets.map((t) => t.vertexIndex).join(",")}`}
              targets={orbitTargets}
              color={displayZone.curator.color}
              vertices={vertices}
              params={params}
              pointRadius={pointRadius}
              blobAnimTimeRef={blobAnimTimeRef}
            />
          ) : null}
        </group>
      ))}
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
