"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useBlobScene } from "@/features/blob-scene/context/BlobSceneContext";
import { useBlobCuratorOverlayEnabled } from "@/features/blob-scene/context/BlobScrollProgressContext";
import { CURATORS } from "@/features/blob-scene/lib/curators/catalog";
import {
  assignStableCuratorZones,
  type CuratorZoneAssignment,
  type StableZoneSlot,
} from "@/features/blob-scene/lib/curators/zones";
import {
  connectedMemberSet,
  zoneLayoutSignature,
  ZONE_MEMBER_SCALE,
  ZONE_PARTNER_SCALE,
} from "@/features/blob-scene/lib/curators/zoneOverlay";
import { HERO_SHOWCASE_CONNECTED_MARKER_SCALE_MUL } from "@/features/blob-scene/lib/scroll/heroShowcase";
import {
  attachBlobPointFade,
  ensureInstanceOpacityBuffer,
  setInstanceOpacityAt,
} from "@/features/blob-scene/lib/rendering/blobPointFade";
import { updateMarkerDepthFadeUniforms } from "@/features/blob-scene/lib/rendering/markerDepthFade";
import { noiseSlopeOpacityMul } from "@/features/blob-scene/lib/geometry/noiseSlopeOpacity";
import { RENDER_PARTNER_SPHERE } from "@/features/blob-scene/lib/rendering/renderOrder";
import { createConnectedMarkerLayout } from "@/features/blob-scene/lib/geometry/connectedMarkerLayout";
import { computeZoneMarkerLayout } from "@/features/blob-scene/lib/geometry/zoneMarkerTransform";
import type { PerlinBlobParams } from "@/features/blob-scene/lib/geometry/perlinBlob";

const SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const _dummy = new THREE.Object3D();
const ZONE_CAP_GRAY = 0x2c2d2b;
const ZONE_INNER_TINT_OPACITY = 0.1;

type ZoneMemberInstancesProps = {
  activeZone: CuratorZoneAssignment | null;
  /** Hero demo: only draw spokes’ endpoint dots (no full-zone gray wash). */
  connectedOnly?: boolean;
  onZonesChange: (zones: CuratorZoneAssignment[]) => void;
};

export function ZoneMemberInstances({
  activeZone,
  connectedOnly = false,
  onZonesChange,
}: ZoneMemberInstancesProps) {
  const {
    vertices,
    params,
    pointRadius,
    liveVertices,
    getTowardCamera,
    getHubLayoutAxis,
    zoneUsedRef,
    zonesSnapshotRef,
    blobAnimTimeRef,
    depthFadeUniforms,
    connectedMarkerLayoutsRef,
    getBlobParamsAtTime,
  } = useBlobScene();
  const curatorOverlayEnabled = useBlobCuratorOverlayEnabled();
  const curatorOverlayEnabledRef = useRef(curatorOverlayEnabled);
  curatorOverlayEnabledRef.current = curatorOverlayEnabled;

  const meshRefs = useRef<Map<string, THREE.InstancedMesh>>(new Map());
  const capGrayMeshRef = useRef<THREE.InstancedMesh>(null);
  const zoneInnerDimMeshRef = useRef<THREE.InstancedMesh>(null);
  const slotCacheRef = useRef<Map<string, StableZoneSlot>>(new Map());
  const vertexCountRef = useRef(vertices.count);
  const layoutParamsRef = useRef("");
  const zonesSigRef = useRef("");
  const activeZoneRef = useRef(activeZone);
  activeZoneRef.current = activeZone;
  const connectedOnlyRef = useRef(connectedOnly);
  connectedOnlyRef.current = connectedOnly;
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
    connectedMarkerLayoutsRef.current.clear();

    if (!curatorOverlayEnabledRef.current) {
      zoneUsedRef.current = new Set();
      zonesSnapshotRef.current = [];
      if (zonesSigRef.current !== "") {
        zonesSigRef.current = "";
        onZonesChange([]);
      }

      const capGrayMesh = capGrayMeshRef.current;
      const zoneInnerDimMesh = zoneInnerDimMeshRef.current;
      if (capGrayMesh) capGrayMesh.count = 0;
      if (zoneInnerDimMesh) zoneInnerDimMesh.count = 0;
      for (const c of CURATORS) {
        const mesh = meshRefs.current.get(c.name);
        if (mesh) mesh.count = 0;
      }
      return;
    }

    if (vertexCountRef.current !== vertices.count) {
      slotCacheRef.current.clear();
      vertexCountRef.current = vertices.count;
    }

    const layoutKey = `v18-zonehub:${params.frontMinDot}:${params.clusterMaxAngleDeg}:${params.blobCenterLean}:${params.hubConnectionMul}:${params.zoneCenterOffsetRight}:${params.hubOffsetSpheres}`;
    if (layoutParamsRef.current !== layoutKey) {
      layoutParamsRef.current = layoutKey;
      slotCacheRef.current.clear();
    }

    const toward = activeZoneRef.current
      ? getHubLayoutAxis()
      : getTowardCamera();
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
        hubPickBlob: getBlobParamsAtTime(blobAnimTimeRef.current),
      },
      slotCacheRef.current,
    );

    const used = new Set<number>();
    if (connectedOnlyRef.current && activeZoneRef.current) {
      for (const vi of connectedMemberSet(activeZoneRef.current)) {
        used.add(vi);
      }
    } else {
      for (const z of nextZones) {
        for (const m of z.members) used.add(m);
      }
    }
    zoneUsedRef.current = used;
    zonesSnapshotRef.current = nextZones;

    const sig = nextZones
      .map((z) => `${z.curator.name}:${zoneLayoutSignature(z)}`)
      .join("|");
    if (sig !== zonesSigRef.current) {
      zonesSigRef.current = sig;
      onZonesChange(nextZones);
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

    const blobParams: PerlinBlobParams = getBlobParamsAtTime(
      blobAnimTimeRef.current,
    );

    const maxDisp =
      (params.noiseScale * 1.2) / Math.max(params.displacementDivisor, 0.001);
    const extent = params.radius + maxDisp;
    const camDist = state.camera.position.length();
    const overlayActive = Boolean(activeZoneRef.current);
    updateMarkerDepthFadeUniforms(
      depthFadeUniforms,
      state.camera,
      {
        near: camDist - extent * 0.55,
        far: camDist + extent * 0.75,
        closeNear: 0,
        closeFar: 0,
      },
      overlayActive ? 1 : params.depthFadeMinOpacity,
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
      publishForOrbitRing = false,
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
      _dummy.quaternion.identity();
      _dummy.scale.setScalar(layout.sphereScale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(slot, _dummy.matrix);
      if (publishForOrbitRing) {
        let published = connectedMarkerLayoutsRef.current.get(vertexIndex);
        if (!published) {
          published = createConnectedMarkerLayout();
          connectedMarkerLayoutsRef.current.set(vertexIndex, published);
        }
        published.localPosition.copy(layout.localPosition);
        published.worldPosition.copy(layout.worldPosition);
        published.sphereScale = layout.sphereScale;
      }
      if (mesh.geometry.getAttribute("instanceOpacity")) {
        setInstanceOpacityAt(mesh, slot, opacityMul);
      }
    };

    const heroConnectedOnly = connectedOnlyRef.current;

    for (const zone of nextZones) {
      const fullMesh = meshRefs.current.get(zone.curator.name);
      if (!fullMesh || !capGrayMesh) continue;
      const needsInnerDim = Boolean(
        activeName && zoneInnerDimMesh && !heroConnectedOnly,
      );

      const partners = new Set(zone.partners);
      const isSelected = activeName === zone.curator.name;
      if (heroConnectedOnly && !isSelected) continue;

      const hovered = activeZoneRef.current;
      const connected =
        isSelected && hovered?.curator.name === zone.curator.name
          ? connectedMemberSet(hovered)
          : connectedMemberSet(zone);
      const displayHub =
        isSelected && hovered?.hub != null && hovered.hub >= 0
          ? hovered.hub
          : zone.hub;
      let fullSlot = 0;

      for (const vi of zone.members) {
        if (vi === displayHub) continue;
        if (heroConnectedOnly && isSelected && !connected.has(vi)) continue;
        if (isSelected && connected.has(vi)) {
          const baseScale = partners.has(vi)
            ? ZONE_PARTNER_SCALE
            : ZONE_MEMBER_SCALE;
          const scaleMul = heroConnectedOnly
            ? baseScale * HERO_SHOWCASE_CONNECTED_MARKER_SCALE_MUL
            : baseScale;
          write(fullMesh, fullSlot, vi, scaleMul, 1, true);
          fullSlot++;
        } else if (isSelected && needsInnerDim && activeCurator) {
          const op = noiseOpacity(vi);
          write(capGrayMesh, graySlot, vi, ZONE_MEMBER_SCALE, op);
          graySlot++;
          write(zoneInnerDimMesh!, innerDimSlot, vi, ZONE_MEMBER_SCALE, op);
          innerDimSlot++;
        } else {
          write(capGrayMesh, graySlot, vi, ZONE_MEMBER_SCALE, noiseOpacity(vi));
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
        <instancedMesh
          key={c.name}
          ref={(m) => setMeshRef(c.name, m)}
          args={[SPHERE_GEO, highlightMaterials.get(c.name)!, maxInstances]}
          frustumCulled={false}
          renderOrder={RENDER_PARTNER_SPHERE + 2}
        />
      ))}
    </>
  );
}
